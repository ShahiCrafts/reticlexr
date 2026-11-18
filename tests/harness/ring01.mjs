import { describe, it, expect } from 'vitest';

// ring01 — the base outline (config.showBaseRing): the white
// rounded-rectangle band native viewers draw on the surface
// around a placed model. Contract: created at placement sized
// from the model's footprint, follows the record through
// updateModelPositions (position, yaw, scale), replaced on
// switch, removed with the model, and absent when the config
// is off.

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
      mesh.position.y = 0.25; // base centre exactly at the origin
      group.add(mesh);
      onLoad({ scene: group, animations: [] });
    },
  };
  return engine;
}

const yawOf = (obj) =>
  new THREE.Euler().setFromQuaternion(obj.quaternion, 'YXZ').y;

describe('ring01', () => {
  it('ring is created, follows the record, is replaced on switch and removed with the model', async () => {
    const engine = makeEngine();
    engine.setConfig({ showBaseRing: true });

    const { modelId } = await engine.placeModel({
      modelUrl: 'a.glb',
      position: [0.5, 0, -1.2],
      rotation: [0, 0, 0, 1],
      scale: 1,
    });
    const ring = engine.modelBaseRings.get(modelId);
    expect(ring, 'ring exists after placement').toBeTruthy();
    expect(ring.name).toBe('model-base-ring');
    expect(engine.scene.children.includes(ring)).toBe(true);
    expect(Math.abs(ring.position.x - 0.5)).toBeLessThan(1e-6);
    expect(Math.abs(ring.position.z - -1.2)).toBeLessThan(1e-6);
    // Sits a hair above the surface point, flat (geometry baked).
    expect(ring.position.y).toBeGreaterThan(0);
    expect(ring.position.y).toBeLessThan(0.01);

    // Rotate + scale + move the record: the ring follows on the
    // next updateModelPositions pass.
    const half = Math.PI / 4; // 90 degrees yaw
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), half * 2);
    await engine.transformModel({
      modelId,
      position: [0.9, 0, -0.8],
      rotation: [q.x, q.y, q.z, q.w],
      scale: 2,
    });
    engine.updateModelPositions(null);
    expect(Math.abs(ring.position.x - 0.9)).toBeLessThan(1e-6);
    expect(Math.abs(ring.position.z - -0.8)).toBeLessThan(1e-6);
    expect(Math.abs(yawOf(ring) - Math.PI / 2)).toBeLessThan(1e-4);
    expect(Math.abs(ring.scale.x - 2)).toBeLessThan(1e-6);
    expect(Math.abs(ring.scale.z - 2)).toBeLessThan(1e-6);

    // Switch: the ring is replaced (new footprint) at the same
    // record transform.
    const oldRing = ring;
    await engine.switchModel({ modelId, modelUrl: 'wide.glb', preserveMaterial: false });
    const nextRing = engine.modelBaseRings.get(modelId);
    expect(nextRing, 'ring exists after switch').toBeTruthy();
    expect(nextRing).not.toBe(oldRing);
    expect(engine.scene.children.includes(oldRing)).toBe(false);
    expect(engine.scene.children.includes(nextRing)).toBe(true);
    expect(Math.abs(nextRing.position.x - 0.9)).toBeLessThan(1e-6);

    // Remove: ring leaves the scene and the map.
    await engine.removeModel({ modelId });
    expect(engine.modelBaseRings.has(modelId)).toBe(false);
    expect(engine.scene.children.includes(nextRing)).toBe(false);
  });

  it('no ring when showBaseRing is off (the default)', async () => {
    const engine = makeEngine();
    const { modelId } = await engine.placeModel({
      modelUrl: 'a.glb',
      position: [0, 0, -1],
      rotation: [0, 0, 0, 1],
      scale: 1,
    });
    expect(engine.modelBaseRings.has(modelId)).toBe(false);
  });
});
