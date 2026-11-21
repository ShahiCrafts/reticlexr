/**
 * Capacitor ARCore Plugin - Native AR Foundation
 *
 * Provides access to native Android ARCore capabilities from JavaScript.
 *
 * Architecture:
 * - Single authoritative frame loop (ARRenderer)
 * - ARCore session lifecycle management (ARSessionManager)
 * - Surface/plane detection (ARSurfaceManager)
 * - Hit testing and coordinate mapping (ARCoordinateMapper)
 * - Model management (ARModelManager, ARAnchorManager)
 * - Event emission (AREventEmitter)
 *
 * Public API:
 * - Session: startSession, stopSession, checkSupport
 * - Hit Testing: hitTest
 * - Model Placement: placeModel, removeModel, getPlacedModels, clearModels
 * - Model Transforms: setTransform
 * - Model Material: setMaterial
 * - Model Movement: moveModel
 * - Events: on, addListener
 *
 * @module reticlexr
 */

import { registerPlugin } from '@capacitor/core';

// One error convention (API-05): facade failures reject with an
// Error carrying a stable `code`. A code arriving from the runtime
// (the WebXR engine's ARError codes, Capacitor's own codes) is
// preserved; otherwise the per-method fallback applies. Messages
// keep their historical 'Failed to …: <cause>' shape.
function facadeError(prefix, e, fallbackCode) {
  const err = /** @type {Error & { code?: string }} */ (
    new Error(prefix + (e && e.message ? e.message : String(e)))
  );
  err.code = (e && typeof e.code === 'string' && e.code) || fallbackCode;
  return err;
}

// Event emitter for native events
const eventListeners = {};

/**
 * Register the native ARCore plugin with Capacitor.
 * This creates the JavaScript proxy that bridges to ARCorePlugin.java
 */
const ARCoreNative = registerPlugin('ARCore', {
  web: () => import('./web.js').then(m => new m.ARCoreWeb()),
});

/**
 * ARCore - Main public API for native AR
 *
 * @namespace ARCore
 */
export const ARCore = {
  /**
   * Start an AR session.
   *
   * @param {Object} options - Session configuration
   * @param {boolean} [options.planeDetection=true] - Enable plane detection
   * @param {boolean} [options.lightEstimation=true] - Enable light estimation
   * @returns {Promise<{success: boolean}>}
   */
  startSession: async (options = {}) => {
    try {
      const result = await ARCoreNative.startSession(options);
      return result;
    } catch (e) {
      throw facadeError('Failed to start AR session: ', e, 'SESSION_START_FAILED');
    }
  },

  /**
   * Stop the AR session.
   *
   * @returns {Promise<void>}
   */
  stopSession: async () => {
    try {
      await ARCoreNative.stopSession();
    } catch (e) {
      throw facadeError('Failed to stop AR session: ', e, 'SESSION_STOP_FAILED');
    }
  },

  /**
   * Perform a hit test at normalized screen coordinates.
   *
   * @param {Object} options - Hit test parameters
   * @param {number} [options.x] - Normalized X coordinate [0, 1] (required by the plugin)
   * @param {number} [options.y] - Normalized Y coordinate [0, 1] (required by the plugin)
   * @returns {Promise<Object>} Hit test result
   */
  hitTest: async (options = {}) => {
    try {
      const result = await ARCoreNative.hitTest(options);
      return result;
    } catch (e) {
      throw facadeError('Hit test failed: ', e, 'HIT_TEST_FAILED');
    }
  },

  /**
   * Place a GLB model at a hit test location.
   *
   * One option shape across runtimes (API-01): the native plugin
   * reads `modelPath`; the WebXR engine's canonical field is
   * `modelUrl`. The facade accepts either and forwards both, so the
   * same call works on Android and on web.
   *
   * @param {Object} options
   * @param {string} [options.modelPath] - Path to GLB model in assets (e.g., "models/chair.glb") (required by the plugin)
   * @param {string} [options.modelUrl] - Alias for `modelPath` — a GLB URL/path
   * @param {string} [options.hitId] - Optional hit identifier
   * @param {string} [options.usdzPath] - iOS only: explicit USDZ model path (takes precedence over the GLB source)
   * @param {string} [options.usdzUrl] - iOS only: explicit USDZ model URL (alias of `usdzPath`)
   * @returns {Promise<{modelId: string, anchorId: string}>}
   */
  placeModel: async (options = {}) => {
    try {
      const normalized = { ...options };
      if (normalized.modelUrl && !normalized.modelPath) {
        normalized.modelPath = normalized.modelUrl;
      }
      if (normalized.modelPath && !normalized.modelUrl) {
        normalized.modelUrl = normalized.modelPath;
      }
      const result = await ARCoreNative.placeModel(normalized);
      return result;
    } catch (e) {
      throw facadeError('Failed to place model: ', e, 'PLACE_MODEL_FAILED');
    }
  },

  /**
   * Update model transform (position, rotation, scale).
   *
   * Implemented by the WebXR runtime and by the iOS native
   * runtime (ARKit + RealityKit, real placement). On Android the
   * native plugin rejects with code `NOT_IMPLEMENTED`: that
   * runtime is scoped to session + hit-testing (Option B) and
   * places no models, so there is nothing to transform.
   *
   * @param {Object} options
   * @param {string} [options.modelId] - Model identifier (required by the plugin)
   * @param {Object} [options.rotation] - Euler angles {x, y, z} in degrees
   * @param {number} [options.scale] - Uniform scale factor
   * @returns {Promise<void>}
   */
  setTransform: async (options = {}) => {
    try {
      await ARCoreNative.setTransform(options);
    } catch (e) {
      throw facadeError('Failed to update transform: ', e, 'TRANSFORM_FAILED');
    }
  },

  /**
   * Set model material/color.
   *
   * Implemented by the WebXR runtime and by the iOS native
   * runtime. On Android the native plugin rejects with code
   * `NOT_IMPLEMENTED` (Option B: that runtime places no models,
   * so there is nothing to restyle).
   *
   * @param {Object} options
   * @param {string} [options.modelId] - Model identifier (required by the plugin)
   * @param {string} [options.color] - Hex color string (e.g., "#7D8B67") (required by the plugin)
   * @returns {Promise<void>}
   */
  setMaterial: async (options = {}) => {
    try {
      await ARCoreNative.setMaterial(options);
    } catch (e) {
      throw facadeError('Failed to update material: ', e, 'MATERIAL_FAILED');
    }
  },

  /**
   * Move model to new position (hit test at screen coordinates).
   *
   * @param {Object} options
   * @param {string} [options.modelId] - Model identifier (required by the plugin)
   * @param {number} [options.x] - Normalized X coordinate [0, 1] (required by the plugin)
   * @param {number} [options.y] - Normalized Y coordinate [0, 1] (required by the plugin)
   * @returns {Promise<Object>} New position information
   */
  moveModel: async (options = {}) => {
    try {
      const result = await ARCoreNative.moveModel(options);
      return result;
    } catch (e) {
      throw facadeError('Failed to move model: ', e, 'MOVE_MODEL_FAILED');
    }
  },

  /**
   * Remove a model.
   *
   * Implemented by the WebXR runtime and by the iOS native
   * runtime. On Android the native plugin rejects with code
   * `NOT_IMPLEMENTED` (Option B: that runtime places no models,
   * so there is nothing to remove).
   *
   * @param {Object} options
   * @param {string} [options.modelId] - Model identifier (required by the plugin)
   * @returns {Promise<void>}
   */
  removeModel: async (options = {}) => {
    try {
      await ARCoreNative.removeModel(options);
    } catch (e) {
      throw facadeError('Failed to remove model: ', e, 'REMOVE_MODEL_FAILED');
    }
  },

  /**
   * List the currently placed models (API-03).
   *
   * On web this returns the engine's placed models
   * (`{modelId, modelUrl, position, rotation, scale}` entries).
   * The iOS native runtime returns the same entries (the facade
   * unwraps the native bridge's `{models}` dictionary). On
   * Android the native plugin method rejects with code
   * `NOT_IMPLEMENTED` (Option B: that runtime places no
   * models, so there is nothing to enumerate).
   *
   * @returns {Promise<Array<Object>>}
   */
  getPlacedModels: async () => {
    try {
      const result = await ARCoreNative.getPlacedModels();
      // The WebXR runtime returns the array directly. The Capacitor
      // native bridge can only resolve a dictionary, so native
      // runtimes (iOS) return `{ models: [...] }` — unwrap it here
      // so callers always see the documented array (API-03).
      if (result && !Array.isArray(result) && Array.isArray(result.models)) {
        return result.models;
      }
      return result;
    } catch (e) {
      throw facadeError('Failed to list placed models: ', e, 'GET_PLACED_MODELS_FAILED');
    }
  },

  /**
   * Remove every placed model (API-03). Implemented on web and
   * on iOS native; on Android this rejects with code
   * `NOT_IMPLEMENTED`, like `getPlacedModels`.
   *
   * @returns {Promise<void>}
   */
  clearModels: async () => {
    try {
      await ARCoreNative.clearModels();
    } catch (e) {
      throw facadeError('Failed to clear models: ', e, 'CLEAR_MODELS_FAILED');
    }
  },

  /**
   * Register a listener for AR events.
   *
   * Event types: 'sessionStarted', 'trackingChanged', 'surfaceDetected',
   *              'surfaceLost', 'surfaceUpdated', 'sessionStopped',
   *              'modelPlaced', 'modelRemoved', 'modelTransformed',
   *              'modelMaterialChanged', 'modelMoved', 'error'
   *
   * Events are PER RUNTIME (API-07): this list is the native Android
   * plugin's event set, bridged lazily on the first subscription
   * (API-02). The WebXR engine emits
   * a different set through its own channels and never through
   * `ARCore.on` — on web, subscribe via `ARView.onFrame`/`onPlanes`
   * (engine frame events: surfaceDetected, surfaceLost, modelPlaced,
   * modelRemoved, modelTransformed, modelColorChanged, modelSwitched,
   * sessionEnded; plane events: planeAdded, planesUpdated) or use the
   * `useARCore` hook's state. 'surfaceUpdated', 'trackingChanged',
   * 'sessionStarted', 'sessionStopped', 'modelMaterialChanged' and
   * 'modelMoved' are native-only; 'modelColorChanged',
   * 'modelSwitched' and 'sessionEnded' are web-engine-only.
   *
   * @param {string} eventType - Type of event to listen for
   * @param {Function} callback - Callback function receiving event data
   * @returns {Function} Unsubscribe function
   */
  on: (eventType, callback) => {
    // First subscription installs the native → local bridge (API-02)
    setupEventBridge();
    if (!eventListeners[eventType]) {
      eventListeners[eventType] = [];
    }
    eventListeners[eventType].push(callback);

    return () => {
      eventListeners[eventType] = eventListeners[eventType].filter(
        (cb) => cb !== callback
      );
    };
  },

  /**
   * Check AR support on this device.
   *
   * @returns {Promise<{supported: boolean, reason: string, code?: string}>}
   */
  checkSupport: async () => {
    try {
      const result = await ARCoreNative.checkSupport();
      return result;
    } catch (e) {
      return {
        supported: false,
        reason: e.message,
        code: (e && typeof e.code === 'string' && e.code) || 'SUPPORT_CHECK_FAILED',
      };
    }
  },

  /**
   * Register a listener for AR events (Capacitor native event listener).
   * Internal method - use .on() for local listeners.
   *
   * @internal
   */
  addListener: (eventType, callback) => {
    return ARCoreNative.addListener(eventType, callback);
  },
};

/**
 * Plugins the event bridge has already been installed on (API-02).
 * WeakSet so test doubles and re-registrations can be garbage
 * collected; the registered plugin proxy lives for the page anyway.
 */
const bridgedPlugins = new WeakSet();

/**
 * Install the native → local event bridge (API-02).
 *
 * The bridge subscribes to the native plugin's events and re-emits
 * them to `ARCore.on()` listeners. It used to run at import time —
 * twelve native listeners registered as a module side effect, which
 * is hostile to SSR, tests and tree-shaking. It now installs lazily
 * on the first `ARCore.on()` subscription — the earliest moment a
 * bridged event can have a listener — and it is idempotent:
 * installing twice on the same plugin is a no-op, so an event can
 * never be delivered twice through duplicate bridge listeners.
 *
 * Exported for verification; application code never needs to call
 * this directly.
 *
 * @param {Object} [plugin] - Plugin to subscribe to (defaults to the
 *   registered ARCore plugin; injectable for tests)
 * @param {Object} [bus] - Local listener registry to dispatch into
 *   (defaults to the facade's registry; injectable for tests)
 * @returns {boolean} True when this call installed the bridge
 */
export function setupEventBridge(plugin = ARCoreNative, bus = eventListeners) {
  if (bridgedPlugins.has(plugin)) return false;
  bridgedPlugins.add(plugin);

  const eventTypes = [
    'sessionStarted',
    'trackingChanged',
    'surfaceDetected',
    'surfaceLost',
    'surfaceUpdated',
    'sessionStopped',
    'modelPlaced',
    'modelRemoved',
    'modelTransformed',
    'modelMaterialChanged',
    'modelMoved',
    'error',
  ];

  eventTypes.forEach((eventType) => {
    plugin.addListener(eventType, (data) => {
      if (bus[eventType]) {
        bus[eventType].forEach((callback) => {
          try {
            callback(data);
          } catch (e) {
            console.error(`Error in ${eventType} listener:`, e);
          }
        });
      }
    });
  });

  return true;
}

export default ARCore;

// React integration. The supported entry for React applications is
// the `reticlexr/react` subpath (src/react.js, API-02).
/**
 * @deprecated Import `useARCore` from `reticlexr/react` instead. The
 * root re-export keeps working in 1.x but will be removed in the
 * next major version — while it lives here, the root entry cannot
 * drop its top-level React import.
 */
export { useARCore } from './hooks.js';

export { createARGestureController } from './gestures.js';

// The coded-error type thrown across the public API (API-05).
export { ARError, codedError } from './web.js';

// High-level abstraction API. Prefer this for application code.
export { ARView, createARView, takeScreenshot, enableCustomization, addTextures, switchModel, placeModel } from './ar-view.js';
