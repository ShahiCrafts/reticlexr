import Capacitor
import Foundation

/// AREventEmitter
///
/// Thin wrapper over Capacitor's `notifyListeners`, mirroring
/// Android's `AREventEmitter.java`. Event names and payload shapes
/// are identical to the Android plugin's, so the facade's lazy event
/// bridge (`ARCore.on` in src/index.js) works unchanged on iOS:
///
/// - sessionStarted {} / sessionStopped {}
/// - trackingChanged {state}
/// - surfaceDetected {planeType} / surfaceLost {}
/// - surfaceUpdated {planeType, planeCount}
/// - error {code, message}
/// - modelPlaced {modelId, anchorId, modelUrl, position, rotation, scale}
/// - modelRemoved {modelId, anchorId}
/// - modelTransformed {modelId, anchorId, modelUrl, position, rotation, scale}
/// - modelMaterialChanged {modelId, anchorId, color}
/// - modelMoved {modelId, anchorId, position, rotation, planeType}
public final class AREventEmitter {

    private weak var plugin: CAPPlugin?

    public init(plugin: CAPPlugin) {
        self.plugin = plugin
    }

    public func emit(_ eventName: String, _ data: PluginCallResultData = [:]) {
        plugin?.notifyListeners(eventName, data: data, retainUntilConsumed: true)
    }

    // MARK: - Session / tracking / surface events

    public func sessionStarted() {
        emit("sessionStarted")
    }

    public func sessionStopped() {
        emit("sessionStopped")
    }

    public func trackingChanged(state: String) {
        emit("trackingChanged", ["state": state])
    }

    public func surfaceDetected(planeType: String) {
        emit("surfaceDetected", ["planeType": planeType])
    }

    public func surfaceLost() {
        emit("surfaceLost")
    }

    public func surfaceUpdated(planeType: String, planeCount: Int) {
        emit("surfaceUpdated", ["planeType": planeType, "planeCount": planeCount])
    }

    public func error(code: String, message: String) {
        emit("error", ["code": code, "message": message])
    }

    // MARK: - Model events

    public func modelPlaced(modelId: String, modelUrl: String, position: [Double], rotation: [Double], scale: [Double]) {
        emit("modelPlaced", [
            "modelId": modelId,
            "anchorId": modelId,
            "modelUrl": modelUrl,
            "position": position,
            "rotation": rotation,
            "scale": scale,
        ])
    }

    public func modelRemoved(modelId: String) {
        emit("modelRemoved", ["modelId": modelId, "anchorId": modelId])
    }

    public func modelTransformed(modelId: String, modelUrl: String, position: [Double], rotation: [Double], scale: [Double]) {
        emit("modelTransformed", [
            "modelId": modelId,
            "anchorId": modelId,
            "modelUrl": modelUrl,
            "position": position,
            "rotation": rotation,
            "scale": scale,
        ])
    }

    public func modelMaterialChanged(modelId: String, color: String) {
        emit("modelMaterialChanged", ["modelId": modelId, "anchorId": modelId, "color": color])
    }

    public func modelMoved(modelId: String, position: [Double], rotation: [Double], planeType: String) {
        emit("modelMoved", [
            "modelId": modelId,
            "anchorId": modelId,
            "position": position,
            "rotation": rotation,
            "planeType": planeType,
        ])
    }
}
