// Verification harness (Phase 4). Stub-based, runs under plain Node:
// `node tests/harness/api03.mjs`. Phase 6 (TEST-01) formalises these
// into the Vitest suite — see tests/README.md.
// API-03: getPlacedModels() / clearModels() exist and agree across
// the engine, ARView, the facade and the hook — and clearModels
// routes every removal through removeModel, so disposal follows the
// Phase 3 OWNERSHIP RULE (per-instance resources disposed,
// cache-owned resources untouched).
import * as THREE from 'three';
import React from 'react';
import { renderToString } from 'react-dom/server';

const { ARCoreWeb } = await import('../../src/web.js');
const { ARView } = await import('../../src/ar-view.js');
const { ARCore } = await import('../../src/index.js');
const { useARCore } = await import('../../src/hooks.js');

let failures = 0;
const check = (name, cond) => { console.log(cond ? 'PASS' : 'FAIL', name); if (!cond) failures++; };

// ---- Engine stub (same pattern as leak-phase3) ----
function makeEngine() {
  const engine = new ARCoreWeb();
  engine.scene = new THREE.Scene();
  engine.planesMeshGroup = new THREE.Group();
  engine.planeDotsGroup = new THREE.Group();
  engine.scene.add(engine.planesMeshGroup, engine.planeDotsGroup);
  const sharedGeo = new THREE.BoxGeometry(1, 1, 1);
  engine.gltfLoader = {
    load(url, onLoad) {
      const scene = new THREE.Group();
      scene.add(new THREE.Mesh(
        sharedGeo,
        new THREE.MeshStandardMaterial({ color: 0xffffff })
      ));
      onLoad({ scene, cameras: [], animations: [] });
    },
  };
  engine._sharedGeo = sharedGeo;
  return engine;
}

// ---- Engine: list + clear ----
const engine = makeEngine();
const removedEvents = [];
engine.addFrameListener((e) => { if (e.type === 'modelRemoved') removedEvents.push(e); });

check('empty engine lists no models', engine.getPlacedModels().length === 0);

const p1 = await engine.placeModel({ modelUrl: 'a.glb', position: [1, 0, -1], scale: 2 });
const p2 = await engine.placeModel({ modelUrl: 'b.glb', position: [2, 0, -2] });
const p3 = await engine.placeModel({ modelUrl: 'a.glb', position: [3, 0, -3] });

const listed = engine.getPlacedModels();
check('getPlacedModels lists all placed models', listed.length === 3);
check('entries carry canonical modelId + alias',
  listed.every((m) => m.modelId && m.anchorId === m.modelId));
check('entries carry modelUrl and transforms',
  listed[0].modelUrl === 'a.glb' && listed[0].position[0] === 1 && listed[0].scale[0] === 2 &&
  listed[1].modelUrl === 'b.glb' && listed[2].position[0] === 3);
listed[0].position[0] = 999;
check('returned transform arrays are copies', engine.getAnchors().get(p1.modelId).position[0] === 1);

// Ownership: colour a model (clone-on-write → per-instance material),
// then clear. The clone must be disposed; the cache-shared geometry
// must NOT be.
await engine.setModelColor({ modelId: p1.modelId, color: '#123456' });
let clonedMaterial = null;
engine.loadedModels.get(p1.modelId).traverse((c) => { if (c.isMesh) clonedMaterial = c.material; });
let cloneDisposed = false;
const origCloneDispose = clonedMaterial.dispose.bind(clonedMaterial);
clonedMaterial.dispose = () => { cloneDisposed = true; origCloneDispose(); };
let sharedGeoDisposed = false;
const origGeoDispose = engine._sharedGeo.dispose.bind(engine._sharedGeo);
engine._sharedGeo.dispose = () => { sharedGeoDisposed = true; origGeoDispose(); };

await engine.clearModels();
check('clearModels empties the list', engine.getPlacedModels().length === 0);
check('clearModels empties anchors and scene models',
  engine.getAnchors().size === 0 && engine.loadedModels.size === 0);
check('one modelRemoved event per cleared model', removedEvents.length === 3);
check('per-instance (cloned) material WAS disposed', cloneDisposed === true);
check('cache-shared geometry was NOT disposed', sharedGeoDisposed === false);
check('model cache survives clearModels', engine.modelCache.size > 0);

// ---- ARView: registry, list, clear ----
const view = new ARView({ engine: makeEngine() });
const v1 = await view.placeModel('a.glb', { position: [0, 0, -1] });
const v2 = await view.placeModel('b.glb', { position: [1, 0, -1] });
check('ARView tracks every placement, not just the active one', view.getPlacedModels().length === 2);
check('ARView list ids match its placements',
  view.getPlacedModels().map((m) => m.modelId).sort().join() === [v1.modelId, v2.modelId].sort().join());
await view.removeModel(); // removes the ACTIVE model only
check('ARView.removeModel removes only the active model', view.getPlacedModels().length === 1);
await view.clearModels();
check('ARView.clearModels removes the rest', view.getPlacedModels().length === 0);
check('ARView.clearModels clears active state', view.activeModelId === null && view.activeModelUrl === null);

// A second view on the SAME engine does not list the first view's models
const sharedEngine = makeEngine();
const viewA = new ARView({ engine: sharedEngine });
const viewB = new ARView({ engine: sharedEngine });
await viewA.placeModel('a.glb', { position: [0, 0, -1] });
check('views on a shared engine list only their own models',
  viewA.getPlacedModels().length === 1 && viewB.getPlacedModels().length === 0);

// ---- Facade: routes through the plugin proxy to the web engine ----
const facadeList = await ARCore.getPlacedModels();
check('facade getPlacedModels resolves an array', Array.isArray(facadeList) && facadeList.length === 0);
await ARCore.clearModels();
check('facade clearModels resolves', true);

// ---- Hook: exposes both, delegated to its engine ----
const hookEngine = makeEngine();
const hp = await hookEngine.placeModel({ modelUrl: 'a.glb', position: [0, 0, -1] });
let hookApi = null;
function Probe() { hookApi = useARCore({ engine: hookEngine }); return null; }
renderToString(React.createElement(Probe));
check('hook exposes getPlacedModels + clearModels',
  typeof hookApi.getPlacedModels === 'function' && typeof hookApi.clearModels === 'function');
check('hook getPlacedModels reads its engine', hookApi.getPlacedModels().length === 1 &&
  hookApi.getPlacedModels()[0].modelId === hp.modelId);
await hookApi.clearModels();
check('hook clearModels empties its engine', hookEngine.getPlacedModels().length === 0);

console.log(failures === 0 ? 'ALL PASS' : `${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
