/**
 * reticlexr — public type declarations (API-06 / PKG-02).
 *
 * The package entry (`src/index.js`) exports:
 * - `ARCore` (default): the Capacitor native facade. On Android it
 *   bridges to the ARCore plugin; on iOS to the ARKit + RealityKit
 *   plugin (registered under the same "ARCore" jsName); on web the
 *   same plugin name resolves to the WebXR engine (`ARCoreWeb`,
 *   see web.d.ts).
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

/**
 * Facade placeModel options (API-01): exactly one of `modelPath` /
 * `modelUrl` is required — the facade forwards both to whichever
 * runtime handles the call.
 *
 * iOS note: ARKit/RealityKit load USDZ, not GLB. On iOS the native
 * runtime maps a GLB/GLTF source to its sibling `.usdz` file (same
 * folder, same base name); `usdzPath` / `usdzUrl` name the iOS
 * source explicitly and take precedence there. When no USDZ source
 * exists, iOS rejects with code `MODEL_FORMAT_UNSUPPORTED`. Other
 * runtimes ignore the USDZ fields.
 */
export type ARCorePlaceModelOptions =
  | {
      /** Path to a GLB model (e.g. "models/chair.glb"). */
      modelPath: string;
      modelUrl?: string;
      hitId?: string;
      /** iOS only: explicit USDZ model path/URL; takes precedence over the GLB source. */
      usdzPath?: string;
      /** iOS only: alias of `usdzPath`. */
      usdzUrl?: string;
    }
  | {
      modelPath?: string;
      /** Alias for `modelPath` — a GLB URL/path. */
      modelUrl: string;
      hitId?: string;
      /** iOS only: explicit USDZ model path/URL; takes precedence over the GLB source. */
      usdzPath?: string;
      /** iOS only: alias of `usdzPath`. */
      usdzUrl?: string;
    }
  | {
      modelPath?: string;
      modelUrl?: string;
      hitId?: string;
      /** iOS only: explicit USDZ model path/URL — sufficient on its own for iOS placement. */
      usdzPath: string;
      usdzUrl?: string;
    }
  | {
      modelPath?: string;
      modelUrl?: string;
      hitId?: string;
      usdzPath?: string;
      /** iOS only: explicit USDZ model URL — sufficient on its own for iOS placement. */
      usdzUrl: string;
    };

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

/** One placed model, as returned by the facade's `getPlacedModels` (API-03). */
export interface ARCorePlacedModel {
  modelId: string;
  /** The same id (the web engine's name for it); prefer `modelId`. */
  anchorId: string;
  modelUrl: string;
  position: number[];
  rotation: number[];
  scale: number[];
}

export interface ARCoreSupportResult {
  supported: boolean;
  reason: string;
  /** Machine-readable failure code, e.g. 'INSECURE_CONTEXT' (API-05). */
  code?: string;
}

/**
 * The native facade's event types (API-07). Events are PER RUNTIME:
 * this is the native plugins' set (Android and iOS emit the same
 * names/payloads), bridged lazily on the first
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

/**
 * The Capacitor facade. Every async method follows the package's
 * one error convention (API-05): failures reject with an `Error`
 * carrying a stable `code` — a runtime code when one exists (e.g.
 * the WebXR engine's `MODEL_NOT_FOUND`), otherwise a per-method
 * `*_FAILED` fallback.
 */
export interface ARCoreFacade {
  startSession(
    options?: ARCoreStartSessionOptions
  ): Promise<{ success: boolean }>;
  stopSession(): Promise<void>;
  hitTest(options: ARCoreHitTestOptions): Promise<ARCoreHitTestResult>;
  placeModel(
    options: ARCorePlaceModelOptions
  ): Promise<{
    modelId: string;
    /** The same id (the web engine's name for it); prefer `modelId`. */
    anchorId: string;
  }>;
  /**
   * Update a placed model's transform. Implemented by the WebXR
   * runtime and by the iOS native runtime (RealityKit); on Android
   * the native plugin rejects with code `NOT_IMPLEMENTED`
   * (Option B: Android native places no models).
   */
  setTransform(options: ARCoreSetTransformOptions): Promise<void>;
  /**
   * Set a placed model's material/colour. Implemented by the WebXR
   * runtime and by the iOS native runtime (RealityKit); on Android
   * the native plugin rejects with code `NOT_IMPLEMENTED`
   * (Option B: Android native places no models).
   */
  setMaterial(options: ARCoreSetMaterialOptions): Promise<void>;
  moveModel(
    options: ARCoreMoveModelOptions
  ): Promise<ARCoreHitTestResult>;
  /**
   * Remove a placed model. Implemented by the WebXR runtime and
   * by the iOS native runtime (RealityKit); on Android the native
   * plugin rejects with code `NOT_IMPLEMENTED` (Option B: Android
   * native places no models).
   */
  removeModel(options: ARCoreRemoveModelOptions): Promise<void>;
  /**
   * List the currently placed models (API-03). Web returns the
   * engine's list; the iOS native runtime returns its RealityKit
   * registry in the same shape (the facade unwraps the native
   * bridge's `{models}` dictionary to this array). On Android the
   * native plugin rejects with code `NOT_IMPLEMENTED` (Option B:
   * Android native places no models).
   */
  getPlacedModels(): Promise<ARCorePlacedModel[]>;
  /**
   * Remove every placed model (API-03). Implemented on web and on
   * iOS native; on Android this rejects with code
   * `NOT_IMPLEMENTED`, like `getPlacedModels`.
   */
  clearModels(): Promise<void>;
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
// (ARCHITECTURE.md §2.4) is part of the verified surface. The
// engine's own entry point is `reticlexr/web` (PKG-03 exports map).
export { ARError, codedError } from './web.js';
export type {
  AnchorData,
  ARConfig,
  ARCoreWeb,
  ARErrorCode,
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
  PlacedModelInfo,
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
export type {
  PlacedModel,
  PlaneCounts,
  UseARCoreOptions,
  UseARCoreReturn,
} from './hooks.js';
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
