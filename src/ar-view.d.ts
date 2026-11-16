/**
 * Type declarations for the high-level AR facade (`src/ar-view.js`).
 * Framework-agnostic: React, Vue and plain DOM apps can all use this.
 */
import {
  ARCoreWeb,
  ARSessionResult,
  ARSupportResult,
  DetectedPlaneInfo,
  EngineFrameEvent,
  EnginePlaneEvent,
  PlacedModelInfo,
  RotationInput,
  ScaleInput,
  ScreenshotOptions,
  ScreenshotResult,
  SurfaceState,
  Vector3Input,
} from './web.js';

export interface ARViewOptions {
  /** Engine instance to use; a new `ARCoreWeb` is created by default. */
  engine?: ARCoreWeb;
  overlay?: HTMLElement | null;
}

export interface ARViewCreateOptions {
  overlay?: HTMLElement;
  showReticle?: boolean;
  showPlaneDots?: boolean;
  dotSpacing?: number;
  dotSize?: number;
  showShadow?: boolean;
  planeDetection?: boolean;
  lightEstimation?: boolean;
  /**
   * Opt in to WebXR `camera-access` for `takeScreenshot()` (SEC-04).
   * NOT implied by `lightEstimation`.
   */
  enableScreenshots?: boolean;
}

export interface ARViewPlaceModelOptions {
  /** Explicit world position; skips the hit test when provided. */
  position?: Vector3Input;
  rotation?: RotationInput;
  scale?: ScaleInput;
  /** Normalised hit-test X [0, 1] when no position is given. */
  x?: number;
  /** Normalised hit-test Y [0, 1] when no position is given. */
  y?: number;
}

export interface ARViewPlaceResult {
  success: boolean;
  /** Canonical model identifier (API-01). */
  modelId?: string;
  /** Deprecated alias for `modelId` — the same string. */
  anchorId?: string;
  /** Present on `switchModel` results. */
  modelUrl?: string;
  /** Failure reason, e.g. 'NO_SURFACE'. */
  reason?: string;
}

export interface CustomizationOptions {
  /** Model to place on tap: a URL string or a () => string. */
  modelUrl: string | (() => string);
  /** Called after the tap has been handled (and after placement). */
  onTap?: (point: { x: number; y: number }) => void;
  onScale?: (scale: number) => void;
  onRotate?: (rotationY: number) => void;
  /** Receives placement errors from tap-to-place (BUG-05). */
  onError?: (error: Error) => void;
}

export declare class ARView {
  constructor(options?: ARViewOptions);

  engine: ARCoreWeb;
  overlay: HTMLElement | null;
  activeModelId: string | null;
  activeModelUrl: string | null;
  /** Registry of models placed through this view (API-03): modelId → modelUrl. */
  placedModelUrls: Map<string, string>;
  /** Local transform state: committed only after the engine accepts
   *  a change (BUG-11). */
  transform: { scale: number; rotationY: number };
  textures: Map<string, string>;

  checkSupport(): Promise<ARSupportResult>;
  create(options?: ARViewCreateOptions): Promise<ARSessionResult>;
  destroy(): Promise<void>;

  /** Subscribe to engine frame events (API-07). Returns unsubscribe. */
  onFrame(callback: (event: EngineFrameEvent) => void): () => void;
  /** Subscribe to engine plane events (API-07). Returns unsubscribe. */
  onPlanes(callback: (event: EnginePlaneEvent) => void): () => void;
  getSurface(): SurfaceState;
  getPlanes(): DetectedPlaneInfo[];
  setReticleVisible(visible: boolean): void;
  setSurfaceDotsVisible(visible: boolean): void;

  preloadModels(urls?: string[]): Promise<void>;
  placeModel(
    modelUrl: string,
    options?: ARViewPlaceModelOptions
  ): Promise<ARViewPlaceResult>;
  switchModel(
    modelUrl: string,
    options?: { preserveMaterial?: boolean }
  ): Promise<ARViewPlaceResult>;
  removeModel(): Promise<void>;
  /** List the models placed through this view (API-03). */
  getPlacedModels(): PlacedModelInfo[];
  /**
   * Remove every model placed through this view (API-03); disposal
   * follows the Phase 3 ownership rule.
   */
  clearModels(): Promise<void>;

  /** Uniform scale, clamped to [0.1, 5] (API-08). */
  setScale(scale: number): Promise<void>;
  rotateBy(radians: number): Promise<void>;
  setColor(color: string): Promise<void>;

  addTextures(textures: Record<string, string>): this;
  applyTexture(
    nameOrUrl: string,
    options?: { materialName?: string }
  ): Promise<{ success: boolean; anchorId: string; textureUrl: string }>;

  /**
   * Wire tap-to-place / pinch / rotate gestures on the overlay.
   * Requires an overlay (throws otherwise). Returns a cleanup function.
   */
  enableCustomization(options?: CustomizationOptions): () => void;

  takeScreenshot(options?: ScreenshotOptions): Promise<ScreenshotResult>;
}

export declare function createARView(options?: ARViewOptions): ARView;

// Functional helpers (view-first equivalents of the methods above).
export declare function takeScreenshot(
  view: ARView,
  options?: ScreenshotOptions
): Promise<ScreenshotResult>;
export declare function enableCustomization(
  view: ARView,
  options?: CustomizationOptions
): () => void;
export declare function addTextures(
  view: ARView,
  textures: Record<string, string>
): ARView;
export declare function switchModel(
  view: ARView,
  modelUrl: string,
  options?: { preserveMaterial?: boolean }
): Promise<ARViewPlaceResult>;
export declare function placeModel(
  view: ARView,
  modelUrl: string,
  options?: ARViewPlaceModelOptions
): Promise<ARViewPlaceResult>;
