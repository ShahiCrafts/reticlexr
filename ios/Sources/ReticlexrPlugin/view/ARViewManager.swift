import ARKit
import Foundation
import RealityKit
import UIKit

/// ARViewManager
///
/// Owns the RealityKit `ARView` overlay, mirroring Android's
/// `ARViewManager.java`: on `startSession` the AR view is added
/// fullscreen over the Capacitor web view (the web view stays in the
/// hierarchy underneath; all control flows through the plugin), and
/// on `stopSession` it is removed and the session paused.
///
/// Must only be touched on the main thread.
public final class ARViewManager {

    public private(set) var arView: ARView?

    public var isSessionActive: Bool {
        return arView != nil
    }

    /// The live ARSession (owned by the ARView), if a session is up.
    public var session: ARSession? {
        return arView?.session
    }

    /// Create the ARView over the given host (the Capacitor web
    /// view), run the session with the configuration, and wire the
    /// session delegate. Returns false when there is nowhere to
    /// attach the view.
    @discardableResult
    public func attach(over hostView: UIView, configuration: ARWorldTrackingConfiguration, sessionManager: ARSessionManager) -> Bool {
        detach()

        let view = ARView(frame: hostView.bounds)
        view.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        view.session.delegate = sessionManager
        view.session.delegateQueue = .main

        if let superview = hostView.superview {
            superview.addSubview(view)
            view.frame = superview.bounds
            view.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        } else {
            // No superview (should not happen for the bridge web
            // view): attach to the host itself as a fallback.
            hostView.addSubview(view)
            view.frame = hostView.bounds
        }

        arView = view
        view.session.run(configuration, options: [.resetTracking, .removeExistingAnchors])
        return true
    }

    /// Pause the session and remove the AR view, restoring the web
    /// view as the only visible content.
    public func detach() {
        guard let view = arView else { return }
        view.session.pause()
        view.removeFromSuperview()
        arView = nil
    }

    /// Raycast from a normalised [0, 1] screen point against
    /// estimated planes of any alignment. Returns the closest
    /// result, or nil when nothing is hit.
    public func raycast(normalisedX x: Double, normalisedY y: Double) -> RaycastResult? {
        guard let view = arView else { return nil }
        let point = ARCoordinateMapper.point(normalisedX: x, normalisedY: y, in: view.bounds.size)
        let results = view.raycast(from: point, allowing: .estimatedPlane, alignment: .any)
        return results.first
    }

    /// Raycast at the screen centre — the placement fallback when no
    /// hit test has succeeded yet in this session.
    public func raycastAtCentre() -> RaycastResult? {
        return raycast(normalisedX: 0.5, normalisedY: 0.5)
    }
}
