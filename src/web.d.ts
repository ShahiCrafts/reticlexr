/**
 * Type declarations for the WebXR engine (`src/web.js`).
 *
 * Hand-written against the verified surface in ARCHITECTURE.md §2.4
 * (API-06 / PKG-02). The JSDoc in the implementation is kept honest by
 * `npm run check-types` (tsc --checkJs); these declarations are the
 * consumer-facing contract.
 *
 * Transform inputs are normalised at the engine boundary (BUG-01):
 * positions accept `[x, y, z]` or `{x, y, z}`, rotations accept a
 * quaternion array/object or Euler radians, scales accept a number,
 * `[x, y, z]` or `{x, y, z}`. Scales are clamped to [0.1, 5] per axis
 * (API-08).
 */
import type * as THREE from 'three';
import { WebPlugin } from '@capacitor/core';

/** [x, y, z] vector as a plain array. */
export type Vector3Array = [number, number, number];
/** Quaternion [x, y, z, w] as a plain array. */
export type QuaternionArray = [number, number, number, number];
/** A 3D point with named components. */
export interface Vector3Object {
  x: number;
  y: number;
  z: number;
}
/** A 3D vector in any accepted input shape (BUG-01). */
export type Vector3Input = Vector3Array | Vector3Object;
/** Euler rotation in RADIANS; omitted axes default to 0. */
export interface EulerRotationInput {
  x?: number;
  y?: number;
  z?: number;
}
/** A rotation in any accepted input shape (BUG-01). */
export type RotationInput =
  | QuaternionArray
  | { x: number; y: number; z: number; w: number }
  | EulerRotationInput;
/** A scale in any accepted input shape (BUG-01). */
export type ScaleInput = number | Vector3Array | Vector3Object;

export declare function normalizeVector3(
  value: unknown,
  fallback?: Vector3Array
): Vector3Array | undefined;
export declare function normalizeQuaternion(
  value: unknown,
  fallback?: QuaternionArray
): QuaternionArray | undefined;
export declare function normalizeScale(
  value: unknown,
  fallback?: Vector3Array
): Vector3Array | undefined;

/** Minimum model scale (API-08). */
export declare const SCALE_MIN: number;
/** Maximum model scale (API-08). */
export declare const SCALE_MAX: number;
export declare function clampScale(scale: Vector3Array): Vector3Array;

/** Stable machine-readable error codes used across the package (API-05). */
export type ARErrorCode =
  | 'SESSION_START_FAILED'
  | 'SESSION_NOT_ACTIVE'
  | 'SESSION_ENDED'
  | 'HIT_TEST_FAILED'
  | 'HIT_TEST_TIMEOUT'
  | 'HIT_TEST_UNAVAILABLE'
  | 'NO_VIEWER_POSE'
  | 'MODEL_NOT_FOUND'
  | 'MODEL_URL_REQUIRED'
  | 'MODEL_LOAD_FAILED'
  | 'NO_SURFACE'
  | 'NO_ACTIVE_MODEL'
  | 'OVERLAY_REQUIRED'
  | 'CAMERA_CAPTURE_UNAVAILABLE'
  | 'CAPTURE_BUSY'
  | 'INSECURE_CONTEXT'
  | (string & {});

/**
 * The one error type thrown by reticlexr's public APIs (API-05):
 * an `Error` with a stable, machine-readable `code`. Result-object
 * APIs (hitTest, takeScreenshot) resolve with the same `code` on
 * their failure results instead of rejecting.
 */
export declare class ARError extends Error {
  code: string;
  constructor(code: string, message: string);
}

/** Build an {@link ARError} (API-05). */
export declare function codedError(code: string, message: string): ARError;

export declare function rayFromScreenPoint(
  viewerTransform: {
    position: { x: number; y: number; z: number };
    orientation: { x: number; y: number; z: number; w: number };
  },
  projectionMatrix: ArrayLike<number>,
  x: number,
  y: number
): {
  origin: { x: number; y: number; z: number };
  direction: { x: number; y: number; z: number };
};

export declare function intersectRayPlane(
  ray: {
    origin: { x: number; y: number; z: number };
    direction: { x: number; y: number; z: number };
  },
  planePoint: [number, number, number],
  planeNormal: [number, number, number]
): [number, number, number] | null;

/**
 * Single-axis critically damped spring (exact closed-form
 * integration) — the drag pipeline's smoothing primitive.
 */
export declare class Damper {
  constructor(decayMs?: number, maxVelocity?: number);
  readonly velocity: number;
  reset(): void;
  update(x: number, goal: number, dt: number): number;
}

/** Engine visual configuration (see `setConfig`). */
export interface ARConfig {
  showReticle: boolean;
  showPlanes: boolean;
  showPlaneDots: boolean;
  showShadow: boolean;
  showBaseRing: boolean;
  reticleColor: number;
  reticleColorVertical: number;
  planeColorHorizontal: number;
  planeColorVertical: number;
  shadowOpacity: number;
  shadowSize: number;
  dotSize: number;
  dotSpacing: number;
  /** Engine diagnostic logging (PERF-06). Default false. */
  debug: boolean;
  /**
   * Model-cache cap (LEAK-04): maximum number of loaded GLTFs kept,
   * least-recently-used evicted first. Entries with live placements
   * are never evicted. Default 20; `Infinity` or 0 disables the cap.
   */
  modelCacheLimit: number;
}

export interface ARSupportResult {
  supported: boolean;
  reason: string;
  /** Machine-readable failure code, e.g. 'INSECURE_CONTEXT'. */
  code?: string;
}

export interface ARSessionOptions {
  /**
   * Tier 0 posture (default): all three of planeDetection,
   * lightEstimation and anchors are OFF unless explicitly
   * opted in — the session requests hit-test only, the
   * model-viewer-class configuration.
   */
  planeDetection?: boolean;
  lightEstimation?: boolean;
  /**
   * Tier 2 opt-in: request the WebXR `anchors` feature (one
   * anchor minted from the final hit result when a drag ends).
   * Default false: the `local` reference space already absorbs
   * the runtime's world-model corrections.
   */
  anchors?: boolean;
  /**
   * Opt in to WebXR `camera-access` so `takeScreenshot()` can include
   * the camera feed (SEC-04). NOT implied by `lightEstimation`.
   */
  enableScreenshots?: boolean;
  domOverlay?: HTMLElement | null;
  /**
   * XR render scale (0..1], default 1. Fragment work scales with
   * its square (0.85 ≈ 28% fewer fragments); the single biggest
   * smoothness/battery lever on mid-range phones. Applied before
   * the session's base layer is created.
   */
  framebufferScale?: number;
  /**
   * Path to a self-hosted Basis transcoder directory (the
   * basis_transcoder.js / .wasm pair), enabling KTX2-compressed
   * model textures. Meshopt-compressed geometry needs no
   * configuration. Default: null (KTX2 textures unsupported).
   */
  ktx2TranscoderPath?: string | null;
}

export interface ARSessionResult {
  success: boolean;
  hasOverlay: boolean;
  planeDetection: boolean;
}

export interface HitTestOptions {
  /** Normalised X [0, 1], origin top-left. Default 0.5 (centre). */
  x?: number;
  /** Normalised Y [0, 1], origin top-left. Default 0.5 (centre). */
  y?: number;
}

export interface HitTestResult {
  hit: boolean;
  position?: Vector3Array;
  rotation?: QuaternionArray;
  planeType?: string;
  /** Stable failure code when `hit` is false (API-05). */
  code?: string;
  error?: string;
}

export interface PlaceModelOptions {
  modelUrl?: string;
  /** Deprecated alias for `modelUrl` (API-01). */
  modelPath?: string;
  position?: Vector3Input;
  rotation?: RotationInput;
  scale?: ScaleInput;
}

export interface TransformModelOptions {
  /** Canonical model identifier (API-01). */
  modelId?: string;
  /** Deprecated alias for `modelId` — the same string. */
  anchorId?: string;
  position?: Vector3Input;
  rotation?: RotationInput;
  scale?: ScaleInput;
}

/** One placed model, as returned by `getPlacedModels` (API-03). */
export interface PlacedModelInfo {
  /** Canonical model identifier (API-01). */
  modelId: string;
  /** Deprecated alias for `modelId` — the same string. */
  anchorId: string;
  modelUrl: string;
  position: Vector3Array;
  rotation: QuaternionArray;
  scale: Vector3Array;
}

/** Stored transform state for one placed model. */
export interface AnchorData {
  modelUrl: string;
  position: Vector3Array;
  rotation: QuaternionArray;
  scale: Vector3Array;
}

export interface SurfaceState {
  hasSurface: boolean;
  position: Vector3Array | null;
  rotation: QuaternionArray | null;
  planeType: string | null;
  confidence: number;
}

export interface SurfaceDetectionState {
  detected: boolean;
  hasSurface: boolean;
  position: Vector3Array | null;
  rotation: QuaternionArray | null;
  planeType: string | null;
  planesCount: number;
}

export interface DetectedPlaneInfo {
  orientation: string;
  polygon: Array<{ x: number; y: number; z: number }>;
}

export interface ShadowConfig {
  enabled: boolean;
  opacity: number;
  size: number;
}

export interface ScreenshotOptions {
  format?: 'png' | 'jpeg';
  quality?: number;
  width?: number;
  height?: number;
  includeReticle?: boolean;
}

export type ScreenshotResult =
  | {
      success: true;
      dataUrl: string;
      width: number;
      height: number;
      timestamp: string;
      includesCamera: boolean;
    }
  | { success: false; code?: string; error: string };

/**
 * Frame-listener events emitted by the WebXR engine (API-07). These
 * are the WEB runtime's events — the native facade's `ARCore.on` list
 * is a different, per-runtime set (see index.d.ts).
 */
export type EngineFrameEvent =
  | {
      type: 'surfaceDetected';
      hasSurface: true;
      position: Vector3Array;
      rotation: QuaternionArray;
      planeType: string;
      confidence: number;
    }
  | { type: 'surfaceLost'; hasSurface: false }
  | {
      type: 'modelPlaced';
      /** Canonical identifier (API-01). */
      modelId: string;
      /** Deprecated alias for `modelId` — the same string. */
      anchorId: string;
      modelUrl: string;
      position: Vector3Array;
      rotation: QuaternionArray;
      scale: Vector3Array;
    }
  | {
      type: 'modelRemoved';
      modelId: string;
      /** Deprecated alias for `modelId`. */
      anchorId: string;
    }
  | {
      type: 'modelTransformed';
      modelId: string;
      /** Deprecated alias for `modelId`. */
      anchorId: string;
      modelUrl: string;
      position: Vector3Array;
      rotation: QuaternionArray;
      scale: Vector3Array;
    }
  | {
      type: 'modelColorChanged';
      modelId: string;
      /** Deprecated alias for `modelId`. */
      anchorId: string;
      color: string;
    }
  | {
      type: 'modelSwitched';
      modelId: string;
      /** Deprecated alias for `modelId`. */
      anchorId: string;
      modelUrl: string;
    }
  | { type: 'sessionEnded' };

/** Plane-listener events emitted by the WebXR engine (API-07). */
export type EnginePlaneEvent =
  | {
      type: 'planeAdded';
      orientation: string;
      polygon: Array<{ x: number; y: number; z: number }>;
    }
  | {
      type: 'planesUpdated';
      /** Plane counts are NUMBERS, not arrays. */
      total: number;
      horizontal: number;
      vertical: number;
    };

export declare class ARCoreWeb extends WebPlugin {
  constructor();

  /** Current visual configuration (mutated via `setConfig`). */
  config: ARConfig;

  setConfig(options?: Partial<ARConfig>): void;
  getConfig(): ARConfig;

  checkSupport(): Promise<ARSupportResult>;
  startSession(options?: ARSessionOptions): Promise<ARSessionResult>;
  stopSession(): Promise<void>;
  /**
   * Full engine teardown (LEAK-03): ends any session, disposes the
   * scene's per-instance resources, the model cache and the WebGL
   * renderer/context, and nulls the renderer/scene/camera fields so
   * the same engine instance can be started again. Idempotent.
   */
  dispose(): Promise<void>;
  /**
   * Empty the GLTF model cache, disposing every cached model's GPU
   * resources (LEAK-04). Placed models keep working — disposal only
   * releases GPU memory and three.js re-uploads on next render.
   */
  clearModelCache(): void;

  hitTest(options?: HitTestOptions): Promise<HitTestResult>;
  hitTestAtPoint(x: number, y: number): Promise<HitTestResult>;
  beginDragMove(modelId: string): boolean;
  updateDragPoint(x: number, y: number): void;
  endDragMove(): void;

  getSurfaceState(): SurfaceDetectionState;
  getSurfaceDetectionState(): SurfaceState;
  getDetectedPlanes(): DetectedPlaneInfo[];
  setReticleVisible(visible: boolean): void;

  loadModel(modelUrl: string): Promise<THREE.Object3D>;
  /**
   * Place a model. Resolves with the canonical `modelId` (API-01);
   * `anchorId` is its deprecated alias — the same string.
   */
  placeModel(
    options: PlaceModelOptions
  ): Promise<{ modelId: string; anchorId: string }>;
  removeModel(options: {
    modelId?: string;
    /** Deprecated alias for `modelId`. */
    anchorId?: string;
  }): Promise<void>;
  /** List the currently placed models (API-03). */
  getPlacedModels(): PlacedModelInfo[];
  /**
   * Remove every placed model (API-03). Disposal follows the
   * ownership rule: per-instance resources are disposed, the model
   * cache survives.
   */
  clearModels(): Promise<void>;
  transformModel(options: TransformModelOptions): Promise<void>;
  switchModel(options: {
    modelId?: string;
    /** Deprecated alias for `modelId`. */
    anchorId?: string;
    modelUrl: string;
    /**
     * Carry the old model's materials onto the new one (BUG-09):
     * each new material inherits colour — and map, when present —
     * from its counterpart on the old model, matched by material
     * name first, then by traversal order. Materials without a
     * counterpart keep their own look. Default true.
     */
    preserveMaterial?: boolean;
  }): Promise<{ modelId: string; anchorId: string; modelUrl: string }>;

  setModelColor(options: {
    modelId?: string;
    /** Deprecated alias for `modelId`. */
    anchorId?: string;
    color: string;
  }): Promise<void>;
  setModelMaterial(options: {
    modelId?: string;
    /** Deprecated alias for `modelId`. */
    anchorId?: string;
    metalness?: number;
    roughness?: number;
    opacity?: number;
  }): Promise<void>;
  setModelTexture(options: {
    modelId?: string;
    /** Deprecated alias for `modelId`. */
    anchorId?: string;
    textureUrl: string;
    materialName?: string;
  }): Promise<{
    success: boolean;
    modelId: string;
    anchorId: string;
    textureUrl: string;
  }>;

  /**
   * Capacitor-facade compatibility shim. Note the facade convention:
   * a plain `{x, y, z}` rotation here is Euler DEGREES (the native
   * API's form); quaternion shapes pass through unchanged.
   */
  setTransform(options: {
    modelId?: string;
    anchorId?: string;
    position?: Vector3Input;
    rotation?: RotationInput;
    scale?: ScaleInput;
  }): Promise<void>;
  setMaterial(options: {
    modelId?: string;
    anchorId?: string;
    color?: string;
    metalness?: number;
    roughness?: number;
    opacity?: number;
  }): Promise<{ success: boolean }>;
  moveModel(options: {
    modelId?: string;
    anchorId?: string;
    x?: number;
    y?: number;
  }): Promise<HitTestResult & { success?: boolean }>;

  setShadowVisible(modelId: string, visible: boolean): void;
  setShadowConfig(config?: Partial<ShadowConfig>): void;
  getShadowConfig(): ShadowConfig;

  takeScreenshot(options?: ScreenshotOptions): Promise<ScreenshotResult>;

  setPlaneVisualization(visible: boolean): void;
  isPlaneVisualizationEnabled(): boolean;

  addFrameListener(
    callback: (event: EngineFrameEvent) => void
  ): () => void;
  addPlaneListener(
    callback: (event: EnginePlaneEvent) => void
  ): () => void;

  /** The live XRSession, or null when no session is running. */
  getSession(): XRSession | null;
  getAnchors(): Map<string, AnchorData>;
  getRenderer(): THREE.WebGLRenderer | null;
  getScene(): THREE.Scene | null;
  getCamera(): THREE.Camera | null;
}
