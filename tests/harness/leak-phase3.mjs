// Phase 3 leak suite (LEAK-01/02/03/04/07, PERF-01): place /
// switch / remove and plane add/remove cycles must return resource
// counts EXACTLY to the post-warm-up baseline. Vitest suite
// (TEST-01): run with `npm test`.
//
// Headless equivalence: there is no WebGL renderer in Node, so the
// counts below track JS-side resource objects that have not had
// dispose() called — the exact set three.js would still hold GPU
// memory for (renderer.info.memory.geometries / .textures count the
// same objects once uploaded; materials are counted too, one step
// stricter than renderer.info). Disposal is observed by wrapping
// each resource's dispose() the first time the suite sees it.
//
// Protocol: ONE warm-up cycle per path (absorbs one-time
// allocations and populates the model cache), snapshot the baseline,
// then 50 cycles per path; after each path the live counts must
// equal the baseline exactly.
//
// NEGATIVE CONTROL: the second test runs the same protocol on a
// fresh world whose discover() registers every resource it finds as
// cache-shared, which disables disposal through the engine's own
// ownership mechanism. The counts MUST then grow past the baseline —
// the test asserts that leak signature per path. If they did not
// grow, the protocol could not catch a real leak. (Under plain Node
// this was the LEAK_NEGATIVE=1 mode with an exit-code verdict; it is
// now an always-on test with explicit assertions.)
import { test, expect } from 'vitest';
import * as THREE from 'three';

const { ARCoreWeb, collectResources } = await import('../../src/web.js');

const CYCLES = 50;

function createWorld(negative) {
  // ---- Resource tracker ------------------------------------------
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

  // ---- Fake GLTFs --------------------------------------------------
  // Two-material models (fabric with a map, wood without), sharing
  // one geometry — the shape that exercises sharing, clone-on-write
  // and BUG-09 name matching.
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

  const engine = makeEngine();

  // Discover (and start tracking) every resource the engine created
  // since the last call — placed clones, shadows, applied textures.
  // In the negative world everything discovered is also marked
  // cache-shared, which disables its disposal (the control).
  function discover() {
    const found = new Set();
    collectResources(engine.scene).forEach((r) => found.add(r));
    engine.modelCache.forEach((entry) =>
      collectResources(entry.gltf.scene).forEach((r) => found.add(r))
    );
    found.forEach((r) => {
      track(r);
      if (negative) engine._sharedResources.add(r);
    });
  }

  // ---- Cycles ------------------------------------------------------
  async function cyclePlaceRemove(url) {
    const { anchorId } = await engine.placeModel({ modelUrl: url, position: [0, 0, 0] });
    discover();
    await engine.removeModel({ anchorId });
  }

  async function cyclePlaceSwitchRemove(urlA, urlB) {
    const { anchorId } = await engine.placeModel({ modelUrl: urlA, position: [0, 0, 0] });
    discover();
    await engine.setModelTexture({ anchorId, textureUrl: `custom-${anchorId}` });
    discover();
    await engine.switchModel({ anchorId, modelUrl: urlB });
    discover();
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

  function cyclePlaneAddRemove() {
    const plane = makePlane();
    engine.processDetectedPlanes({
      detectedPlanes: new Set([plane]),
      getPose: () => ({ transform: { matrix: IDENTITY16 } }),
    });
    discover();
    const out = { dots: [...engine.detectedPlanes.values()][0]?.dots ?? null };
    engine.processDetectedPlanes({
      detectedPlanes: new Set(),
      getPose: () => null,
    });
    return out;
  }

  return { engine, disposedSets, liveCounts, discover, cyclePlaceRemove, cyclePlaceSwitchRemove, cyclePlaneAddRemove };
}

const sameCounts = (a, b) =>
  a.geometries === b.geometries && a.materials === b.materials && a.textures === b.textures;

// Warm-up (one cycle per path) + baseline + 50 cycles per path.
// When `check` is given, the behavioural assertions of the original
// harness run between warm-up and baseline, exactly as before.
async function runProtocol(world, check) {
  const { engine, discover, liveCounts } = world;

  // Path warm-ups (one cycle each)
  await world.cyclePlaceRemove('model-a.glb');
  await world.cyclePlaceSwitchRemove('model-a.glb', 'model-b.glb');
  world.cyclePlaneAddRemove();
  discover();

  if (check) {
    // Sharing: a fresh placement's materials ARE the cache's materials
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
    discover();

    // BUG-09: after a switch, materials are preserved BY NAME —
    // fabric keeps model-a's red + its applied texture, wood keeps
    // model-a's green — not flattened from the first material, not
    // model-b's blue/yellow.
    const { anchorId: bug09Id } = await engine.placeModel({ modelUrl: 'model-a.glb', position: [0, 0, 0] });
    await engine.setModelTexture({ anchorId: bug09Id, textureUrl: 'custom-bug09' });
    await engine.switchModel({ anchorId: bug09Id, modelUrl: 'model-b.glb' });
    const byName = {};
    engine.loadedModels.get(bug09Id).traverse((c) => {
      if (c.isMesh && c.material) byName[c.material.name] = c.material;
    });
    check('BUG-09: fabric preserved by name (red)', byName.fabric?.color.getHex() === 0xff0000);
    check('BUG-09: wood preserved by name (green)', byName.wood?.color.getHex() === 0x00ff00);
    check('BUG-09: applied texture carried to the matching material', byName.fabric?.map?.name === 'custom-bug09');
    await engine.removeModel({ anchorId: bug09Id });
    discover();

    // PERF-01 shape: one InstancedMesh, exact count, shared geometry
    const { dots } = world.cyclePlaneAddRemove();
    check('PERF-01: dots are a single InstancedMesh', !!dots && dots.isInstancedMesh === true);
    check('PERF-01: instance count equals the grid count (36)', dots?.count === 36);
    check('PERF-01: frustum culling deliberately off', dots?.frustumCulled === false);
    check(
      'PERF-01: dot geometry is engine-shared (not disposed with the plane)',
      !world.disposedSets.geometry.has(dots.geometry)
    );
    check(
      'PERF-01: dot material disposed with the plane',
      world.disposedSets.material.has(dots.material)
    );
    discover();
  }

  // ---- Baseline + 50 cycles per path ----
  const baseline = liveCounts();

  for (let i = 0; i < CYCLES; i++) await world.cyclePlaceRemove('model-a.glb');
  discover();
  const afterPlaceRemove = liveCounts();

  for (let i = 0; i < CYCLES; i++) await world.cyclePlaceSwitchRemove('model-a.glb', 'model-b.glb');
  discover();
  const afterSwitch = liveCounts();

  for (let i = 0; i < CYCLES; i++) world.cyclePlaneAddRemove();
  discover();
  const afterPlanes = liveCounts();

  return { baseline, afterPlaceRemove, afterSwitch, afterPlanes };
}

test('leak-phase3', async () => {
  const check = (name, cond) => expect(cond, name).toBe(true);
  const world = createWorld(false);
  const { baseline, afterPlaceRemove, afterSwitch, afterPlanes } = await runProtocol(world, check);

  check('place/remove x50 returns exactly to baseline', sameCounts(afterPlaceRemove, baseline));
  check('place/switch/remove x50 returns exactly to baseline', sameCounts(afterSwitch, baseline));
  check('plane add/remove x50 returns exactly to baseline', sameCounts(afterPlanes, baseline));
});

test('leak-phase3 negative control: disposal disabled must balloon', async () => {
  const check = (name, cond) => expect(cond, name).toBe(true);
  const world = createWorld(true);
  const { baseline, afterPlaceRemove, afterSwitch, afterPlanes } = await runProtocol(world, null);

  const exceeds = (a, b) =>
    a.geometries > b.geometries || a.materials > b.materials || a.textures > b.textures;
  check('negative control: place/remove counts grow past baseline (leak detected)',
    exceeds(afterPlaceRemove, baseline));
  check('negative control: place/switch/remove counts grow past baseline (leak detected)',
    exceeds(afterSwitch, baseline));
  check('negative control: plane add/remove counts grow past baseline (leak detected)',
    exceeds(afterPlanes, baseline));
});
