/**
 * Type declarations for the React hook (`src/hooks.js`).
 * The hook wraps a module-level singleton engine and mirrors its
 * state into React state.
 */
import type * as THREE from 'three';
import {
  ARConfig,
  ARSessionOptions,
  DetectedPlaneInfo,
  HitTestResult,
  QuaternionArray,
  RotationInput,
  ScaleInput,
  ScreenshotOptions,
  ScreenshotResult,
  ShadowConfig,
  SurfaceState,
  Vector3Array,
  Vector3Input,
} from './web.js';

export interface PlacedModel {
  anchorId: string;
  modelUrl: string;
  position: Vector3Array;
  rotation: QuaternionArray;
  scale: Vector3Array;
}

export interface PlaneCounts {
  horizontal: number;
  vertical: number;
  total: number;
}

/** Transform fields accepted by the hook's `transformModel`. */
export interface ModelTransforms {
  position?: Vector3Input;
  rotation?: RotationInput;
  scale?: ScaleInput;
}

export interface UseARCoreReturn {
  // State
  /** null while the support check is still running. */
  isSupported: boolean | null;
  isSessionActive: boolean;
  placedModels: PlacedModel[];
  error: string | null;
  detectedPlanes: PlaneCounts;
  surfaceState: SurfaceState;

  // Session management
  startSession: (options?: ARSessionOptions) => Promise<boolean>;
  stopSession: () => Promise<void>;

  // AR operations. `x`/`y` are normalised [0, 1], origin top-left —
  // NOT pixels (divide by the view size first).
  hitTest: (x: number, y: number) => Promise<HitTestResult>;
  placeModel: (
    modelUrl: string,
    position?: Vector3Input,
    rotation?: RotationInput,
    scale?: ScaleInput
  ) => Promise<{ anchorId: string } | { error: string }>;
  removeModel: (anchorId: string) => Promise<void>;
  transformModel: (
    anchorId: string,
    transforms: ModelTransforms
  ) => Promise<void>;

  // Customization
  setModelColor: (anchorId: string, color: string) => Promise<void>;
  setModelMaterial: (
    anchorId: string,
    properties: {
      metalness?: number;
      roughness?: number;
      opacity?: number;
    }
  ) => Promise<void>;

  // Configuration
  setConfig: (config: Partial<ARConfig>) => void;
  getConfig: () => ARConfig;

  // Shadow controls
  setShadowConfig: (config: Partial<ShadowConfig>) => void;
  getShadowConfig: () => ShadowConfig;
  setShadowVisible: (anchorId: string, visible: boolean) => void;

  // Plane detection & visualization
  getDetectedPlanes: () => DetectedPlaneInfo[];
  setReticleVisible: (visible: boolean) => void;
  setPlaneVisualization: (visible: boolean) => void;

  // Utilities
  clearError: () => void;

  // Three.js accessors (advanced)
  getRenderer: () => THREE.WebGLRenderer | null;
  getScene: () => THREE.Scene | null;
  getCamera: () => THREE.Camera | null;

  // Screenshot
  takeScreenshot: (options?: ScreenshotOptions) => Promise<ScreenshotResult>;
}

export declare function useARCore(): UseARCoreReturn;
