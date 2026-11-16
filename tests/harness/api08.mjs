// Verification harness (Phases 1-2). Stub-based, Vitest suite (TEST-01): run with `npm test`. See tests/README.md.
// API-08 harness: one scale clamp [0.1, 5], enforced by the engine.

import { test, expect } from 'vitest';
import * as THREE from 'three';

test('api08', async () => {
globalThis.window = globalThis;
const { ARCoreWeb, clampScale, SCALE_MIN, SCALE_MAX } = await import('../../src/web.js');
const { ARView } = await import('../../src/ar-view.js');

const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const check = (name, cond) => expect(cond, name).toBe(true);

check('range constants are [0.1, 5]', SCALE_MIN === 0.1 && SCALE_MAX === 5);
check('clampScale clamps per axis', eq(clampScale([10, 0.01, 2]), [5, 0.1, 2]));
check('clampScale passes in-range values', eq(clampScale([1, 2.5, 0.5]), [1, 2.5, 0.5]));

// Engine transformModel clamps
const e = new ARCoreWeb();
e.anchors.set('a1', { modelUrl: 'x.glb', position: [0, 0, 0], rotation: [0, 0, 0, 1], scale: [1, 1, 1] });
const grp = new THREE.Group();
e.loadedModels.set('a1', grp);
await e.transformModel({ anchorId: 'a1', scale: [10, 0.01, 2] });
check('transformModel clamps anchor scale', eq(e.anchors.get('a1').scale, [5, 0.1, 2]));
check('transformModel clamps scene scale', eq([grp.scale.x, grp.scale.y, grp.scale.z], [5, 0.1, 2]));

// Engine placeModel clamps (loadModel stubbed)
const e2 = new ARCoreWeb();
e2.scene = new THREE.Scene();
e2.config.showShadow = false;
e2.loadModel = async () => new THREE.Group();
const r = await e2.placeModel({ modelUrl: 'x.glb', position: [0, 0, 0], scale: 10 });
check('placeModel clamps uniform scale 10 -> 5', eq(e2.anchors.get(r.anchorId).scale, [5, 5, 5]));
const r2 = await e2.placeModel({ modelUrl: 'x.glb', position: [0, 0, 0], scale: { x: 0.05, y: 1, z: 99 } });
check('placeModel clamps object scale per axis', eq(e2.anchors.get(r2.anchorId).scale, [0.1, 1, 5]));

// Facade setTransform routes through the same clamp
await e.transformModel({ anchorId: 'a1', scale: [1, 1, 1] });
await e.setTransform({ modelId: 'a1', scale: 100 });
check('setTransform numeric scale clamped', eq(e.anchors.get('a1').scale, [5, 5, 5]));

// ARView.setScale uses the same range and commits clamped state (BUG-11 ordering kept)
const view = new ARView({ engine: new ARCoreWeb() });
view.engine.anchors.set('v1', { modelUrl: 'x.glb', position: [0, 0, 0], rotation: [0, 0, 0, 1], scale: [1, 1, 1] });
view.activeModelId = 'v1';
await view.setScale(50);
check('ARView.setScale clamps high to 5', view.transform.scale === 5 && eq(view.engine.anchors.get('v1').scale, [5, 5, 5]));
await view.setScale(0.001);
check('ARView.setScale clamps low to 0.1', view.transform.scale === 0.1 && eq(view.engine.anchors.get('v1').scale, [0.1, 0.1, 0.1]));
await view.setScale(2);
check('ARView.setScale in-range passes through', view.transform.scale === 2);
});
