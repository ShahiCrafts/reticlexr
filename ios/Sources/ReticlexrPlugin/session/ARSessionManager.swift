import ARKit
import Foundation
import simd

/// ARSessionManager
///
/// Owns the ARKit side of a session, mirroring Android's
/// `ARSessionManager.java` + `ARSurfaceManager.java`:
/// - Availability (`ARWorldTrackingConfiguration.isSupported`)
/// - Session configuration (plane detection, light estimation)
/// - `ARSessionDelegate` callbacks: plane anchors become the
///   facade's surface events; camera tracking state becomes
///   `trackingChanged`; session failures become `error` events.
///
/// It does NOT own the `ARSession` itself — on iOS the session is
/// owned by RealityKit's `ARView` (see ARViewManager), which sets
/// this object as the session's delegate.
public final class ARSessionManager: NSObject, ARSessionDelegate {

    /// Set by the plugin at load time.
    public var eventEmitter: AREventEmitter?

    /// Currently tracked plane anchors: anchor id -> "horizontal" | "vertical".
    private var planes: [UUID: String] = [:]

    /// Last tracking state string emitted (events fire on change only,
    /// like Android's ARRenderer.updateTrackingState).
    private var lastTrackingState: String?

    /// Counter for hit-test anchors, Android `ARAnchorManager` style
    /// ("anchor_N" ids).
    private var hitAnchorCounter = 0

    // MARK: - Support

    /// Whether ARKit world tracking can run on this device.
    public static func isSupported() -> Bool {
        return ARWorldTrackingConfiguration.isSupported
    }

    /// The `checkSupport` result for a known support value. Split
    /// out from `isSupported()` so the result shaping is unit
    /// testable without a device.
    ///
    /// Like Android's NAT-12, an unsupported device RESOLVES with
    /// `{supported: false, reason, code}` — it never throws.
    public static func supportResult(isSupported: Bool) -> (supported: Bool, reason: String, code: String?) {
        if isSupported {
            return (true, "ARKit supported", nil)
        }
        return (
            false,
            "This device does not support ARKit world tracking",
            "UNSUPPORTED_DEVICE_NOT_CAPABLE"
        )
    }

    public static func supportResult() -> (supported: Bool, reason: String, code: String?) {
        return supportResult(isSupported: isSupported())
    }

    // MARK: - Configuration

    /// Build the world-tracking configuration for a session.
    ///
    /// - planeDetection: horizontal + vertical planes when on
    ///   (ARKit has no separate per-axis facade option).
    /// - lightEstimation: ARKit performs light estimation as part of
    ///   world tracking; the closest explicit switch is environment
    ///   texturing, which feeds RealityKit's image-based lighting.
    ///   Enabled when light estimation is requested.
    public func makeConfiguration(planeDetection: Bool, lightEstimation: Bool) -> ARWorldTrackingConfiguration {
        let configuration = ARWorldTrackingConfiguration()
        configuration.planeDetection = planeDetection ? [.horizontal, .vertical] : []
        if lightEstimation {
            configuration.environmentTexturing = .automatic
        }
        return configuration
    }

    // MARK: - Hit anchors

    /// Register a hit-test anchor with the session and return its
    /// "anchor_N" id — the iOS mirror of Android's NAT-04 behaviour,
    /// where a successful hit test creates a real anchor and returns
    /// its registered id.
    public func registerHitAnchor(transform: simd_float4x4, in session: ARSession) -> String {
        hitAnchorCounter += 1
        let anchorId = "anchor_\(hitAnchorCounter)"
        session.add(anchor: ARAnchor(name: anchorId, transform: transform))
        return anchorId
    }

    /// Reset per-session state (called on stopSession).
    public func reset() {
        planes.removeAll()
        lastTrackingState = nil
    }

    public var planeCount: Int {
        return planes.count
    }

    // MARK: - ARSessionDelegate

    public func session(_ session: ARSession, didAdd anchors: [ARAnchor]) {
        for anchor in anchors {
            guard let plane = anchor as? ARPlaneAnchor else { continue }
            let planeType = plane.alignment == .horizontal ? "horizontal" : "vertical"
            let isNew = planes[plane.identifier] == nil
            planes[plane.identifier] = planeType
            if isNew {
                eventEmitter?.surfaceDetected(planeType: planeType)
            }
            eventEmitter?.surfaceUpdated(planeType: planeType, planeCount: planes.count)
        }
    }

    public func session(_ session: ARSession, didUpdate anchors: [ARAnchor]) {
        for anchor in anchors {
            guard let plane = anchor as? ARPlaneAnchor else { continue }
            let planeType = plane.alignment == .horizontal ? "horizontal" : "vertical"
            planes[plane.identifier] = planeType
            eventEmitter?.surfaceUpdated(planeType: planeType, planeCount: planes.count)
        }
    }

    public func session(_ session: ARSession, didRemove anchors: [ARAnchor]) {
        var removedType: String?
        for anchor in anchors {
            guard anchor is ARPlaneAnchor else { continue }
            removedType = planes.removeValue(forKey: anchor.identifier) ?? removedType
        }
        guard let planeType = removedType else { return }
        if planes.isEmpty {
            eventEmitter?.surfaceLost()
        } else {
            eventEmitter?.surfaceUpdated(planeType: planeType, planeCount: planes.count)
        }
    }

    public func session(_ session: ARSession, cameraDidChangeTrackingState camera: ARCamera) {
        let state: String
        switch camera.trackingState {
        case .normal:
            state = "TRACKING"
        case .limited:
            // ARKit is tracking, but with limited accuracy/features —
            // the closest ARCore equivalent is PAUSED (not fully
            // tracking). The specific reason is not part of the
            // facade payload, matching Android's {state} shape.
            state = "PAUSED"
        case .notAvailable:
            state = "STOPPED"
        }
        guard state != lastTrackingState else { return }
        lastTrackingState = state
        eventEmitter?.trackingChanged(state: state)
    }

    public func session(_ session: ARSession, didFailWithError error: Error) {
        eventEmitter?.error(
            code: "SESSION_FAILED",
            message: "ARKit session failed: \(error.localizedDescription)"
        )
    }

    public func sessionWasInterrupted(_ session: ARSession) {
        eventEmitter?.trackingChanged(state: "PAUSED")
        lastTrackingState = "PAUSED"
    }

    public func sessionInterruptionEnded(_ session: ARSession) {
        // Tracking state will be re-reported via
        // cameraDidChangeTrackingState; nothing to emit here.
    }
}
