import ARKit
import AVFoundation
import Capacitor
import Foundation
import simd
import RealityKit
import UIKit

/// ARCorePlugin — the iOS native runtime for reticlexr.
///
/// The JS facade (src/index.js) registers the plugin under the name
/// "ARCore" on every platform, so this plugin's `jsName` is "ARCore"
/// even though the iOS implementation is ARKit + RealityKit, not
/// ARCore. The method set, result shapes, event names/payloads and
/// coded-error convention (API-05) match the Android plugin's.
///
/// Scope difference (deliberate): Android native is Option B —
/// session + hit-testing only, with model methods rejecting
/// NOT_IMPLEMENTED because WebXR renders the models there. iOS has
/// no WebXR, so this runtime implements model placement FOR REAL
/// via RealityKit. iOS models are USDZ: a GLB/GLTF source maps to
/// its sibling .usdz file, or the caller passes `usdzPath` /
/// `usdzUrl` explicitly; otherwise the call rejects with
/// MODEL_FORMAT_UNSUPPORTED instead of faking success.
@objc(ARCorePlugin)
public class ARCorePlugin: CAPPlugin, CAPBridgedPlugin {

    public let identifier = "ARCorePlugin"
    public let jsName = "ARCore"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "checkSupport", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "startSession", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stopSession", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "hitTest", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "placeModel", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setTransform", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setMaterial", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "moveModel", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "removeModel", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getPlacedModels", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "clearModels", returnType: CAPPluginReturnPromise),
    ]

    private var eventEmitter: AREventEmitter!
    private let sessionManager = ARSessionManager()
    private let viewManager = ARViewManager()
    private let modelManager = ARModelManager()

    /// Transform of the last successful hit test in this session —
    /// the placement point for placeModel when it carries no fresh
    /// hit of its own (Android/WebXR behaviour parity).
    private var lastHitTransform: simd_float4x4?

    override public func load() {
        eventEmitter = AREventEmitter(plugin: self)
        sessionManager.eventEmitter = eventEmitter
    }

    override public func handleOnDestroy() {
        DispatchQueue.main.async { [weak self] in
            self?.viewManager.detach()
        }
    }

    // MARK: - checkSupport

    /// Mirrors Android NAT-12: resolves `{supported, reason}` (plus
    /// `code` when unsupported) and never throws.
    @objc func checkSupport(_ call: CAPPluginCall) {
        let result = ARSessionManager.supportResult()
        var data: PluginCallResultData = [
            "supported": result.supported,
            "reason": result.reason,
        ]
        if let code = result.code {
            data["code"] = code
        }
        call.resolve(data)
    }

    // MARK: - startSession / stopSession

    @objc func startSession(_ call: CAPPluginCall) {
        let planeDetection = call.getBool("planeDetection") ?? true
        let lightEstimation = call.getBool("lightEstimation") ?? true

        switch AVCaptureDevice.authorizationStatus(for: .video) {
        case .authorized:
            beginSession(call, planeDetection: planeDetection, lightEstimation: lightEstimation)
        case .notDetermined:
            AVCaptureDevice.requestAccess(for: .video) { [weak self] granted in
                guard let self = self else { return }
                if granted {
                    self.beginSession(call, planeDetection: planeDetection, lightEstimation: lightEstimation)
                } else {
                    call.reject("Camera permission is required for AR", "CAMERA_PERMISSION_DENIED")
                }
            }
        case .denied, .restricted:
            call.reject("Camera permission is required for AR", "CAMERA_PERMISSION_DENIED")
        @unknown default:
            call.reject("Camera permission is required for AR", "CAMERA_PERMISSION_DENIED")
        }
    }

    private func beginSession(_ call: CAPPluginCall, planeDetection: Bool, lightEstimation: Bool) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            guard ARSessionManager.isSupported() else {
                let result = ARSessionManager.supportResult()
                call.reject(result.reason, result.code ?? "UNSUPPORTED_DEVICE_NOT_CAPABLE")
                return
            }
            guard let webView = self.bridge?.webView else {
                call.reject("Cannot start AR session: no web view to overlay", "VIEW_UNAVAILABLE")
                return
            }
            let configuration = self.sessionManager.makeConfiguration(
                planeDetection: planeDetection,
                lightEstimation: lightEstimation
            )
            let attached = self.viewManager.attach(
                over: webView,
                configuration: configuration,
                sessionManager: self.sessionManager
            )
            guard attached else {
                call.reject("Cannot start AR session: failed to attach the AR view", "VIEW_UNAVAILABLE")
                return
            }
            self.lastHitTransform = nil
            self.eventEmitter.sessionStarted()
            call.resolve(["success": true])
        }
    }

    @objc func stopSession(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            if let arView = self.viewManager.arView {
                _ = self.modelManager.removeAll(in: arView)
            }
            self.viewManager.detach()
            self.sessionManager.reset()
            self.lastHitTransform = nil
            self.eventEmitter.sessionStopped()
            call.resolve()
        }
    }

    // MARK: - hitTest

    /// Like Android: resolves (never rejects) — `{hit: false, error}`
    /// with no session, `{hit: false}` on a miss, and on a hit
    /// `{hit: true, position, rotation, planeType, anchorId}` where
    /// rotation is the quaternion [qx, qy, qz, qw] Android returns
    /// and anchorId is a real ARAnchor registered with the session.
    @objc func hitTest(_ call: CAPPluginCall) {
        guard viewManager.isSessionActive else {
            call.resolve(["hit": false, "error": "Session not active"])
            return
        }
        let x = call.getDouble("x") ?? 0.5
        let y = call.getDouble("y") ?? 0.5
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            guard let result = self.viewManager.raycast(normalisedX: x, normalisedY: y),
                  let session = self.viewManager.session else {
                call.resolve(["hit": false])
                return
            }
            self.lastHitTransform = result.worldTransform
            let anchorId = self.sessionManager.registerHitAnchor(
                transform: result.worldTransform, in: session
            )
            call.resolve([
                "hit": true,
                "position": ARCoordinateMapper.position(from: result.worldTransform),
                "rotation": ARCoordinateMapper.quaternion(from: result.worldTransform),
                "planeType": ARCoordinateMapper.planeType(from: result.worldTransform),
                "anchorId": anchorId,
            ])
        }
    }

    // MARK: - placeModel

    @objc func placeModel(_ call: CAPPluginCall) {
        guard viewManager.isSessionActive else {
            call.reject("Cannot place a model: AR session is not active", "SESSION_NOT_ACTIVE")
            return
        }
        let explicitUSDZ = call.getString("usdzPath") ?? call.getString("usdzUrl")
        let glbSource = call.getString("modelPath") ?? call.getString("modelUrl")
        guard let rawSource = explicitUSDZ ?? glbSource else {
            call.reject("placeModel requires a modelPath/modelUrl (or usdzPath/usdzUrl on iOS)", "MODEL_URL_REQUIRED")
            return
        }

        // Resolve the iOS (USDZ) source for this call.
        let usdzSource: String
        if explicitUSDZ != nil {
            usdzSource = rawSource
        } else {
            guard let mapped = Self.usdzCandidate(for: rawSource) else {
                call.reject(
                    "iOS cannot load '\(rawSource)': ARKit/RealityKit need a USDZ model. " +
                    "Pass usdzPath/usdzUrl, or provide a .usdz sibling next to the GLB file.",
                    "MODEL_FORMAT_UNSUPPORTED"
                )
                return
            }
            usdzSource = mapped
        }
        guard usdzSource.lowercased().hasSuffix(".usdz") else {
            call.reject(
                "iOS cannot load '\(usdzSource)': ARKit/RealityKit need a USDZ model (.usdz).",
                "MODEL_FORMAT_UNSUPPORTED"
            )
            return
        }

        if usdzSource.hasPrefix("http://") || usdzSource.hasPrefix("https://") {
            downloadModel(from: usdzSource, originalSource: rawSource, derivedFromGLB: explicitUSDZ == nil, call: call)
        } else if let fileURL = resolveLocalModelFile(usdzSource) {
            DispatchQueue.main.async { [weak self] in
                self?.loadAndPlace(fileURL: fileURL, originalSource: rawSource, call: call)
            }
        } else {
            // A GLB whose USDZ sibling does not exist is a format
            // problem, not a missing-file problem: say so precisely.
            if explicitUSDZ == nil && Self.isGLBSource(rawSource) {
                call.reject(
                    "iOS cannot load '\(rawSource)': no USDZ version found at '\(usdzSource)'. " +
                    "ARKit/RealityKit need USDZ — convert the model, ship the .usdz sibling, " +
                    "or pass usdzPath/usdzUrl.",
                    "MODEL_FORMAT_UNSUPPORTED"
                )
            } else {
                call.reject("Model file not found: \(usdzSource)", "MODEL_LOAD_FAILED")
            }
        }
    }

    /// Map a GLB/GLTF source to its USDZ sibling (same folder, same
    /// base name, .usdz extension). Returns the source unchanged
    /// when it is already USDZ, and nil for other extensions.
    public static func usdzCandidate(for source: String) -> String? {
        // Split off any query/fragment so extension checks see the path.
        let pathEnd = source.firstIndex(where: { $0 == "?" || $0 == "#" }) ?? source.endIndex
        let path = String(source[..<pathEnd])
        let suffix = String(source[pathEnd...])
        let lower = path.lowercased()
        if lower.hasSuffix(".usdz") {
            return source
        }
        for ext in [".glb", ".gltf"] where lower.hasSuffix(ext) {
            return String(path.dropLast(ext.count)) + ".usdz" + suffix
        }
        return nil
    }

    public static func isGLBSource(_ source: String) -> Bool {
        let lower = source.lowercased()
        return lower.hasSuffix(".glb") || lower.hasSuffix(".gltf")
    }

    /// Resolve a local model path against the app bundle: the
    /// Capacitor `public/` folder first, then the bundle root, then
    /// an absolute / file:// path as given.
    private func resolveLocalModelFile(_ source: String) -> URL? {
        let fileManager = FileManager.default
        var path = source
        if path.hasPrefix("file://"), let url = URL(string: path) {
            return fileManager.fileExists(atPath: url.path) ? url : nil
        }
        if path.hasPrefix("/") && fileManager.fileExists(atPath: path) {
            return URL(fileURLWithPath: path)
        }
        while path.hasPrefix("/") { path.removeFirst() }
        let bundle = Bundle.main.bundleURL
        let candidates = [
            bundle.appendingPathComponent("public").appendingPathComponent(path),
            bundle.appendingPathComponent(path),
        ]
        return candidates.first { fileManager.fileExists(atPath: $0.path) }
    }

    /// Download a remote USDZ into Caches, then load + place it.
    private func downloadModel(from urlString: String, originalSource: String, derivedFromGLB: Bool, call: CAPPluginCall) {
        guard let url = URL(string: urlString) else {
            call.reject("Invalid model URL: \(urlString)", "MODEL_LOAD_FAILED")
            return
        }
        let task = URLSession.shared.downloadTask(with: url) { [weak self] tempURL, response, error in
            guard let self = self else { return }
            if let error = error {
                call.reject("Failed to download model: \(error.localizedDescription)", "MODEL_LOAD_FAILED")
                return
            }
            if let http = response as? HTTPURLResponse, !(200..<300).contains(http.statusCode) {
                if derivedFromGLB {
                    call.reject(
                        "iOS cannot load '\(originalSource)': no USDZ version at '\(urlString)' " +
                        "(HTTP \(http.statusCode)). ARKit/RealityKit need USDZ — convert the model " +
                        "or pass usdzPath/usdzUrl.",
                        "MODEL_FORMAT_UNSUPPORTED"
                    )
                } else {
                    call.reject("Failed to download model: HTTP \(http.statusCode)", "MODEL_LOAD_FAILED")
                }
                return
            }
            guard let tempURL = tempURL else {
                call.reject("Failed to download model: empty response", "MODEL_LOAD_FAILED")
                return
            }
            do {
                let fileManager = FileManager.default
                let cacheDir = fileManager.urls(for: .cachesDirectory, in: .userDomainMask)[0]
                    .appendingPathComponent("reticlexr-models", isDirectory: true)
                try fileManager.createDirectory(at: cacheDir, withIntermediateDirectories: true)
                let destination = cacheDir.appendingPathComponent(url.lastPathComponent)
                if fileManager.fileExists(atPath: destination.path) {
                    try fileManager.removeItem(at: destination)
                }
                try fileManager.moveItem(at: tempURL, to: destination)
                DispatchQueue.main.async {
                    self.loadAndPlace(fileURL: destination, originalSource: originalSource, call: call)
                }
            } catch {
                call.reject("Failed to store downloaded model: \(error.localizedDescription)", "MODEL_LOAD_FAILED")
            }
        }
        task.resume()
    }

    /// Load the USDZ entity and place it at the last hit transform,
    /// or at a fresh centre raycast when there is no hit yet.
    private func loadAndPlace(fileURL: URL, originalSource: String, call: CAPPluginCall) {
        // Main thread (all callers dispatch here).
        guard let arView = viewManager.arView else {
            call.reject("Cannot place a model: AR session is not active", "SESSION_NOT_ACTIVE")
            return
        }
        let transform: simd_float4x4
        if let lastHit = lastHitTransform {
            transform = lastHit
        } else if let centre = viewManager.raycastAtCentre() {
            transform = centre.worldTransform
            lastHitTransform = transform
        } else {
            call.reject(
                "No surface found to place the model on: point the camera at a surface first",
                "NO_SURFACE"
            )
            return
        }

        let entity: Entity
        do {
            entity = try ARModelManager.loadEntity(from: fileURL)
        } catch {
            call.reject("Failed to load model: \(error.localizedDescription)", "MODEL_LOAD_FAILED")
            return
        }

        let record = modelManager.place(entity: entity, source: originalSource, transform: transform, in: arView)
        let data = modelManager.placedModelData(for: record)
        eventEmitter.modelPlaced(
            modelId: record.modelId,
            modelUrl: record.source,
            position: data["position"] as? [Double] ?? [],
            rotation: data["rotation"] as? [Double] ?? [],
            scale: data["scale"] as? [Double] ?? []
        )
        call.resolve(["modelId": record.modelId, "anchorId": record.modelId])
    }

    // MARK: - setTransform / setMaterial

    @objc func setTransform(_ call: CAPPluginCall) {
        guard let modelId = call.getString("modelId") ?? call.getString("anchorId") else {
            call.reject("setTransform requires a modelId", "MODEL_NOT_FOUND")
            return
        }
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            guard let record = self.modelManager.model(for: modelId) else {
                call.reject("Model \(modelId) not found", "MODEL_NOT_FOUND")
                return
            }
            var rotation: (x: Double, y: Double, z: Double)?
            if let rotationObject = call.getObject("rotation") {
                rotation = (
                    x: Self.doubleValue(rotationObject["x"]),
                    y: Self.doubleValue(rotationObject["y"]),
                    z: Self.doubleValue(rotationObject["z"])
                )
            }
            let scale = call.getDouble("scale")
            self.modelManager.applyTransform(record: record, rotationDegrees: rotation, scale: scale)
            let data = self.modelManager.placedModelData(for: record)
            self.eventEmitter.modelTransformed(
                modelId: record.modelId,
                modelUrl: record.source,
                position: data["position"] as? [Double] ?? [],
                rotation: data["rotation"] as? [Double] ?? [],
                scale: data["scale"] as? [Double] ?? []
            )
            call.resolve()
        }
    }

    @objc func setMaterial(_ call: CAPPluginCall) {
        guard let modelId = call.getString("modelId") ?? call.getString("anchorId") else {
            call.reject("setMaterial requires a modelId", "MODEL_NOT_FOUND")
            return
        }
        guard let color = call.getString("color") else {
            call.reject("setMaterial requires a color", "INVALID_COLOR")
            return
        }
        guard let rgba = ARCoordinateMapper.parseHexColor(color) else {
            call.reject("Invalid hex color: \(color)", "INVALID_COLOR")
            return
        }
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            guard let record = self.modelManager.model(for: modelId) else {
                call.reject("Model \(modelId) not found", "MODEL_NOT_FOUND")
                return
            }
            let uiColor = UIColor(
                red: CGFloat(rgba.red), green: CGFloat(rgba.green),
                blue: CGFloat(rgba.blue), alpha: CGFloat(rgba.alpha)
            )
            self.modelManager.applyColor(record: record, uiColor: uiColor)
            self.eventEmitter.modelMaterialChanged(modelId: record.modelId, color: color)
            call.resolve()
        }
    }

    // MARK: - moveModel / removeModel / getPlacedModels / clearModels

    /// Raycast at (x, y) and re-anchor the model there. Resolves
    /// with the hit-test result shape, like the facade documents;
    /// a miss resolves `{hit: false}` and the model stays put.
    @objc func moveModel(_ call: CAPPluginCall) {
        guard let modelId = call.getString("modelId") ?? call.getString("anchorId") else {
            call.reject("moveModel requires a modelId", "MODEL_NOT_FOUND")
            return
        }
        let x = call.getDouble("x") ?? 0.5
        let y = call.getDouble("y") ?? 0.5
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            guard let arView = self.viewManager.arView else {
                call.resolve(["hit": false, "error": "Session not active"])
                return
            }
            guard let record = self.modelManager.model(for: modelId) else {
                call.reject("Model \(modelId) not found", "MODEL_NOT_FOUND")
                return
            }
            guard let result = self.viewManager.raycast(normalisedX: x, normalisedY: y) else {
                call.resolve(["hit": false])
                return
            }
            self.lastHitTransform = result.worldTransform
            let updated = self.modelManager.move(record: record, to: result.worldTransform, in: arView)
            let position = ARCoordinateMapper.position(from: result.worldTransform)
            let rotation = ARCoordinateMapper.quaternion(from: result.worldTransform)
            let planeType = ARCoordinateMapper.planeType(from: result.worldTransform)
            _ = updated
            self.eventEmitter.modelMoved(
                modelId: modelId, position: position, rotation: rotation, planeType: planeType
            )
            call.resolve([
                "hit": true,
                "position": position,
                "rotation": rotation,
                "planeType": planeType,
            ])
        }
    }

    @objc func removeModel(_ call: CAPPluginCall) {
        guard let modelId = call.getString("modelId") ?? call.getString("anchorId") else {
            call.reject("removeModel requires a modelId", "MODEL_NOT_FOUND")
            return
        }
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            guard let arView = self.viewManager.arView,
                  self.modelManager.remove(modelId: modelId, in: arView) != nil else {
                call.reject("Model \(modelId) not found", "MODEL_NOT_FOUND")
                return
            }
            self.eventEmitter.modelRemoved(modelId: modelId)
            call.resolve()
        }
    }

    /// The Capacitor native bridge can only resolve a dictionary,
    /// so the list travels under `models`; the JS facade unwraps it
    /// to the documented array (the WebXR runtime returns the array
    /// directly). Entry shape matches the web runtime exactly.
    @objc func getPlacedModels(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            call.resolve(["models": self.modelManager.placedModelsData()])
        }
    }

    @objc func clearModels(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            if let arView = self.viewManager.arView {
                let removed = self.modelManager.removeAll(in: arView)
                for record in removed {
                    self.eventEmitter.modelRemoved(modelId: record.modelId)
                }
            }
            call.resolve()
        }
    }

    // MARK: - Helpers

    /// Numeric value out of a JSObject entry (numbers arrive as
    /// NSNumber through the bridge; anything else counts as 0).
    private static func doubleValue(_ value: Any?) -> Double {
        if let number = value as? NSNumber {
            return number.doubleValue
        }
        if let double = value as? Double {
            return double
        }
        return 0
    }
}
