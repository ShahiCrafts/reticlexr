// Placement origin normalisation (owner report 2026-11-17: models
// landed away from the tap point). Exported GLBs often carry their
// geometry offset from the file origin — the demo astronaut sits
// ~0.92 m from its origin and ~0.28 m below it. placeModel and
// switchModel now wrap the clone so the wrapper origin is the
// model's base centre; the wrapper is what gets positioned.
//  A. An offset model (astronaut-like) lands with its base centre
//     exactly on the requested point, standing on the surface.
//  B. A model already authored at its base centre (duck-like) is
//     placed unchanged.
//  C. switchModel keeps the same normalisation at the same anchor.

import { test, expect } from 'vitest';

test('origin01', async () => {
  const THREE = await import('three');
  const { ARCoreWeb } = await import('../../src/web.js');
  const check = (name, cond) => expect(cond, name).toBe(true);
  const near = (a, b) => Math.abs(a - b) < 1e-3;

  // Astronaut-like: geometry centre (0, -0.018, -0.924), floor at -0.283
  const astroGeo = new THREE.BoxGeometry(1.38, 0.53, 1.85);
  astroGeo.translate(0, -0.018, 0);
  const astroMesh = new THREE.Mesh(astroGeo, new THREE.MeshBasicMaterial());
  astroMesh.position.set(0, 0, -0.924);
  const astroScene = new THREE.Group();
  astroScene.add(astroMesh);

  // Duck-like: authored at its base centre, floor at y = 0
  const duckGeo = new THREE.BoxGeometry(0.23, 0.42, 0.47);
  duckGeo.translate(0, 0.21, 0);
  const duckScene = new THREE.Group();
  duckScene.add(new THREE.Mesh(duckGeo, new THREE.MeshBasicMaterial()));

  const scenes = { 'astro.glb': astroScene, 'duck.glb': duckScene };
  const engine = new ARCoreWeb();
  engine.scene = new THREE.Scene();
  engine.gltfLoader = {
    load(url, onLoad) {
      onLoad({ scene: scenes[url], animations: [] });
    },
  };

  const worldBox = (modelId) => {
    engine.scene.updateMatrixWorld(true);
    return new THREE.Box3().setFromObject(engine.loadedModels.get(modelId));
  };

  // ---------- A: offset model ----------
  const placed = await engine.placeModel({
    modelUrl: 'astro.glb', position: [1, 0.5, 2], rotation: [0, 0, 0, 1], scale: [1, 1, 1],
  });
  {
    const box = worldBox(placed.modelId);
    const centre = box.getCenter(new THREE.Vector3());
    check('offset model: base centre X on the tap point', near(centre.x, 1));
    check('offset model: base centre Z on the tap point', near(centre.z, 2));
    check('offset model: stands on the surface (minY = tap Y)', near(box.min.y, 0.5));
    const root = engine.loadedModels.get(placed.modelId);
    check(
      'the wrapper root carries the anchor transform',
      root.position.x === 1 && root.position.y === 0.5 && root.position.z === 2
    );
  }

  // ---------- B: centred model unchanged ----------
  const duck = await engine.placeModel({
    modelUrl: 'duck.glb', position: [0, 0, 0], rotation: [0, 0, 0, 1], scale: [1, 1, 1],
  });
  {
    const box = worldBox(duck.modelId);
    const centre = box.getCenter(new THREE.Vector3());
    check('centred model: centre stays at the origin', near(centre.x, 0) && near(centre.z, 0));
    check('centred model: floor at y = 0', near(box.min.y, 0));
  }

  // ---------- C: switch keeps normalisation ----------
  await engine.switchModel({ modelId: placed.modelId, modelUrl: 'duck.glb' });
  {
    const box = worldBox(placed.modelId);
    const centre = box.getCenter(new THREE.Vector3());
    check('switched model: base centre on the anchor point', near(centre.x, 1) && near(centre.z, 2));
    check('switched model: stands on the surface', near(box.min.y, 0.5));
  }
});
