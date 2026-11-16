import * as THREE from 'three';
import { ARCoreWeb, SCALE_MIN, SCALE_MAX } from './web.js';
import { createARGestureController } from './gestures.js';

/** High-level, framework-agnostic AR facade. React/Vue/plain DOM can all use this. */
export class ARView {
  constructor(options = {}) {
    this.engine = options.engine || new ARCoreWeb();
    this.overlay = options.overlay || null;
    this.activeModelId = null;
    this.activeModelUrl = null;
    this.gestures = null;
    this.textures = new Map();
    this.transform = { scale: 1, rotationY: 0 };
  }

  async checkSupport() { return this.engine.checkSupport(); }

  async create(options = {}) {
    if (options.overlay) this.overlay = options.overlay;
    this.engine.setConfig({
      showReticle: options.showReticle !== false,
      showPlanes: false,
      showPlaneDots: options.showPlaneDots !== false,
      dotSpacing: options.dotSpacing ?? 0.14,
      dotSize: options.dotSize ?? 0.014,
      showShadow: options.showShadow !== false,
    });
    const result = await this.engine.startSession({
      domOverlay: this.overlay,
      planeDetection: options.planeDetection !== false,
      lightEstimation: options.lightEstimation !== false,
      // Opt-in: requests WebXR camera-access for takeScreenshot (SEC-04)
      enableScreenshots: options.enableScreenshots === true,
    });
    // Ensure groups reflect config immediately even if created before setConfig.
    if (this.engine.planesMeshGroup) this.engine.planesMeshGroup.visible = false;
    if (this.engine.planeDotsGroup) this.engine.planeDotsGroup.visible = options.showPlaneDots !== false;
    return result;
  }

  async destroy() {
    this.gestures?.destroy();
    this.gestures = null;
    await this.engine.stopSession();
  }

  /** Subscribe to engine frame events (surfaceDetected, modelPlaced, modelSwitched, sessionEnded, … — see the per-runtime event list in web.js, API-07). Returns an unsubscribe function. */
  onFrame(callback) { return this.engine.addFrameListener(callback); }
  /** Subscribe to engine plane events (planeAdded, planesUpdated — counts as numbers). Returns an unsubscribe function. */
  onPlanes(callback) { return this.engine.addPlaneListener(callback); }
  getSurface() { return this.engine.getSurfaceDetectionState(); }
  getPlanes() { return this.engine.getDetectedPlanes(); }
  setReticleVisible(visible) { this.engine.setReticleVisible(visible); }
  setSurfaceDotsVisible(visible) {
    this.engine.config.showPlaneDots = visible;
    if (this.engine.planeDotsGroup) this.engine.planeDotsGroup.visible = visible;
  }

  async preloadModels(urls = []) { await Promise.all(urls.map(url => this.engine.loadModel(url))); }

  /**
   * Place a model. Without an explicit `position`, hit-tests at the
   * normalised screen point `options.x`/`options.y` (default: centre).
   * `position`, `rotation` and `scale` accept the engine's shapes:
   * arrays, {x, y, z} objects, Euler-radians rotation objects, or a
   * uniform numeric scale — the engine normalises them (BUG-01).
   */
  async placeModel(modelUrl, options = {}) {
    const hit = options.position ? { hit: true, position: options.position, rotation: options.rotation } : await this.engine.hitTest({ x: options.x ?? .5, y: options.y ?? .5 });
    if (!hit.hit) return { success: false, reason: 'NO_SURFACE' };
    const scale = options.scale ?? this.transform.scale;
    const rotation = options.rotation || hit.rotation || [0,0,0,1];
    const result = await this.engine.placeModel({ modelUrl, position: hit.position, rotation, scale });
    this.activeModelId = result.anchorId;
    this.activeModelUrl = modelUrl;
    return { success: true, modelId: result.anchorId, ...result };
  }

  /** Replace the placed model without asking the user to place again. Position/rotation/scale are preserved. */
  async switchModel(modelUrl, options = {}) {
    if (!this.activeModelId) return this.placeModel(modelUrl, options);
    const result = await this.engine.switchModel({ anchorId: this.activeModelId, modelUrl, preserveMaterial: options.preserveMaterial !== false });
    this.activeModelUrl = modelUrl;
    return { success: true, modelId: this.activeModelId, ...result };
  }

  async removeModel() {
    if (!this.activeModelId) return;
    await this.engine.removeModel({ anchorId: this.activeModelId });
    this.activeModelId = null;
    this.activeModelUrl = null;
  }

  /**
   * Set the active model's uniform scale. Clamped to [SCALE_MIN,
   * SCALE_MAX] = [0.1, 5] — the one scale range shared by every layer
   * and runtime, defined in web.js (API-08).
   */
  async setScale(scale) {
    if (!this.activeModelId) return;
    const s = Math.max(SCALE_MIN, Math.min(SCALE_MAX, scale));
    await this.engine.transformModel({ anchorId: this.activeModelId, scale: [s,s,s] });
    // Commit local state only after the engine accepts it, so a failed
    // call cannot leave the facade's transform ahead of the scene (BUG-11)
    this.transform.scale = s;
  }

  async rotateBy(radians) {
    if (!this.activeModelId) return;
    const rotationY = this.transform.rotationY + radians;
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rotationY, 0)).toArray();
    await this.engine.transformModel({ anchorId: this.activeModelId, rotation: q });
    this.transform.rotationY = rotationY;
  }

  async setColor(color) {
    if (!this.activeModelId) return;
    await this.engine.setModelColor({ anchorId: this.activeModelId, color });
  }

  addTextures(textures) {
    Object.entries(textures || {}).forEach(([name, url]) => this.textures.set(name, url));
    return this;
  }

  async applyTexture(nameOrUrl, options = {}) {
    if (!this.activeModelId) throw new Error('Place a model before applying a texture');
    const url = this.textures.get(nameOrUrl) || nameOrUrl;
    return this.engine.setModelTexture({ anchorId: this.activeModelId, textureUrl: url, materialName: options.materialName });
  }

  enableCustomization(options = {}) {
    if (!this.overlay) throw new Error('createARView requires an overlay element before enabling gestures');
    this.gestures?.destroy();
    this.gestures = createARGestureController({
      element: this.overlay,
      onTap: async ({ x, y, event }) => {
        if (!this.activeModelId && options.modelUrl) {
          try {
            // modelUrl accepts a plain string or a () => string (BUG-05)
            const modelUrl = typeof options.modelUrl === 'function' ? options.modelUrl() : options.modelUrl;
            await this.placeModel(modelUrl, { x: x / innerWidth, y: y / innerHeight });
          } catch (error) {
            // The gesture controller never awaits this handler, so a
            // rejection here would be unhandled. Route placement failures
            // to the caller's error handler instead (BUG-05).
            if (options.onError) { options.onError(error); return; }
            console.error('[ARView] Tap-to-place failed:', error);
            return;
          }
        }
        options.onTap?.({ x, y, event });
      },
      onPinch: ({ factor }) => {
        if (!this.activeModelId) return;
        this.setScale(this.transform.scale * factor);
        options.onScale?.(this.transform.scale);
      },
      onRotate: ({ delta }) => {
        if (!this.activeModelId) return;
        this.rotateBy(-delta);
        options.onRotate?.(this.transform.rotationY);
      },
    });
    return () => { this.gestures?.destroy(); this.gestures = null; };
  }

  takeScreenshot(options = {}) { return this.engine.takeScreenshot(options); }
}

export function createARView(options = {}) { return new ARView(options); }

// Functional helpers for teams that prefer a small explicit API over class methods.
export const takeScreenshot = (view, options) => view.takeScreenshot(options);
export const enableCustomization = (view, options) => view.enableCustomization(options);
export const addTextures = (view, textures) => view.addTextures(textures);
export const switchModel = (view, modelUrl, options) => view.switchModel(modelUrl, options);
export const placeModel = (view, modelUrl, options) => view.placeModel(modelUrl, options);
