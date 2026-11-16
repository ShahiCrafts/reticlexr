// LEAK-03 / engine.dispose() cycle test: create -> destroy ->
// create -> destroy on the SAME engine instance. The second create
// must succeed (dispose() nulls renderer/scene/camera so
// startSession's `if (!this.renderer) this.initThreeJS()` path
// re-initialises), and disposal after the second destroy must be
// complete. initThreeJS itself needs a DOM/WebGL context, so the
// harness substitutes a fake that builds the same field shape with
// a stub renderer — what is under test is dispose()'s teardown and
// field reset, not WebGL. Vitest suite (TEST-01): run with `npm test`.

import { test, expect } from 'vitest';
import * as THREE from 'three';

test('dispose-cycle', async () => {
const { ARCoreWeb, collectResources } = await import('../../src/web.js');
const { ARView } = await import('../../src/ar-view.js');

const check = (name, cond) => expect(cond, name).toBe(true);

// Minimal live-resource tracker (same scheme as leak-phase3.mjs)
const created = new Set();
const disposedSet = new Set();
function track(res) {
  if (!res || typeof res.dispose !== 'function' || created.has(res)) return;
  created.add(res);
  const orig = res.dispose.bind(res);
  res.dispose = () => { disposedSet.add(res); orig(); };
}
const liveCount = () => created.size - disposedSet.size;

function makeFakeGltf() {
  const scene = new THREE.Group();
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const mat = new THREE.MeshStandardMaterial({ color: 0xff0000 });
  scene.add(new THREE.Mesh(geo, mat));
  track(geo); track(mat);
  return { scene, cameras: [], animations: [] };
}

function fakeInit(engine, spies) {
  engine.scene = new THREE.Scene();
  engine.camera = new THREE.PerspectiveCamera(70, 1, 0.01, 100);
  engine.planesMeshGroup = new THREE.Group();
  engine.planeDotsGroup = new THREE.Group();
  engine.scene.add(engine.planesMeshGroup, engine.planeDotsGroup);
  engine.reticle = new THREE.Group();
  engine.scene.add(engine.reticle);
  engine.gltfLoader = { load: (url, onLoad) => onLoad(makeFakeGltf()) };
  engine.renderer = {
    dispose: () => { spies.rendererDispose++; },
    forceContextLoss: () => { spies.forceContextLoss++; },
    setAnimationLoop: () => {},
    domElement: { parentElement: null },
  };
}

const spies = { rendererDispose: 0, forceContextLoss: 0 };
const engine = new ARCoreWeb();

// --- Cycle 1: create, place, destroy -----------------------------------
fakeInit(engine, spies);
const first = await engine.placeModel({ modelUrl: 'a.glb', position: [0, 0, 0] });
collectResources(engine.scene).forEach(track);
check('cycle 1: model placed', engine.loadedModels.size === 1 && !!first.anchorId);
check('cycle 1: resources live before destroy', liveCount() > 0);

await engine.dispose();
check('dispose: renderer/scene/camera nulled', engine.renderer === null && engine.scene === null && engine.camera === null);
check('dispose: groups/reticle/loader nulled', engine.planesMeshGroup === null && engine.planeDotsGroup === null && engine.reticle === null && engine.gltfLoader === null);
check('dispose: renderer.dispose + forceContextLoss called', spies.rendererDispose === 1 && spies.forceContextLoss === 1);
check('dispose: model cache empty', engine.modelCache.size === 0);
check('dispose: no live resources remain', liveCount() === 0);

// --- Cycle 2: create again on the same instance -------------------------
fakeInit(engine, spies); // what startSession does when renderer is null
const second = await engine.placeModel({ modelUrl: 'a.glb', position: [0, 0, 0] });
collectResources(engine.scene).forEach(track);
check('cycle 2: create succeeds on the same engine instance', engine.loadedModels.size === 1 && !!second.anchorId);
check('cycle 2: resources live again', liveCount() > 0);

await engine.dispose();
check('cycle 2: renderer torn down again', spies.rendererDispose === 2 && spies.forceContextLoss === 2);
check('cycle 2: disposal complete again', liveCount() === 0 && engine.renderer === null && engine.modelCache.size === 0);

// --- Idempotency + ARView wiring -----------------------------------------
await engine.dispose();
check('dispose is idempotent (third call, no throw)', true);

const viewEngine = new ARCoreWeb();
fakeInit(viewEngine, spies);
const view = new ARView({ engine: viewEngine });
await view.destroy();
check('ARView.destroy() runs engine.dispose()', viewEngine.renderer === null && viewEngine.scene === null);
});
