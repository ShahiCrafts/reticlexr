// Verification harness (Phases 1-2). Stub-based, Vitest suite (TEST-01): run with `npm test`. See tests/README.md.
// Throwaway BUG-12 investigation: where does rotation actually come from
// when a model is placed with an explicit position and no rotation?

import { test, expect } from 'vitest';
import * as THREE from 'three';

test('bug12', async () => {
const { ARCoreWeb } = await import('../../src/web.js');
const { ARView } = await import('../../src/ar-view.js');

const check = (name, cond) => expect(cond, name).toBe(true);

const STALE = [0.5, 0.5, 0.5, 0.5]; // quaternion from an unrelated earlier hit

function makeEngine() {
  const engine = new ARCoreWeb();
  engine.scene = { add() {} };
  engine.config.showShadow = false;
  engine.lastHitPosition = [9, 9, 9];
  engine.lastHitRotation = STALE;
  engine.loadModel = async () => new THREE.Group();
  return engine;
}
const quatOf = (engine) => {
  const model = [...engine.loadedModels.values()][0];
  return model ? model.quaternion.toArray() : null;
};

// A: engine directly, explicit position, rotation omitted
{
  const engine = makeEngine();
  await engine.placeModel({ modelUrl: 'x.glb', position: [1, 2, 3] });
  const q = quatOf(engine);
  console.log('A engine omitted rotation ->', JSON.stringify(q));
  check('A: omitted rotation yields identity', JSON.stringify(q) === '[0,0,0,1]');
}

// B: engine directly, explicit position, rotation: null
{
  const engine = makeEngine();
  await engine.placeModel({ modelUrl: 'x.glb', position: [1, 2, 3], rotation: null });
  const q = quatOf(engine);
  console.log('B engine null rotation ->', JSON.stringify(q));
  check('B: null rotation must NOT inherit stale hit rotation', JSON.stringify(q) === '[0,0,0,1]');
}

// C: ARView with explicit position, no rotation
{
  const engine = makeEngine();
  const view = new ARView({ engine });
  const res = await view.placeModel('x.glb', { position: [1, 2, 3] });
  const q = quatOf(engine);
  console.log('C ARView explicit position ->', JSON.stringify(q), 'result:', JSON.stringify(res.success));
  check('C: ARView explicit position yields identity', JSON.stringify(q) === '[0,0,0,1]');
}

// D: engine with an explicit rotation still honours it
{
  const engine = makeEngine();
  const rot = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI / 2, 0)).toArray();
  await engine.placeModel({ modelUrl: 'x.glb', position: [1, 2, 3], rotation: rot });
  const q = quatOf(engine);
  check('D: explicit rotation honoured', JSON.stringify(q) === JSON.stringify(rot));
}
});
