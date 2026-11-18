import * as THREE from 'three';
import { ARCoreWeb, SCALE_MIN, SCALE_MAX, codedError } from './web.js';
import { createARGestureController } from './gestures.js';

/** High-level, framework-agnostic AR facade. React/Vue/plain DOM can all use this. */
export class ARView {
  constructor(options = {}) {
    this.engine = options.engine || new ARCoreWeb();
    this.overlay = options.overlay || null;
    this.activeModelId = null;
    this.activeModelUrl = null;
    this._rectCache = null;
    this.debugEnabled = false;
    this.onDebug = null;
    this._lastDragDebugAt = 0;
    // Registry of every model placed through this view (API-03):
    // modelId -> modelUrl. placeModel can place more than the one
    // active model; without this they were unreachable orphans.
    this.placedModelUrls = new Map();
    this.gestures = null;
    this.textures = new Map();
    this.transform = { scale: 1, rotationY: 0 };
  }

  async checkSupport() { return this.engine.checkSupport(); }

  async create(options = {}) {
    if (options.overlay) this.overlay = options.overlay;
    this._rectCache = null;
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
      framebufferScale: options.framebufferScale,
    });
    // Ensure groups reflect config immediately even if created before setConfig.
    if (this.engine.planesMeshGroup) this.engine.planesMeshGroup.visible = false;
    if (this.engine.planeDotsGroup) this.engine.planeDotsGroup.visible = options.showPlaneDots !== false;
    return result;
  }

  async destroy() {
    this.gestures?.destroy();
    this.gestures = null;
    this.placedModelUrls.clear();
    this.activeModelId = null;
    this.activeModelUrl = null;
    // Full engine teardown (LEAK-03): ends the session AND releases
    // the renderer/GL context and model cache. The engine — and this
    // view, via create() — can be started again afterwards.
    await this.engine.dispose();
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
    const pointTest = !options.position && ((options.x ?? .5) !== .5 || (options.y ?? .5) !== .5);
    let hit = options.position ? { hit: true, position: options.position, rotation: options.rotation } : await this.engine.hitTest({ x: options.x ?? .5, y: options.y ?? .5 });
    if (!hit.hit && pointTest) {
      // The per-tap ray test can still miss on a good surface (its
      // one-off source races the runtime's raycast). Fall back to the
      // centre hit — the reticle path the render loop keeps warm —
      // before reporting no surface.
      hit = await this.engine.hitTest({ x: .5, y: .5 });
    }
    if (!hit.hit) return { success: false, code: 'NO_SURFACE', reason: 'NO_SURFACE' };
    const scale = options.scale ?? this.transform.scale;
    const rotation = options.rotation || hit.rotation || [0,0,0,1];
    const result = await this.engine.placeModel({ modelUrl, position: hit.position, rotation, scale });
    this.activeModelId = result.modelId;
    this.activeModelUrl = modelUrl;
    this.placedModelUrls.set(result.modelId, modelUrl);
    this._debugLog({
      type: 'placed',
      modelId: result.modelId,
      modelUrl,
      hit: hit.position,
      centre: this._debugCentre(result.modelId),
      baseCentre: this._debugBaseCentre(result.modelId),
    });
    return { success: true, modelId: result.modelId, ...result };
  }

  /** Replace the placed model without asking the user to place again. Position/rotation/scale are preserved. */
  async switchModel(modelUrl, options = {}) {
    if (!this.activeModelId) return this.placeModel(modelUrl, options);
    const result = await this.engine.switchModel({ modelId: this.activeModelId, modelUrl, preserveMaterial: options.preserveMaterial !== false });
    this.activeModelUrl = modelUrl;
    this.placedModelUrls.set(this.activeModelId, modelUrl);
    this._debugLog({
      type: 'switched',
      modelId: this.activeModelId,
      modelUrl,
      centre: this._debugCentre(this.activeModelId),
      baseCentre: this._debugBaseCentre(this.activeModelId),
    });
    return { success: true, modelId: this.activeModelId, ...result };
  }

  /**
   * Move the active model to the surface under a normalised screen
   * point ({ x, y } in 0..1, default centre). The model keeps its
   * scale and its current facing; only the position comes from the
   * hit (the hit's orientation is the surface plane's, not the
   * model's, and applying it twisted the model on every move). A miss
   * is a result, not a throw: { success: false, code: 'NO_SURFACE' }
   * and the model stays where it is.
   */
  async moveModel({ x = 0.5, y = 0.5 } = {}) {
    if (!this.activeModelId) return { success: false, code: 'NO_ACTIVE_MODEL', reason: 'NO_ACTIVE_MODEL' };
    const hit = await this.engine.moveModel({ modelId: this.activeModelId, x, y });
    if (!hit.hit) return { success: false, code: 'NO_SURFACE', reason: 'NO_SURFACE' };
    this._debugLog({
      type: 'moved',
      modelId: this.activeModelId,
      hit: hit.position,
      centre: this._debugCentre(this.activeModelId),
    });
    return { success: true, modelId: this.activeModelId, ...hit };
  }

  async removeModel() {
    if (!this.activeModelId) return;
    await this.engine.removeModel({ modelId: this.activeModelId });
    this.placedModelUrls.delete(this.activeModelId);
    this.activeModelId = null;
    this.activeModelUrl = null;
  }

  /**
   * List the models placed through this view (API-03), with their
   * current transforms — see the engine's `getPlacedModels`.
   */
  getPlacedModels() {
    return this.engine
      .getPlacedModels()
      .filter((m) => this.placedModelUrls.has(m.modelId));
  }

  /**
   * Remove every model placed through this view (API-03). Each
   * removal goes through the engine's removeModel, so disposal
   * follows the Phase 3 ownership rule.
   */
  async clearModels() {
    for (const modelId of Array.from(this.placedModelUrls.keys())) {
      await this.engine.removeModel({ modelId });
    }
    this.placedModelUrls.clear();
    this.activeModelId = null;
    this.activeModelUrl = null;
    this.transform = { scale: 1, rotationY: 0 };
  }

  /**
   * Set the active model's uniform scale. Clamped to [SCALE_MIN,
   * SCALE_MAX] = [0.1, 5] — the one scale range shared by every layer
   * and runtime, defined in web.js (API-08).
   */
  async setScale(scale) {
    if (!this.activeModelId) return;
    const s = Math.max(SCALE_MIN, Math.min(SCALE_MAX, scale));
    const previous = this.transform.scale;
    // Commit BEFORE awaiting the engine. Gesture handlers compose the
    // next increment from this.transform at pointer-event rate; when
    // the commit waited for the engine, in-flight events composed from
    // the same stale value and increments were lost or replayed —
    // a visible pinch judder. On engine failure the previous value is
    // restored, so BUG-11's guarantee (a failed call never leaves the
    // facade's transform ahead of the scene) still holds.
    this.transform.scale = s;
    try {
      await this.engine.transformModel({ modelId: this.activeModelId, scale: [s,s,s] });
    } catch (error) {
      this.transform.scale = previous;
      throw error;
    }
  }

  async rotateBy(radians) {
    if (!this.activeModelId) return;
    const previous = this.transform.rotationY;
    const rotationY = previous + radians;
    this.transform.rotationY = rotationY;
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rotationY, 0)).toArray();
    try {
      await this.engine.transformModel({ modelId: this.activeModelId, rotation: q });
    } catch (error) {
      this.transform.rotationY = previous;
      throw error;
    }
  }

  async setColor(color) {
    if (!this.activeModelId) return;
    await this.engine.setModelColor({ modelId: this.activeModelId, color });
  }

  addTextures(textures) {
    Object.entries(textures || {}).forEach(([name, url]) => this.textures.set(name, url));
    return this;
  }

  async applyTexture(nameOrUrl, options = {}) {
    if (!this.activeModelId) throw codedError('NO_ACTIVE_MODEL', 'Place a model before applying a texture');
    const url = this.textures.get(nameOrUrl) || nameOrUrl;
    return this.engine.setModelTexture({ modelId: this.activeModelId, textureUrl: url, materialName: options.materialName });
  }

  /**
   * Map overlay pixel coordinates to normalised [0, 1] using the
   * overlay element's OWN bounding rect, not the window size. In a
   * DOM-overlay session the element is presented fullscreen, but if
   * its rect ever differs from the window (insets, embedding, a
   * resized root), window-based mapping displaces every tap and
   * drag by exactly that difference. The rect is cached briefly
   * (it is constant during a gesture) and the mapping falls back
   * to the window size when the element cannot be measured.
   */
  /**
   * Debug readout support (enableCustomization's `debug` option).
   * Entries describe each step of an interaction: the tapped
   * pixel and its normalised point, the hit coordinate the
   * runtime returned, the model's measured base centre, and where
   * the model's centre actually lies afterwards, so placement
   * accuracy can be verified on-device, where no console is
   * visible. Entries also go to console.log under '[ARView]'.
   */
  _debugLog(entry) {
    if (!this.debugEnabled) return;
    try { console.log('[ARView]', entry.type, entry); } catch { /* noop */ }
    if (this.onDebug) {
      try { this.onDebug(entry); } catch { /* a consumer's logger must not break AR */ }
    }
  }

  _debugCentre(modelId) {
    const p = this.engine?.anchors?.get?.(modelId)?.position;
    if (!p) return null;
    return Array.isArray(p) ? { x: p[0], y: p[1], z: p[2] } : { x: p.x, y: p.y, z: p.z };
  }

  _debugBaseCentre(modelId) {
    const inner = this.engine?.loadedModels?.get?.(modelId)?.children?.[0];
    if (!inner?.position) return null;
    return { x: -inner.position.x, y: -inner.position.y, z: -inner.position.z };
  }

  _normalisePoint(clientX, clientY) {
    const now = performance.now();
    if (!this._rectCache || now - this._rectCache.time > 250) {
      let rect = null;
      try {
        rect = this.overlay?.getBoundingClientRect?.() || null;
      } catch { /* detached element */ }
      this._rectCache = { rect, time: now };
    }
    const rect = this._rectCache.rect;
    if (rect && rect.width > 0 && rect.height > 0) {
      return {
        x: (clientX - rect.left) / rect.width,
        y: (clientY - rect.top) / rect.height,
      };
    }
    return { x: clientX / innerWidth, y: clientY / innerHeight };
  }

  enableCustomization(options = {}) {
    if (!this.overlay) throw codedError('OVERLAY_REQUIRED', 'createARView requires an overlay element before enabling gestures');
    this.gestures?.destroy();
    this.debugEnabled = options.debug === true;
    this.onDebug = typeof options.onDebug === 'function' ? options.onDebug : null;
    let dragSession = false;
    const endDragSession = (point) => {
      if (!dragSession) return;
      dragSession = false;
      try { this.engine.endDragMove?.(); } catch { /* engine gone */ }
      // Land exactly on the release point with one precise hit
      // test; a miss is silent (the model keeps its last dragged
      // position).
      if (this.activeModelId && point) {
        this.moveModel(point).catch(() => {});
      }
    };
    this.gestures = createARGestureController({
      element: this.overlay,
      // The gesture payload is {x, y} in pixels (see gestures.js); it
      // has never carried an `event` field (API-06 drift).
      onTap: async ({ x, y }) => {
        const point = this._normalisePoint(x, y);
        this._debugLog({ type: 'tap', pixel: { x, y }, normalised: point });
        try {
          if (!this.activeModelId && options.modelUrl) {
            // modelUrl accepts a plain string or a () => string (BUG-05)
            const modelUrl = typeof options.modelUrl === 'function' ? options.modelUrl() : options.modelUrl;
            const result = await this.placeModel(modelUrl, point);
            // placeModel reports a missed hit test as a result, not a
            // throw — convert it, so the failure reaches onError
            // instead of the tap silently doing nothing.
            if (!result.success) throw codedError('NO_SURFACE', 'No surface found at the tap point');
          } else if (this.activeModelId) {
            // Tap-to-move: with a model placed, a tap relocates it to
            // the tapped surface point (the engine's moveModel). A
            // miss converts to NO_SURFACE the same way and the model
            // stays where it is.
            const result = await this.moveModel(point);
            if (!result.success) throw codedError('NO_SURFACE', 'No surface found at the tap point');
          }
        } catch (error) {
          // The gesture controller never awaits this handler, so a
          // rejection here would be unhandled. Route tap failures to
          // the caller's error handler instead (BUG-05).
          if (options.onError) { options.onError(error); return; }
          console.error('[ARView] Tap failed:', error);
          return;
        }
        options.onTap?.({ x, y });
      },
      onDrag: ({ x, y }) => {
        if (this.activeModelId) {
          if (!dragSession) {
            dragSession = true;
            try { this.engine.beginDragMove?.(this.activeModelId); } catch { /* engine gone */ }
          }
          try {
            const p = this._normalisePoint(x, y);
            this.engine.updateDragPoint?.(p.x, p.y);
            const now = performance.now();
            if (now - this._lastDragDebugAt > 250) {
              this._lastDragDebugAt = now;
              this._debugLog({ type: 'drag', normalised: p, centre: this._debugCentre(this.activeModelId) });
            }
          } catch { /* engine gone */ }
        }
        options.onDrag?.({ x, y });
      },
      onDragEnd: ({ x, y }) => {
        const point = this._normalisePoint(x, y);
        this._debugLog({ type: 'dragend', pixel: { x, y }, normalised: point });
        endDragSession(point);
        options.onDragEnd?.({ x, y });
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
    // Debug projection feed: the engine reports where each placed
    // model's centre falls on screen (same debug channel, 'proj'
    // entries), so a consumer can draw it next to the tap point.
    if (this.engine) {
      this.engine.onDebugProject = this.debugEnabled
        ? (p) => this._debugLog({ type: 'proj', modelId: p.modelId, normalised: p.normalised })
        : null;
    }
    return () => {
      this.gestures?.destroy();
      this.gestures = null;
      if (this.engine) this.engine.onDebugProject = null;
    };
  }

  takeScreenshot(options = {}) { return this.engine.takeScreenshot(options); }
}

export function createARView(options = {}) { return new ARView(options); }

// Functional helpers for teams that prefer a small explicit API over class methods.
export const takeScreenshot = (view, options) => view.takeScreenshot(options);
export const enableCustomization = (view, options) => view.enableCustomization(options);
export const addTextures = (view, textures) => view.addTextures(textures);
export const switchModel = (view, modelUrl, options) => view.switchModel(modelUrl, options);
export const moveModel = (view, point) => view.moveModel(point);
export const placeModel = (view, modelUrl, options) => view.placeModel(modelUrl, options);
