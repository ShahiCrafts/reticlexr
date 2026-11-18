import { describe, it, expect } from 'vitest';

// ring02 — ring/shadow footprint must be measured at UNIT scale
// (device report 2026-11-19: after dragging had drifted the
// model's scale, switching models gave the new model a ring sized
// like neither model — e.g. the duck's ring on the rhino). The old
// order measured the footprint from the already-scaled wrapper,
// baking the scale into the ring geometry, and updateModelPositions
// then applied the scale a second time: at scale s the ring came
// out s-squared. The fix measures once, at unit scale, right after
// wrapping; the scale reaches the ring only through its sync.

globalThis.window = globalThis;
globalThis.innerWidth = 400;
globalThis.innerHeight = 800;

const THREE = await import('three');
const { ARCoreWeb } = await import('../../src/web.js');

function makeEngine() {
  const engine = new ARCoreWeb();
  engine.scene = new THREE.Scene();
  engine.gltfLoader = {
    load(url, onLoad) {
      const group = new THREE.Group();
      const wide = url.includes('wide');
      const geo = wide
        ? new THREE.BoxGeometry(0.8, 0.5, 0.4)
        : new THREE.BoxGeometry(0.3, 0.5, 0.3);
      const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial());
      mesh.position.y = 0.25;
      group.add(mesh);
      onLoad({ scene: group, animations: [] });
    },
  };
  return engine;
}

function ringWorldSize(engine, modelId) {
  const ring = engine.modelBaseRings.get(modelId);
  ring.geometry.computeBoundingBox();
  const bb = ring.geometry.boundingBox;
  return {
    x: (bb.max.x - bb.min.x) * ring.scale.x,
    z: (bb.max.z - bb.min.z) * ring.scale.z,
  };
}

describe('ring02', () => {
  it('switch at a non-1 scale sizes the new ring from the new model, scaled once', async () => {
    const engine = makeEngine();
    engine.setConfig({ showBaseRing: true, showShadow: true });

    const { modelId } = await engine.placeModel({
      modelUrl: 'a.glb',
      position: [0, 0, -2],
      rotation: [0, 0, 0, 1],
      scale: 1,
    });
    // Ring geometry carries footprint + 0.05 margin per side.
    let size = ringWorldSize(engine, modelId);
    expect(Math.abs(size.x - 0.4)).toBeLessThan(1e-6);
    expect(Math.abs(size.z - 0.4)).toBeLessThan(1e-6);

    // Shrink the placed model (as a pinch — or the old mid-drag
    // scale drift — would), then switch to the wide model.
    await engine.transformModel({ modelId, scale: 0.5 });
    await engine.switchModel({ modelId, modelUrl: 'wide.glb' });

    size = ringWorldSize(engine, modelId);
    // Wide footprint (0.8 x 0.4) + margin, scaled exactly once by 0.5.
    expect(Math.abs(size.x - 0.45)).toBeLessThan(1e-6);
    expect(Math.abs(size.z - 0.25)).toBeLessThan(1e-6);

    // Placing directly at a scale follows the same rule.
    const placed = await engine.placeModel({
      modelUrl: 'wide.glb',
      position: [1, 0, -2],
      rotation: [0, 0, 0, 1],
      scale: 2,
    });
    size = ringWorldSize(engine, placed.modelId);
    expect(Math.abs(size.x - 1.8)).toBeLessThan(1e-6);
    expect(Math.abs(size.z - 1.0)).toBeLessThan(1e-6);
  });
});
