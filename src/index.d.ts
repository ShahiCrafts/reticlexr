/**
 * reticlexr — public type declarations (API-06 / PKG-02).
 *
 * The package entry (`src/index.js`) exports:
 * - `ARCore` (default): the Capacitor native facade. On Android it
 *   bridges to the ARCore plugin; on web the same plugin name resolves
 *   to the WebXR engine (`ARCoreWeb`, see web.d.ts).
 * - `ARView` / `createARView` + functional helpers: the high-level
 *   WebXR facade (see ar-view.d.ts).
 * - `useARCore`: the React hook — supported via the `reticlexr/react`
 *   subpath (see react.d.ts); the root re-export is deprecated
 *   (API-02).
 * - `createARGestureController`: the gesture controller (see
 *   gestures.d.ts).
 */
import type { PluginListenerHandle } from '@capacitor/core';

export interface ARCoreStartSessionOptions {
  planeDetection?: boolean;
  lightEstimation?: boolean;
}

export interface ARCoreHitTestOptions {
  /** Normalised X [0, 1]. */
  x: number;
  /** Normalised Y [0, 1]. */
  y: number;
}

export interface ARCoreHitTestResult {
  hit: boolean;
  position?: number[];
  rotation?: number[];
  planeType?: string;
  error?: string;
}

export interface ARCorePlaceModelOptions {
  /** Path to a GLB model (e.g. "models/chair.glb"). */
  modelPath: string;
  hitId?: string;
}

export interface ARCoreSetTransformOptions {
  modelId: string;
  /** Euler angles {x, y, z} in DEGREES (native facade convention). */
  rotation?: { x?: number; y?: number; z?: number };
  /** Uniform scale factor. */
  scale?: number;
}

export interface ARCoreSetMaterialOptions {
  modelId: string;
  /** Hex color string (e.g. "#7D8B67"). */
  color: string;
}

export interface ARCoreMoveModelOptions {
  modelId: string;
  /** Normalised X [0, 1]. */
  x: number;
  /** Normalised Y [0, 1]. */
  y: number;
}

export interface ARCoreRemoveModelOptions {
  modelId: string;
}

export interface ARCoreSupportResult {
  supported: boolean;
  reason: string;
}

/**
 * The native facade's event types (API-07). Events are PER RUNTIME:
 * this is the Android plugin's set, bridged lazily on the first
 * `ARCore.on` subscription (API-02). The WebXR engine emits a
 * different set through its own listener channels
 * (see `EngineFrameEvent` / `EnginePlaneEvent` in web.d.ts) and never
 * through `ARCore.on`. `surfaceUpdated`, `trackingChanged`,
 * `sessionStarted`, `sessionStopped`, `modelMaterialChanged` and
 * `modelMoved` are native-only.
 */
export type ARCoreEventType =
  | 'sessionStarted'
  | 'trackingChanged'
  | 'surfaceDetected'
  | 'surfaceLost'
  | 'surfaceUpdated'
  | 'sessionStopped'
  | 'modelPlaced'
  | 'modelRemoved'
  | 'modelTransformed'
  | 'modelMaterialChanged'
  | 'modelMoved'
  | 'error';

export interface ARCoreFacade {
  startSession(
    options?: ARCoreStartSessionOptions
  ): Promise<{ success: boolean }>;
  stopSession(): Promise<void>;
  hitTest(options: ARCoreHitTestOptions): Promise<ARCoreHitTestResult>;
  placeModel(
    options: ARCorePlaceModelOptions
  ): Promise<{ modelId: string; anchorId: string }>;
  setTransform(options: ARCoreSetTransformOptions): Promise<void>;
  setMaterial(options: ARCoreSetMaterialOptions): Promise<void>;
  moveModel(
    options: ARCoreMoveModelOptions
  ): Promise<ARCoreHitTestResult>;
  removeModel(options: ARCoreRemoveModelOptions): Promise<void>;
  checkSupport(): Promise<ARCoreSupportResult>;
  /**
   * Register a listener for facade (native-plugin) events.
   * Returns an unsubscribe function.
   */
  on(
    eventType: ARCoreEventType,
    callback: (data: unknown) => void
  ): () => void;
  /**
   * Register a Capacitor plugin listener directly.
   * @internal Use `on()` for local listeners.
   */
  addListener(
    eventType: string,
    callback: (data: unknown) => void
  ): Promise<PluginListenerHandle>;
}

export declare const ARCore: ARCoreFacade;
export default ARCore;

/**
 * Install the native → local event bridge (API-02). Runs
 * automatically on the first `ARCore.on()` subscription; idempotent
 * — repeat calls on the same plugin are no-ops. Application code
 * never needs to call this directly.
 *
 * @internal Exported for verification.
 */
export declare function setupEventBridge(
  plugin?: unknown,
  bus?: Record<string, Array<(data: unknown) => void>>
): boolean;

// The WebXR engine's types, re-exported at the root: ARView and the
// hook expose engine types in their signatures, and the engine itself
// (ARCHITECTURE.md §2.4) is part of the verified surface. Until the
// exports map lands (Phase 4), this is how consumers reach them.
export type {
  AnchorData,
  ARConfig,
  ARCoreWeb,
  ARSessionOptions,
  ARSessionResult,
  ARSupportResult,
  DetectedPlaneInfo,
  EngineFrameEvent,
  EnginePlaneEvent,
  EulerRotationInput,
  HitTestOptions,
  HitTestResult,
  PlaceModelOptions,
  QuaternionArray,
  RotationInput,
  ScaleInput,
  ScreenshotOptions,
  ScreenshotResult,
  ShadowConfig,
  SurfaceDetectionState,
  SurfaceState,
  TransformModelOptions,
  Vector3Array,
  Vector3Input,
  Vector3Object,
} from './web.js';

/**
 * @deprecated Import `useARCore` from `reticlexr/react` instead
 * (API-02). This root re-export keeps working in 1.x and will be
 * removed in the next major version.
 */
export { useARCore } from './hooks.js';
export type { PlacedModel, PlaneCounts, UseARCoreReturn } from './hooks.js';
export { createARGestureController } from './gestures.js';
export type {
  ARGestureController,
  ARGestureOptions,
  GestureDragEvent,
  GesturePinchEvent,
  GesturePoint,
  GestureRotateEvent,
} from './gestures.js';
export {
  ARView,
  createARView,
  takeScreenshot,
  enableCustomization,
  addTextures,
  switchModel,
  placeModel,
} from './ar-view.js';
export type {
  ARViewCreateOptions,
  ARViewOptions,
  ARViewPlaceModelOptions,
  ARViewPlaceResult,
  CustomizationOptions,
} from './ar-view.js';
