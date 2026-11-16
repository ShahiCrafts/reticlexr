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
}

export interface ARSupportResult {
  supported: boolean;
  reason: string;
  /** Machine-readable failure code, e.g. 'INSECURE_CONTEXT'. */
  code?: string;
}

export interface ARSessionOptions {
  planeDetection?: boolean;
  lightEstimation?: boolean;
  /**
   * Opt in to WebXR `camera-access` so `takeScreenshot()` can include
   * the camera feed (SEC-04). NOT implied by `lightEstimation`.
   */
  enableScreenshots?: boolean;
  domOverlay?: HTMLElement | null;
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
  error?: string;
}

export interface PlaceModelOptions {
  modelUrl?: string;
  /** Alias for `modelUrl`. */
  modelPath?: string;
  position?: Vector3Input;
  rotation?: RotationInput;
  scale?: ScaleInput;
}

export interface TransformModelOptions {
  anchorId: string;
  position?: Vector3Input;
  rotation?: RotationInput;
  scale?: ScaleInput;
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
      anchorId: string;
      modelUrl: string;
      position: Vector3Array;
      rotation: QuaternionArray;
      scale: Vector3Array;
    }
  | { type: 'modelRemoved'; anchorId: string }
  | {
      type: 'modelTransformed';
      anchorId: string;
      modelUrl: string;
      position: Vector3Array;
      rotation: QuaternionArray;
      scale: Vector3Array;
    }
  | { type: 'modelColorChanged'; anchorId: string; color: string }
  | { type: 'modelSwitched'; anchorId: string; modelUrl: string }
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

  hitTest(options?: HitTestOptions): Promise<HitTestResult>;
  hitTestAtPoint(x: number, y: number): Promise<HitTestResult>;

  getSurfaceState(): SurfaceDetectionState;
  getSurfaceDetectionState(): SurfaceState;
  getDetectedPlanes(): DetectedPlaneInfo[];
  setReticleVisible(visible: boolean): void;

  loadModel(modelUrl: string): Promise<THREE.Object3D>;
  placeModel(options: PlaceModelOptions): Promise<{ anchorId: string }>;
  removeModel(options: { anchorId: string }): Promise<void>;
  transformModel(options: TransformModelOptions): Promise<void>;
  switchModel(options: {
    anchorId: string;
    modelUrl: string;
    preserveMaterial?: boolean;
  }): Promise<{ anchorId: string; modelUrl: string }>;

  setModelColor(options: { anchorId: string; color: string }): Promise<void>;
  setModelMaterial(options: {
    anchorId: string;
    metalness?: number;
    roughness?: number;
    opacity?: number;
  }): Promise<void>;
  setModelTexture(options: {
    anchorId: string;
    textureUrl: string;
    materialName?: string;
  }): Promise<{ success: boolean; anchorId: string; textureUrl: string }>;

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

  setShadowVisible(anchorId: string, visible: boolean): void;
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
  getSession(): any;
  getAnchors(): Map<string, AnchorData>;
  getRenderer(): THREE.WebGLRenderer | null;
  getScene(): THREE.Scene | null;
  getCamera(): THREE.Camera | null;
}
