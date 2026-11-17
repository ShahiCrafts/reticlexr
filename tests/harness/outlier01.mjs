// Placement centre hardening (owner discussion 2026-11-17): the
// base centre must be measured from the model's MAIN mesh
// cluster. A GLB can carry detached stray geometry (a leftover
// mesh metres from the body); measuring the whole-model box let
// that stray drag the centre, and the tap point, off the model.
//  A. Dirty model (body + near part + far stray): the wrapper
//     offset matches the body cluster's centre, stray excluded,
//     near part (inside the 10% reach) included.
//  B. Clean model (body only): the offset is unchanged from the
//     plain whole-model measurement.

import { test, expect } from 'vitest';

test('outlier01', async () => {
  const THREE = await import('three');
  const { ARCoreWeb } = await import('../../src/web.js');
  const check = (name, cond) => expect(cond, name).toBe(true);
  const near = (a, b) => Math.abs(a - b) < 1e-3;

  const box = (w, h, d, x, y, z) => {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      new THREE.MeshBasicMaterial(),
    );
    m.position.set(x, y, z);
    return m;
  };

  // Body: torso x[0.3,0.7] y[0,0.6] z[-0.15,0.15]; head y[0.6,0.84].
  // Body-only centre: (0.5, 0). Near part x[0.72,0.84] y[0.88,1.0]
  // joins the cluster (gap < 10% reach) and pulls the centre to
  // x = (0.3 + 0.84) / 2 = 0.57. Stray at x[2.95,3.05] z[1.95,2.05]
  // must not count (whole-model centre would be x = 1.675).
  const dirtyScene = new THREE.Group();
  dirtyScene.add(box(0.4, 0.6, 0.3, 0.5, 0.3, 0));
  dirtyScene.add(box(0.24, 0.24, 0.24, 0.5, 0.72, 0));
  dirtyScene.add(box(0.12, 0.12, 0.12, 0.78, 0.94, 0));
  dirtyScene.add(box(0.1, 0.1, 0.1, 3, 0.05, 2));

  const cleanScene = new THREE.Group();
  cleanScene.add(box(0.4, 0.6, 0.3, 0.5, 0.3, 0));
  cleanScene.add(box(0.24, 0.24, 0.24, 0.5, 0.72, 0));

  const scenes = { 'dirty.glb': dirtyScene, 'clean.glb': cleanScene };
  const engine = new ARCoreWeb();
  engine.scene = new THREE.Scene();
  engine.gltfLoader = {
    load(url, onLoad) {
      onLoad({ scene: scenes[url], animations: [] });
    },
  };

  const innerOffset = async (url) => {
    const placed = await engine.placeModel({
      modelUrl: url,
      position: [0, 0, 0],
      rotation: [0, 0, 0, 1],
      scale: [1, 1, 1],
    });
    const wrapper = engine.loadedModels.get(placed.modelId);
    return wrapper.children[0].position;
  };

  // ---------- A: stray excluded, near part included ----------
  const dirty = await innerOffset('dirty.glb');
  check('dirty: offset X is the cluster centre (-0.57)', near(dirty.x, -0.57));
  check('dirty: offset Y is the cluster floor (0)', near(dirty.y, 0));
  check('dirty: offset Z is the cluster centre (0)', near(dirty.z, 0));

  // ---------- B: clean model unchanged ----------
  const clean = await innerOffset('clean.glb');
  check('clean: offset X is the body centre (-0.5)', near(clean.x, -0.5));
  check('clean: offset Y is the floor (0)', near(clean.y, 0));
  check('clean: offset Z is the centre (0)', near(clean.z, 0));
});
