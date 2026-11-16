// Verification harness (Phases 1-2). Stub-based, runs under plain
// Node: `node tests/harness/bug01.mjs`. Phase 6 (TEST-01) formalises
// these into the Vitest suite — see tests/README.md.
// BUG-01 harness: transform normalisation at the engine boundary.
globalThis.window = globalThis;
import * as THREE from 'three';
const { ARCoreWeb, normalizeVector3, normalizeQuaternion, normalizeScale } =
  await import('../../src/web.js');

let pass = 0, fail = 0;
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const near = (a, b, eps = 1e-6) =>
  Array.isArray(a) && Array.isArray(b) && a.length === b.length &&
  a.every((v, i) => Math.abs(v - b[i]) <= eps);
function check(name, cond) {
  if (cond) { pass++; console.log('  ok  ', name); }
  else { fail++; console.log('  FAIL', name); }
}

// --- normalizeVector3 ---
check('vec array passthrough', eq(normalizeVector3([1, 2, 3]), [1, 2, 3]));
check('vec object -> array', eq(normalizeVector3({ x: 1, y: 2, z: 3 }), [1, 2, 3]));
check('vec garbage -> fallback', normalizeVector3('nope', undefined) === undefined);
check('vec short array -> fallback', eq(normalizeVector3([1], [9, 9, 9]), [9, 9, 9]));

// --- normalizeQuaternion ---
check('quat array passthrough', eq(normalizeQuaternion([0, 0, 0, 1]), [0, 0, 0, 1]));
check('quat object -> array', eq(normalizeQuaternion({ x: 0, y: 0, z: 0, w: 1 }), [0, 0, 0, 1]));
const s = Math.SQRT1_2;
check('euler object (rad) -> quat', near(normalizeQuaternion({ x: 0, y: Math.PI / 2, z: 0 }), [0, s, 0, s]));
check('euler array (rad) -> quat', near(normalizeQuaternion([Math.PI / 2, 0, 0]), [s, 0, 0, s]));
check('quat null -> fallback', eq(normalizeQuaternion(null, [0, 0, 0, 1]), [0, 0, 0, 1]));

// --- normalizeScale ---
check('scale number -> uniform', eq(normalizeScale(2), [2, 2, 2]));
check('scale object -> array', eq(normalizeScale({ x: 1, y: 2, z: 3 }), [1, 2, 3]));
check('scale array passthrough', eq(normalizeScale([1, 2, 3]), [1, 2, 3]));
check('scale undefined -> fallback', eq(normalizeScale(undefined, [1, 1, 1]), [1, 1, 1]));

// --- engine transformModel with documented hook shapes ---
const e = new ARCoreWeb();
e.anchors.set('a1', { modelUrl: 'x.glb', position: [0, 0, 0], rotation: [0, 0, 0, 1], scale: [1, 1, 1] });
const grp = new THREE.Group();
e.loadedModels.set('a1', grp);
await e.transformModel({
  anchorId: 'a1',
  position: { x: 1, y: 2, z: 3 },              // hook-documented object shape
  rotation: { x: 0, y: Math.PI / 2, z: 0 },    // hook-documented Euler radians
  scale: { x: 2, y: 2, z: 2 },
});
const a = e.anchors.get('a1');
check('transformModel anchor position is array', eq(a.position, [1, 2, 3]));
check('transformModel anchor rotation is quat array', near(a.rotation, [0, s, 0, s]));
check('transformModel anchor scale is array', eq(a.scale, [2, 2, 2]));
check('transformModel scene position applied', eq([grp.position.x, grp.position.y, grp.position.z], [1, 2, 3]));
check('transformModel scene quaternion applied', near([grp.quaternion.x, grp.quaternion.y, grp.quaternion.z, grp.quaternion.w], [0, s, 0, s]));
check('transformModel scene scale applied', eq([grp.scale.x, grp.scale.y, grp.scale.z], [2, 2, 2]));
check('transformModel no NaN anywhere', ![...a.position, ...a.rotation, ...a.scale].some(Number.isNaN));

// --- engine placeModel with documented hook shapes (loadModel stubbed) ---
const e2 = new ARCoreWeb();
e2.scene = new THREE.Scene();
e2.config.showShadow = false;
e2.loadModel = async () => {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial()));
  return g;
};
const r = await e2.placeModel({
  modelUrl: 'chair.glb',
  position: { x: 0, y: 0, z: -2 },
  rotation: { x: 0, y: Math.PI / 4, z: 0 },
  scale: { x: 1, y: 1, z: 1 },
});
const placed = e2.anchors.get(r.anchorId);
check('placeModel returns anchorId', typeof r.anchorId === 'string');
check('placeModel anchor position is array', eq(placed.position, [0, 0, -2]));
check('placeModel anchor rotation is quat array', near(placed.rotation, [0, Math.sin(Math.PI / 8), 0, Math.cos(Math.PI / 8)]));
check('placeModel anchor scale is array', eq(placed.scale, [1, 1, 1]));
const sceneModel = e2.loadedModels.get(r.anchorId);
check('placeModel scene position applied', eq([sceneModel.position.x, sceneModel.position.y, sceneModel.position.z], [0, 0, -2]));

// placeModel defaults: no position + no hit -> throws (unchanged contract)
let threw = false;
try { await e2.placeModel({ modelUrl: 'x.glb' }); } catch { threw = true; }
check('placeModel without position/hit still throws', threw);

// placeModel falls back to lastHitPosition when position omitted
e2.lastHitPosition = [5, 0, 5];
const r2 = await e2.placeModel({ modelUrl: 'x.glb', scale: 2 });
check('placeModel hit fallback position', eq(e2.anchors.get(r2.anchorId).position, [5, 0, 5]));
check('placeModel numeric scale -> uniform', eq(e2.anchors.get(r2.anchorId).scale, [2, 2, 2]));
check('placeModel default rotation identity', eq(e2.anchors.get(r2.anchorId).rotation, [0, 0, 0, 1]));

// --- facade setTransform shim: degrees object vs quaternion object ---
const e3 = new ARCoreWeb();
e3.anchors.set('a9', { modelUrl: 'x.glb', position: [0, 0, 0], rotation: [0, 0, 0, 1], scale: [1, 1, 1] });
await e3.setTransform({ modelId: 'a9', rotation: { x: 0, y: 90, z: 0 } }); // degrees per facade docs
check('setTransform degrees object -> quat', near(e3.anchors.get('a9').rotation, [0, s, 0, s]));
await e3.setTransform({ modelId: 'a9', rotation: { x: 0, y: 0, z: 0, w: 1 } }); // quaternion object passes through
check('setTransform quat object NOT treated as degrees', eq(e3.anchors.get('a9').rotation, [0, 0, 0, 1]));
await e3.setTransform({ modelId: 'a9', position: { x: 7, y: 8, z: 9 }, scale: 3 });
check('setTransform object position + numeric scale', eq(e3.anchors.get('a9').position, [7, 8, 9]) && eq(e3.anchors.get('a9').scale, [3, 3, 3]));

console.log(`\nBUG-01 harness: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
