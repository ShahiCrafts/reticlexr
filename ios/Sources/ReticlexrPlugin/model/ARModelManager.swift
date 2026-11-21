import ARKit
import Foundation
import simd
import RealityKit
import UIKit

/// ARModelManager
///
/// Registry of models placed by the iOS runtime. Unlike Android's
/// metadata-only registry (Option B), every entry here is a REAL
/// placed model: a RealityKit entity loaded from USDZ, attached to
/// an `AnchorEntity` bound to a real `ARAnchor`, with collision
/// shapes generated and RealityKit gestures (translation / rotation
/// / scale) installed.
///
/// Records are keyed by `modelId` (a UUID string); `anchorId` is
/// the same value, per the package's API-01 unification.
///
/// Must only be touched on the main thread.
public final class ARModelManager {

    public struct PlacedModel {
        public let modelId: String
        /// The source string the caller passed (GLB or USDZ), as
        /// reported back in `modelUrl` fields.
        public let source: String
        public let entity: Entity
        public var anchorEntity: AnchorEntity
        public var arAnchor: ARAnchor
    }

    private var models: [String: PlacedModel] = [:]
    private var placementOrder: [String] = []

    public var isEmpty: Bool {
        return models.isEmpty
    }

    public func model(for modelId: String) -> PlacedModel? {
        return models[modelId]
    }

    // MARK: - Loading

    /// Load an entity from a local USDZ file URL.
    /// Throws the RealityKit loading error on failure.
    public static func loadEntity(from fileURL: URL) throws -> Entity {
        return try Entity.load(contentsOf: fileURL)
    }

    // MARK: - Placement

    /// Place a loaded entity at a world transform: create a real
    /// ARAnchor, bind an AnchorEntity to it, generate collision
    /// shapes and install gestures. Returns the registry record.
    @discardableResult
    public func place(entity: Entity, source: String, transform: simd_float4x4, in arView: ARView) -> PlacedModel {
        let modelId = UUID().uuidString

        let arAnchor = ARAnchor(name: modelId, transform: transform)
        arView.session.add(anchor: arAnchor)

        let anchorEntity = AnchorEntity(anchor: arAnchor)
        entity.generateCollisionShapes(recursive: true)
        anchorEntity.addChild(entity)
        arView.scene.addAnchor(anchorEntity)

        if let hasCollision = entity as? HasCollision {
            arView.installGestures([.translation, .rotation, .scale], for: hasCollision)
        }

        let record = PlacedModel(
            modelId: modelId,
            source: source,
            entity: entity,
            anchorEntity: anchorEntity,
            arAnchor: arAnchor
        )
        models[modelId] = record
        placementOrder.append(modelId)
        return record
    }

    /// Re-anchor a placed model at a new world transform (moveModel).
    /// The old ARAnchor/AnchorEntity pair is replaced; the entity
    /// itself (and its material/transform customisations that live
    /// on it) is carried over.
    @discardableResult
    public func move(record: PlacedModel, to transform: simd_float4x4, in arView: ARView) -> PlacedModel {
        var updated = record

        arView.scene.removeAnchor(record.anchorEntity)
        arView.session.remove(anchor: record.arAnchor)
        record.entity.removeFromParent()

        let arAnchor = ARAnchor(name: record.modelId, transform: transform)
        arView.session.add(anchor: arAnchor)
        let anchorEntity = AnchorEntity(anchor: arAnchor)
        anchorEntity.addChild(record.entity)
        arView.scene.addAnchor(anchorEntity)

        updated.arAnchor = arAnchor
        updated.anchorEntity = anchorEntity
        models[record.modelId] = updated
        return updated
    }

    // MARK: - Transforms / material

    /// Apply facade setTransform: Euler rotation in DEGREES and/or
    /// a uniform scale (clamped to [0.1, 5], the package-wide
    /// API-08 range), applied to the model entity itself.
    public func applyTransform(record: PlacedModel, rotationDegrees: (x: Double, y: Double, z: Double)?, scale: Double?) {
        if let rotation = rotationDegrees {
            record.entity.orientation = ARCoordinateMapper.quaternion(
                eulerDegreesX: rotation.x, y: rotation.y, z: rotation.z
            )
        }
        if let scale = scale {
            let clamped = Float(min(max(scale, 0.1), 5.0))
            record.entity.scale = simd_float3(repeating: clamped)
        }
    }

    /// Apply facade setMaterial: a flat SimpleMaterial in the given
    /// colour across every mesh in the entity subtree.
    public func applyColor(record: PlacedModel, uiColor: UIColor) {
        let material = SimpleMaterial(color: uiColor, roughness: 0.6, isMetallic: false)
        applyMaterial(material, to: record.entity)
    }

    private func applyMaterial(_ material: Material, to entity: Entity) {
        if var modelComponent = entity.components[ModelComponent.self] {
            modelComponent.materials = [material]
            entity.components[ModelComponent.self] = modelComponent
        }
        for child in entity.children {
            applyMaterial(material, to: child)
        }
    }

    // MARK: - Removal / listing

    /// Remove one model from the scene, the session and the
    /// registry. Returns the removed record, or nil when unknown.
    @discardableResult
    public func remove(modelId: String, in arView: ARView) -> PlacedModel? {
        guard let record = models.removeValue(forKey: modelId) else { return nil }
        placementOrder.removeAll { $0 == modelId }
        arView.scene.removeAnchor(record.anchorEntity)
        arView.session.remove(anchor: record.arAnchor)
        record.entity.removeFromParent()
        return record
    }

    /// Remove every model, in placement order. Returns the removed
    /// records (the plugin emits one modelRemoved per record, like
    /// the WebXR runtime's clearModels).
    @discardableResult
    public func removeAll(in arView: ARView) -> [PlacedModel] {
        let removed = placementOrder.compactMap { models[$0] }
        for record in removed {
            arView.scene.removeAnchor(record.anchorEntity)
            arView.session.remove(anchor: record.arAnchor)
            record.entity.removeFromParent()
        }
        models.removeAll()
        placementOrder.removeAll()
        return removed
    }

    /// The facade's `getPlacedModels` entry for one record:
    /// `{modelId, anchorId, modelUrl, position, rotation, scale}`.
    /// Position/rotation come from the anchor's live world
    /// transform (so gesture moves are reflected); scale is the
    /// entity's current uniform scale, reported per axis like the
    /// WebXR runtime's entries.
    public func placedModelData(for record: PlacedModel) -> [String: Any] {
        let matrix = record.anchorEntity.transformMatrix(relativeTo: nil)
        let scale = record.entity.scale
        return [
            "modelId": record.modelId,
            "anchorId": record.modelId,
            "modelUrl": record.source,
            "position": ARCoordinateMapper.position(from: matrix),
            "rotation": ARCoordinateMapper.quaternion(from: matrix),
            "scale": [Double(scale.x), Double(scale.y), Double(scale.z)],
        ]
    }

    /// All placed-model entries, in placement order.
    public func placedModelsData() -> [[String: Any]] {
        return placementOrder.compactMap { models[$0] }.map { placedModelData(for: $0) }
    }
}
