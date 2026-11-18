// Placement measurement vs skinning (device report 2026-11-18:
// placed models did not land where the user tapped). The placement
// wrapper centres the model on a measured bounding box, but the
// measure ran on a fresh clone whose bones' world matrices were
// still stale, so for skinned meshes it silently read the RAW
// stored geometry. In exports whose vertices are stored
// pre-transformed (Sketchfab's — the demo astronaut is one), the
// raw geometry sits ~0.9 m from where the skinning actually draws
// the mesh, so the wrapper centred the wrong box and the visible
// model landed that far from the tap, floating or sunk by the same
// error in Y. The measure now brings the clone's world matrices
// current and skins each vertex for skinned meshes
// (applyBoneTransform mirrors the shader path).
//
// Fixture: one skinned mesh whose raw geometry is centred at
// (0, 0.5, -2), with an inverse bind matrix that shifts it +2 in Z —
// the rendered (skinned) mesh is therefore centred at (0, 0.5, 0),
// standing on y=0. That is exactly the file-level inconsistency the
// astronaut GLB carries (verified offline against the real GLBs:
// before the fix its rendered centre sat 0.94 m forward and 0.29 m
// above the measured centre; after, both models measure to 0.000).

import { test, expect } from 'vitest';

test('place-skinned01', async () => {
  globalThis.window = globalThis;
  const THREE = await import('three');
  const { ARCoreWeb } = await import('../../src/web.js');
  const check = (name, cond) => expect(cond, name).toBe(true);
  const near = (a, b) => Math.abs(a - b) < 1e-6;
  const engine = new ARCoreWeb();

  function skinnedFixture() {
    const geometry = new THREE.BoxGeometry(1, 1, 2);
    geometry.translate(0, 0.5, -2); // raw centre (0, 0.5, -2), floor y=0
    const count = geometry.attributes.position.count;
    const skinIndex = new Uint16Array(count * 4);
    const skinWeight = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) skinWeight[i * 4] = 1; // all bone 0
    geometry.setAttribute('skinIndex', new THREE.BufferAttribute(skinIndex, 4));
    geometry.setAttribute('skinWeight', new THREE.BufferAttribute(skinWeight, 4));
    const bone = new THREE.Bone();
    const mesh = new THREE.SkinnedMesh(geometry, new THREE.MeshBasicMaterial());
    const model = new THREE.Group();
    model.add(mesh);
    model.add(bone);
    model.updateMatrixWorld(true);
    const skeleton = new THREE.Skeleton([bone]);
    mesh.bind(skeleton);
    // The file-level inconsistency: the IBM does not invert the
    // joint's bind world matrix — it carries a +2 Z shift, so the
    // skinned mesh renders 2 m from its raw geometry. Set AFTER
    // bind(): bind() recomputes the inverses when no bind matrix is
    // passed, which would wipe the override.
    skeleton.boneInverses[0] = new THREE.Matrix4().makeTranslation(0, 0, 2);
    return model;
  }

  const model = skinnedFixture();
  const mesh = model.children.find((c) => c.isSkinnedMesh);

  // Sanity: the fixture really is divergent — the STORED geometry
  // centres at z=-2 while the skinned mesh renders at z=0. (A box
  // measure over stale bone matrices — a fresh clone's state at
  // placement time — reads the stored side of that split.)
  mesh.geometry.computeBoundingBox();
  const rawCentre = mesh.geometry.boundingBox.getCenter(new THREE.Vector3());
  check('fixture: stored geometry centre is z=-2', near(rawCentre.z, -2));

  // The placement measure must follow the SKINNED bounds instead.
  const box = engine._placementBox(model);
  const centre = box.getCenter(new THREE.Vector3());
  check('placement box centre follows the skinned mesh (z=0)', near(centre.z, 0));
  check('placement box centre x=0', near(centre.x, 0));
  check('placement box floor is the skinned floor (y=0)', near(box.min.y, 0));

  // And the wrapper must therefore leave this model's inner offset
  // at ~zero: the visible model already stands at its file origin.
  const wrapper = engine._wrapPlacementModel(skinnedFixture());
  const inner = wrapper.children[0];
  check(
    'wrapper offset ~zero for a skinned-at-origin model',
    near(inner.position.x, 0) && near(inner.position.y, 0) && near(inner.position.z, 0)
  );

  // Control: a plain (unskinned) mesh keeps the setFromObject
  // measure — its raw geometry IS where it renders.
  const plain = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 2), new THREE.MeshBasicMaterial());
  plain.geometry.translate(0, 0.5, -2);
  const plainModel = new THREE.Group();
  plainModel.add(plain);
  const plainCentre = engine._placementBox(plainModel).getCenter(new THREE.Vector3());
  check('plain mesh still measures its raw geometry (z=-2)', near(plainCentre.z, -2));
});
