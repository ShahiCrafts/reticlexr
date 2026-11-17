// Animation mechanism verification: the engine's animation support
// rests on two three.js properties — (1) SkeletonUtils.clone() gives
// a skinned scene its OWN skeleton (a plain Object3D.clone() shares
// the source's, freezing placements in bind pose), and (2) an
// AnimationMixer bound to the clone animates the clone's bones and
// leaves the source scene untouched. Both are proven here with a
// synthetic skinned scene, no renderer needed.

import { test, expect } from 'vitest';
import * as THREE from 'three';
import { clone as cloneSkinnedScene } from 'three/examples/jsm/utils/SkeletonUtils.js';

test('anim01', async () => {
  const check = (name, cond) => expect(cond, name).toBe(true);

  // Build a minimal skinned scene: one mesh, two bones.
  const geo = new THREE.BoxGeometry(0.2, 1, 0.2);
  geo.translate(0, 0.5, 0);
  const count = geo.attributes.position.count;
  const skinIndex = [];
  const skinWeight = [];
  for (let i = 0; i < count; i++) {
    skinIndex.push(0, 0, 0, 0);
    skinWeight.push(1, 0, 0, 0);
  }
  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndex, 4));
  geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeight, 4));
  const mesh = new THREE.SkinnedMesh(geo, new THREE.MeshBasicMaterial());
  const bone1 = new THREE.Bone();
  bone1.name = 'bone1';
  const bone2 = new THREE.Bone();
  bone2.name = 'bone2';
  bone2.position.y = 0.5;
  bone1.add(bone2);
  mesh.add(bone1);
  mesh.bind(new THREE.Skeleton([bone1, bone2]));
  const source = new THREE.Group();
  source.add(mesh);

  const clip = new THREE.AnimationClip('walk', 1, [
    new THREE.VectorKeyframeTrack('bone2.position', [0, 1], [0, 0.5, 0, 0.6, 0.5, 0]),
  ]);

  // (1) The clone's skeleton is independent of the source's.
  const placed = cloneSkinnedScene(source);
  let placedMesh = null;
  let placedBone2 = null;
  placed.traverse((o) => {
    if (o.isSkinnedMesh) placedMesh = o;
    if (o.name === 'bone2') placedBone2 = o;
  });
  check('clone has a skinned mesh', !!placedMesh);
  check('clone skeleton is a new skeleton', placedMesh.skeleton !== mesh.skeleton);
  check('clone skeleton uses the clone bones', placedMesh.skeleton.bones.includes(placedBone2));
  check('clone skeleton does not use the source bones', !placedMesh.skeleton.bones.includes(bone2));

  // (2) A mixer on the clone animates the clone only.
  const mixer = new THREE.AnimationMixer(placed);
  mixer.clipAction(clip).setLoop(THREE.LoopRepeat, Infinity).play();
  mixer.update(0.5);
  check(`clone bone2 moved (x=${placedBone2.position.x.toFixed(3)})`, Math.abs(placedBone2.position.x - 0.3) < 1e-6);
  check('source bone2 untouched', bone2.position.x === 0);
});
