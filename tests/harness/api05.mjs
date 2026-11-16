// Verification harness (Phase 4). Stub-based, runs under plain Node:
// `node tests/harness/api05.mjs`. Phase 6 (TEST-01) formalises these
// into the Vitest suite — see tests/README.md.
// API-05: ONE error convention. Async methods reject with an ARError
// (Error + stable `code`); result-object APIs (hitTest,
// takeScreenshot, ARView.placeModel) resolve with the same `code`
// beside the human-readable error/reason. The facade preserves
// runtime codes and falls back to per-method *_FAILED codes.
import * as THREE from 'three';
import React from 'react';
import { renderToString } from 'react-dom/server';

const { ARCoreWeb, ARError, codedError } = await import('../../src/web.js');
const { ARView } = await import('../../src/ar-view.js');
const { ARCore } = await import('../../src/index.js');
const { useARCore } = await import('../../src/hooks.js');

let failures = 0;
const check = (name, cond) => { console.log(cond ? 'PASS' : 'FAIL', name); if (!cond) failures++; };
const codeOf = async (promise) => {
  try { await promise; return null; } catch (e) { return e; }
};

// ---- ARError basics ----
const sample = codedError('SOME_CODE', 'some message');
check('codedError builds an ARError (Error subclass with code)',
  sample instanceof ARError && sample instanceof Error && sample.code === 'SOME_CODE' && sample.message === 'some message');

// ---- Engine stub (same pattern as leak-phase3) ----
function makeEngine(loaderError = null) {
  const engine = new ARCoreWeb();
  engine.scene = new THREE.Scene();
  engine.planesMeshGroup = new THREE.Group();
  engine.planeDotsGroup = new THREE.Group();
  engine.scene.add(engine.planesMeshGroup, engine.planeDotsGroup);
  engine.gltfLoader = {
    load(url, onLoad, onProgress, onError) {
      if (loaderError) { onError(loaderError); return; }
      const scene = new THREE.Group();
      scene.add(new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshStandardMaterial({ color: 0xffffff })
      ));
      onLoad({ scene, cameras: [], animations: [] });
    },
  };
  return engine;
}

const engine = makeEngine();

// ---- Engine rejections carry codes ----
let err = await codeOf(engine.placeModel({}));
check('placeModel without a model rejects MODEL_URL_REQUIRED',
  err && err.code === 'MODEL_URL_REQUIRED' && err instanceof ARError);

err = await codeOf(engine.placeModel({ modelUrl: 'a.glb' }));
check('placeModel without a surface hit rejects NO_SURFACE',
  err && err.code === 'NO_SURFACE');

err = await codeOf(engine.transformModel({ modelId: 'nope', scale: 2 }));
check('transformModel on a missing model rejects MODEL_NOT_FOUND', err && err.code === 'MODEL_NOT_FOUND');

err = await codeOf(engine.setModelColor({ modelId: 'nope', color: '#fff' }));
check('setModelColor on a missing model rejects MODEL_NOT_FOUND', err && err.code === 'MODEL_NOT_FOUND');

err = await codeOf(engine.switchModel({ modelId: 'nope', modelUrl: 'x.glb' }));
check('switchModel on a missing model rejects MODEL_NOT_FOUND', err && err.code === 'MODEL_NOT_FOUND');

const failingEngine = makeEngine(new Error('network gone'));
err = await codeOf(failingEngine.loadModel('bad.glb'));
check('loadModel failure rejects MODEL_LOAD_FAILED', err && err.code === 'MODEL_LOAD_FAILED');
err = await codeOf(failingEngine.placeModel({ modelUrl: 'bad.glb', position: [0, 0, 0] }));
check('placeModel load failure rejects MODEL_LOAD_FAILED (no double wrap)',
  err && err.code === 'MODEL_LOAD_FAILED' && err.message.split('Failed to load model').length === 2);

// startSession failure: stub the XR entry points (sec04 pattern)
{
  const e2 = makeEngine();
  e2.renderer = { domElement: {}, xr: { async setSession() {} }, getContext() { return {}; } };
  e2.startRendering = () => {};
  globalThis.document = { body: { appendChild() {} } };
  Object.defineProperty(globalThis, 'navigator', {
    value: { xr: { async requestSession() { throw new Error('user denied'); } } },
    configurable: true,
  });
  err = await codeOf(e2.startSession({}));
  check('startSession failure rejects SESSION_START_FAILED',
    err && err.code === 'SESSION_START_FAILED' && err.message.includes('user denied'));
}

// ---- Engine result-object failures carry codes ----
const hit = await engine.hitTest({ x: 0.5, y: 0.5 });
check('hitTest without a session resolves { hit: false, code: SESSION_NOT_ACTIVE }',
  hit.hit === false && hit.code === 'SESSION_NOT_ACTIVE' && hit.error === 'Session not active');

const shot = await engine.takeScreenshot();
check('takeScreenshot without a session resolves with SESSION_NOT_ACTIVE',
  shot.success === false && shot.code === 'SESSION_NOT_ACTIVE');

// ---- ARView ----
const viewEngine = makeEngine();
viewEngine.hitTest = async () => ({ hit: false, code: 'SESSION_NOT_ACTIVE', error: 'Session not active' });
const view = new ARView({ engine: viewEngine });
const viewPlaced = await view.placeModel('a.glb');
check('ARView.placeModel failure resolves { success: false, code: NO_SURFACE, reason: NO_SURFACE }',
  viewPlaced.success === false && viewPlaced.code === 'NO_SURFACE' && viewPlaced.reason === 'NO_SURFACE');

err = await codeOf(view.applyTexture('fabric'));
check('ARView.applyTexture without a model throws NO_ACTIVE_MODEL', err && err.code === 'NO_ACTIVE_MODEL');

const bareView = new ARView({ engine: makeEngine() });
err = null;
try { bareView.enableCustomization({ modelUrl: 'a.glb' }); } catch (e) { err = e; }
check('ARView.enableCustomization without an overlay throws OVERLAY_REQUIRED',
  err && err.code === 'OVERLAY_REQUIRED');

// ---- Facade: runtime codes preserved, fallbacks applied ----
err = await codeOf(ARCore.placeModel({}));
check('facade preserves the engine code (MODEL_URL_REQUIRED)',
  err && err.code === 'MODEL_URL_REQUIRED' && err.message.startsWith('Failed to place model: '));

err = await codeOf(ARCore.startSession({}));
check('facade applies its fallback code when the runtime error has none (SESSION_START_FAILED)',
  err && err.code === 'SESSION_START_FAILED' && err.message.startsWith('Failed to start AR session: '));

err = await codeOf(ARCore.removeModel({ modelId: 'nope' }));
check('facade removeModel on web resolves (engine removeModel is idempotent)', err === null);

// ---- Hook: guards and failures carry codes ----
let hookApi = null;
function Probe() { hookApi = useARCore({ engine: makeEngine() }); return null; }
renderToString(React.createElement(Probe));

const hookPlace = await hookApi.placeModel('a.glb', [0, 0, 0]);
check('hook placeModel without a session returns SESSION_NOT_ACTIVE',
  hookPlace.error === 'Session not active' && hookPlace.code === 'SESSION_NOT_ACTIVE');
const hookHit = await hookApi.hitTest(0.5, 0.5);
check('hook hitTest without a session returns SESSION_NOT_ACTIVE',
  hookHit.hit === false && hookHit.code === 'SESSION_NOT_ACTIVE');
const hookShot = await hookApi.takeScreenshot();
check('hook takeScreenshot without a session returns SESSION_NOT_ACTIVE',
  hookShot.success === false && hookShot.code === 'SESSION_NOT_ACTIVE');

console.log(failures === 0 ? 'ALL PASS' : `${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
