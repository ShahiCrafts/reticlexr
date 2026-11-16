// Phase 3 leak harness (LEAK-01/02/03/04/07, PERF-01): place /
// switch / remove and plane add/remove cycles must return resource
// counts EXACTLY to the post-warm-up baseline. Runs under plain
// Node: `node tests/harness/leak-phase3.mjs`.
//
// Headless equivalence: there is no WebGL renderer in Node, so the
// counts below track JS-side resource objects that have not had
// dispose() called — the exact set three.js would still hold GPU
// memory for (renderer.info.memory.geometries / .textures count the
// same objects once uploaded; materials are counted too, one step
// stricter than renderer.info). Disposal is observed by wrapping
// each resource's dispose() the first time the harness sees it.
//
// Protocol: ONE warm-up cycle per path (absorbs one-time
// allocations and populates the model cache), snapshot the baseline,
// then 50 cycles per path; after each path the live counts must
// equal the baseline exactly.
//
// NEGATIVE CONTROL: run with LEAK_NEGATIVE=1. The harness then
// registers every resource it discovers as cache-shared, which
// disables disposal through the engine's own ownership mechanism.
// The counts MUST then grow past the baseline — if they did not,
// this harness could not catch a real leak. Exit code 0 in negative
// mode means "leak detected, as required".
import * as THREE from 'three';

const { ARCoreWeb, collectResources } = await import('../../src/web.js');

const NEGATIVE = process.env.LEAK_NEGATIVE === '1';
const CYCLES = 50;

let failures = 0;
const check = (name, cond) => {
  console.log(cond ? 'PASS' : 'FAIL', name);
  if (!cond) failures++;
};

// ---- Resource tracker -------------------------------------------------
const created = { geometry: new Set(), material: new Set(), texture: new Set() };
const disposedSets = { geometry: new Set(), material: new Set(), texture: new Set() };
const kindOf = (r) => (r.isTexture ? 'texture' : r.isMaterial ? 'material' : 'geometry');

function track(res) {
  if (!res || typeof res.dispose !== 'function') return;
  const kind = kindOf(res);
  if (created[kind].has(res)) return;
  created[kind].add(res);
  const orig = res.dispose.bind(res);
  res.dispose = () => {
    disposedSets[kind].add(res);
    orig();
  };
}

function liveCounts() {
  return {
    geometries: created.geometry.size - disposedSets.geometry.size,
    materials: created.material.size - disposedSets.material.size,
    textures: created.texture.size - disposedSets.texture.size,
  };
}

const sameCounts = (a, b) =>
  a.geometries === b.geometries && a.materials === b.materials && a.textures === b.textures;

// ---- Fake GLTFs ---------------------------------------------------------
// Two-material models (fabric with a map, wood without), sharing one
// geometry — the shape that exercises sharing, clone-on-write and
// BUG-09 name matching.
function makeFakeGltf(fabricColor, woodColor) {
  const scene = new THREE.Group();
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const tex = new THREE.Texture();
  tex.name = 'albedo';
  const fabric = new THREE.MeshStandardMaterial({ color: fabricColor });
  fabric.name = 'fabric';
  fabric.map = tex;
  const wood = new THREE.MeshStandardMaterial({ color: woodColor });
  wood.name = 'wood';
  scene.add(new THREE.Mesh(geo, fabric), new THREE.Mesh(geo, wood));
  track(geo); track(tex); track(fabric); track(wood);
  return { scene, cameras: [], animations: [] };
}

function makeEngine() {
  const engine = new ARCoreWeb();
  engine.scene = new THREE.Scene();
  engine.planesMeshGroup = new THREE.Group();
  engine.planeDotsGroup = new THREE.Group();
  engine.scene.add(engine.planesMeshGroup, engine.planeDotsGroup);
  const fakes = {
    'model-a.glb': makeFakeGltf(0xff0000, 0x00ff00),
    'model-b.glb': makeFakeGltf(0x0000ff, 0xffff00),
  };
  engine.gltfLoader = {
    load(url, onLoad) {
      onLoad(fakes[url]);
    },
  };
  engine.textureLoader = {
    loadAsync: async (url) => {
      const t = new THREE.Texture();
      t.name = url;
      track(t);
      return t;
    },
  };
  return engine;
}

// Discover (and start tracking) every resource the engine created
// since the last call — placed clones, shadows, applied textures.
// In negative mode everything discovered is also marked
// cache-shared, which disables its disposal (the control).
function discover(engine) {
  const found = new Set();
  collectResources(engine.scene).forEach((r) => found.add(r));
  engine.modelCache.forEach((entry) =>
    collectResources(entry.gltf.scene).forEach((r) => found.add(r))
  );
  found.forEach((r) => {
    track(r);
    if (NEGATIVE) engine._sharedResources.add(r);
  });
}

// ---- Cycles ---------------------------------------------------------------
async function cyclePlaceRemove(engine, url) {
  const { anchorId } = await engine.placeModel({ modelUrl: url, position: [0, 0, 0] });
  discover(engine);
  await engine.removeModel({ anchorId });
}

async function cyclePlaceSwitchRemove(engine, urlA, urlB) {
  const { anchorId } = await engine.placeModel({ modelUrl: urlA, position: [0, 0, 0] });
  discover(engine);
  await engine.setModelTexture({ anchorId, textureUrl: `custom-${anchorId}` });
  discover(engine);
  await engine.switchModel({ anchorId, modelUrl: urlB });
  discover(engine);
  await engine.removeModel({ anchorId });
}

const IDENTITY16 = new Float32Array([
  1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1,
]);

function makePlane() {
  return {
    polygon: [
      { x: -0.26, y: 0, z: -0.26 },
      { x: 0.26, y: 0, z: -0.26 },
      { x: 0.26, y: 0, z: 0.26 },
      { x: -0.26, y: 0, z: 0.26 },
    ],
    orientation: 'horizontal',
    planeSpace: {},
    lastChangedTime: 1,
  };
}

function cyclePlaneAddRemove(engine) {
  const plane = makePlane();
  engine.processDetectedPlanes({
    detectedPlanes: new Set([plane]),
    getPose: () => ({ transform: { matrix: IDENTITY16 } }),
  });
  discover(engine);
  const out = { dots: [...engine.detectedPlanes.values()][0]?.dots ?? null };
  engine.processDetectedPlanes({
    detectedPlanes: new Set(),
    getPose: () => null,
  });
  return out;
}

// ---- Warm-up + behavioural assertions --------------------------------------
const engine = makeEngine();

// Path warm-ups (one cycle each)
await cyclePlaceRemove(engine, 'model-a.glb');
await cyclePlaceSwitchRemove(engine, 'model-a.glb', 'model-b.glb');
cyclePlaneAddRemove(engine);
discover(engine);

// Sharing: a fresh placement's materials ARE the cache's materials
{
  const { anchorId } = await engine.placeModel({ modelUrl: 'model-a.glb', position: [0, 0, 0] });
  const placed = engine.loadedModels.get(anchorId);
  const cachedScene = engine.modelCache.get('model-a.glb').gltf.scene;
  let placedMat = null;
  let cachedMat = null;
  placed.traverse((c) => { if (!placedMat && c.isMesh) placedMat = c.material; });
  cachedScene.traverse((c) => { if (!cachedMat && c.isMesh) cachedMat = c.material; });
  check('placement shares the cache material (LEAK-01 sharing)', placedMat === cachedMat);

  // Clone-on-write isolation: colouring this placement must not
  // touch the cache or a second placement of the same model
  const { anchorId: otherId } = await engine.placeModel({ modelUrl: 'model-a.glb', position: [1, 0, 0] });
  await engine.setModelColor({ anchorId, color: 0x123456 });
  let otherMat = null;
  engine.loadedModels.get(otherId).traverse((c) => { if (!otherMat && c.isMesh) otherMat = c.material; });
  check('clone-on-write: other placement keeps the shared material', otherMat === cachedMat);
  check('clone-on-write: cache material colour unchanged', cachedMat.color.getHex() !== 0x123456);
  await engine.removeModel({ anchorId });
  await engine.removeModel({ anchorId: otherId });
  discover(engine);
}

// BUG-09: after a switch, materials are preserved BY NAME — fabric
// keeps model-a's red + its applied texture, wood keeps model-a's
// green — not flattened from the first material, not model-b's
// blue/yellow.
{
  const { anchorId } = await engine.placeModel({ modelUrl: 'model-a.glb', position: [0, 0, 0] });
  await engine.setModelTexture({ anchorId, textureUrl: 'custom-bug09' });
  await engine.switchModel({ anchorId, modelUrl: 'model-b.glb' });
  const byName = {};
  engine.loadedModels.get(anchorId).traverse((c) => {
    if (c.isMesh && c.material) byName[c.material.name] = c.material;
  });
  check('BUG-09: fabric preserved by name (red)', byName.fabric?.color.getHex() === 0xff0000);
  check('BUG-09: wood preserved by name (green)', byName.wood?.color.getHex() === 0x00ff00);
  check('BUG-09: applied texture carried to the matching material', byName.fabric?.map?.name === 'custom-bug09');
  await engine.removeModel({ anchorId });
  discover(engine);
}

// PERF-01 shape: one InstancedMesh, exact count, shared geometry
{
  const { dots } = cyclePlaneAddRemove(engine);
  check('PERF-01: dots are a single InstancedMesh', !!dots && dots.isInstancedMesh === true);
  check('PERF-01: instance count equals the grid count (36)', dots?.count === 36);
  check('PERF-01: frustum culling deliberately off', dots?.frustumCulled === false);
  check(
    'PERF-01: dot geometry is engine-shared (not disposed with the plane)',
    !disposedSets.geometry.has(dots.geometry)
  );
  check(
    'PERF-01: dot material disposed with the plane',
    disposedSets.material.has(dots.material)
  );
  discover(engine);
}

// ---- Baseline + 50 cycles per path ------------------------------------------
const baseline = liveCounts();
console.log('baseline (post warm-up):', JSON.stringify(baseline));

for (let i = 0; i < CYCLES; i++) await cyclePlaceRemove(engine, 'model-a.glb');
discover(engine);
const afterPlaceRemove = liveCounts();
console.log(`after ${CYCLES}x place/remove:`, JSON.stringify(afterPlaceRemove));

for (let i = 0; i < CYCLES; i++) await cyclePlaceSwitchRemove(engine, 'model-a.glb', 'model-b.glb');
discover(engine);
const afterSwitch = liveCounts();
console.log(`after ${CYCLES}x place/switch/remove:`, JSON.stringify(afterSwitch));

for (let i = 0; i < CYCLES; i++) cyclePlaneAddRemove(engine);
discover(engine);
const afterPlanes = liveCounts();
console.log(`after ${CYCLES}x plane add/remove:`, JSON.stringify(afterPlanes));

if (NEGATIVE) {
  const leaked =
    afterPlaceRemove.geometries > baseline.geometries ||
    afterPlaceRemove.materials > baseline.materials ||
    afterPlaceRemove.textures > baseline.textures ||
    afterSwitch.materials > baseline.materials ||
    afterPlanes.materials > baseline.materials;
  console.log(
    leaked
      ? 'NEGATIVE CONTROL: disposal disabled -> counts grew past baseline; the harness detects leaks'
      : 'NEGATIVE CONTROL FAILED: counts returned to baseline even with disposal disabled — harness is blind'
  );
  process.exit(leaked ? 0 : 1);
}

check('place/remove x50 returns exactly to baseline', sameCounts(afterPlaceRemove, baseline));
check('place/switch/remove x50 returns exactly to baseline', sameCounts(afterSwitch, baseline));
check('plane add/remove x50 returns exactly to baseline', sameCounts(afterPlanes, baseline));

console.log(failures === 0 ? 'ALL PASS' : `${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
