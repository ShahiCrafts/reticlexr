// Model-switch texture regression harness (device report 2026-11-17:
// after placing the rhino, switching to the duck or astronaut showed
// the RHINO's texture on them). Root cause: switchModel's documented
// preserveMaterial default carries the old model's colour AND map
// onto the new model — right for product variants, wrong for the
// demo's unrelated models, which must switch with
// { preserveMaterial: false }. This suite pins the engine contract
// the demo now relies on, using the leak suite's fake-GLTF pattern:
//  A. preserveMaterial:false — the incoming model keeps its OWN map
//     and colour; nothing is inherited from the outgoing model.
//  B. The documented default (preserve) still carries colour and map
//     by material name — the configurator behaviour must not regress
//     while fixing the demo.

import { test, expect } from 'vitest';
import * as THREE from 'three';

const { ARCoreWeb } = await import('../../src/web.js');

function makeEngine() {
  const engine = new ARCoreWeb();
  engine.scene = new THREE.Scene();
  engine.planesMeshGroup = new THREE.Group();
  engine.planeDotsGroup = new THREE.Group();
  engine.scene.add(engine.planesMeshGroup, engine.planeDotsGroup);

  const rhinoTex = new THREE.Texture();
  rhinoTex.name = 'rhino-albedo';
  const duckTex = new THREE.Texture();
  duckTex.name = 'duck-albedo';
  const mk = (matName, color, map) => {
    const scene = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color });
    mat.name = matName;
    if (map) mat.map = map;
    scene.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), mat));
    return { scene, cameras: [], animations: [] };
  };
  const fakes = {
    'rhino.glb': mk('hide', 0x8a6d4f, rhinoTex),
    'duck.glb': mk('feather', 0xfff2cc, duckTex),
  };
  engine.gltfLoader = { load(url, onLoad) { onLoad(fakes[url]); } };
  return { engine, rhinoTex, duckTex };
}

function onlyMaterial(root) {
  let found = null;
  root.traverse((c) => { if (c.isMesh) found = c.material; });
  return found;
}

test('switchtex01', async () => {
  const check = (name, cond) => expect(cond, name).toBe(true);
  const { engine, rhinoTex, duckTex } = makeEngine();

  // A: the demo's path — switch with preserveMaterial:false.
  const { anchorId } = await engine.placeModel({ modelUrl: 'rhino.glb', position: [0, 0, 0] });
  await engine.switchModel({ modelId: anchorId, modelUrl: 'duck.glb', preserveMaterial: false });
  const duckMat = onlyMaterial(engine.loadedModels.get(anchorId));
  check('opt-out switch keeps the duck’s own texture', duckMat.map === duckTex);
  check('opt-out switch does not inherit the rhino texture', duckMat.map !== rhinoTex);
  check('opt-out switch keeps the duck’s own colour', duckMat.color.getHex() === 0xfff2cc);

  // B: the documented default still preserves (configurator path).
  await engine.switchModel({ modelId: anchorId, modelUrl: 'rhino.glb' });
  const rhinoMat = onlyMaterial(engine.loadedModels.get(anchorId));
  check('default switch still carries the map by name-or-order', rhinoMat.map === duckTex);
  check('default switch still carries the colour', rhinoMat.color.getHex() === 0xfff2cc);
});
