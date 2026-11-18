// XRAnchor world-lock (the native-viewer pattern): a placed model
// must ride its surface, not the map. Covers:
//  A. updateModelPositions follows the anchor's LIVE pose — when
//     the runtime refines the surface estimate, the model (and the
//     record) move with it, with no transform call involved.
//  B. A scale-only transform keeps the anchor; a position
//     transform releases it, and the render loop mints a fresh
//     anchor at the new pose.
//  C. hitTestAtPoint with { anchor: true } mints an anchor at the
//     hit pose on the synchronous tracked-plane path; without the
//     option, no anchor is created.

import { test, expect } from 'vitest';

test('anchor01', async () => {
  globalThis.XRRay = class {
    constructor(origin, direction) { this.origin = origin; this.direction = direction; }
  };
  globalThis.XRRigidTransform = class {
    constructor(position, orientation) { this.position = position; this.orientation = orientation; }
  };
  const THREE = await import('three');
  const { ARCoreWeb } = await import('../../src/web.js');
  const check = (name, cond) => expect(cond, name).toBe(true);
  const tick = () => new Promise((r) => setTimeout(r, 5));
  const near = (a, b) => Math.abs(a - b) < 1e-4;

  // ---- Parts A + B: the render-loop rig (as in drag02) ----
  const engine = new ARCoreWeb();
  let loopCb = null;
  engine.renderer = {
    setAnimationLoop: (cb) => { loopCb = cb; },
    render: () => {},
  };
  engine.referenceSpace = {};
  engine.planeDetectionSupported = false;
  engine.config.showReticle = false;
  engine.scene = new THREE.Scene();
  engine.session = {
    requestHitTestSource: async () => ({ cancel() {} }),
    addEventListener: () => {},
    removeEventListener: () => {},
  };
  const root = new THREE.Group();
  engine.scene.add(root);

  const SPACE1 = {};
  const fakeAnchor1 = {
    anchorSpace: SPACE1,
    deleted: false,
    delete() { this.deleted = true; },
  };
  engine.anchors.set('m1', {
    modelUrl: 'x.glb',
    position: [0, 0, 0],
    rotation: [0, 0, 0, 1],
    scale: [1, 1, 1],
    xrAnchor: fakeAnchor1,
    needsAnchor: false,
    anchorPending: false,
  });
  engine.loadedModels.set('m1', root);
  engine.startRendering();

  const proj = new THREE.PerspectiveCamera(90, 1, 0.1, 100).projectionMatrix.toArray();
  const viewerTransform = {
    position: { x: 0, y: 1.4, z: 0 },
    orientation: { x: 0, y: 0, z: 0, w: 1 },
  };
  const baseFrame = {
    getViewerPose: () => ({ transform: viewerTransform, views: [{ projectionMatrix: proj }] }),
    getHitTestResults: () => [],
  };

  // A: the runtime refines the surface — the anchor's pose shifts
  // by (+0.3, 0, -0.2). The model must follow with NO transform.
  const frameA = {
    ...baseFrame,
    getPose: (space) =>
      space === SPACE1
        ? { transform: { position: { x: 0.3, y: 0, z: -0.2 }, orientation: { x: 0, y: 0, z: 0, w: 1 } } }
        : null,
  };
  loopCb(16, frameA);
  check(
    'model followed the anchor refinement',
    near(root.position.x, 0.3) && near(root.position.z, -0.2)
  );
  check(
    'record was updated to the anchor pose',
    near(engine.anchors.get('m1').position[0], 0.3) &&
    near(engine.anchors.get('m1').position[2], -0.2)
  );

  // B1: scale-only transform keeps the anchor.
  await engine.transformModel({ modelId: 'm1', scale: [2, 2, 2] });
  check('scale-only transform kept the anchor', fakeAnchor1.deleted === false);
  check('anchor still attached after scale', engine.anchors.get('m1').xrAnchor === fakeAnchor1);

  // B2: a position transform releases the anchor; the next loop
  // frame mints a fresh one at the new pose.
  await engine.transformModel({ modelId: 'm1', position: [1, 0, -1] });
  check('position transform deleted the old anchor', fakeAnchor1.deleted === true);
  check('anchor released after move', engine.anchors.get('m1').xrAnchor === null);
  check('re-anchor flagged', engine.anchors.get('m1').needsAnchor === true);

  const SPACE2 = {};
  const fakeAnchor2 = { anchorSpace: SPACE2, delete() {} };
  const createdPoses = [];
  const frameB = {
    ...baseFrame,
    getPose: () => null,
    createAnchor: async (pose) => { createdPoses.push(pose); return fakeAnchor2; },
  };
  loopCb(32, frameB);
  await tick();
  check('loop minted a fresh anchor', engine.anchors.get('m1').xrAnchor === fakeAnchor2);
  check('fresh anchor cleared the flag', engine.anchors.get('m1').needsAnchor === false);
  check(
    'fresh anchor minted at the new pose',
    createdPoses.length === 1 &&
    createdPoses[0].position.x === 1 &&
    createdPoses[0].position.z === -1
  );

  // ---- Part C: hitTestAtPoint anchor option (hitplane01 rig) ----
  const engine2 = new ARCoreWeb();
  engine2.referenceSpace = {};
  engine2.planeDetectionSupported = true;
  const planeSpace = {};
  const plane = {
    planeSpace,
    orientation: 'horizontal',
    polygon: [
      { x: -1, y: 0, z: -1 },
      { x: 1, y: 0, z: -1 },
      { x: 1, y: 0, z: 1 },
      { x: -1, y: 0, z: 1 },
    ],
  };
  engine2.detectedPlanes.set(plane, { orientation: 'horizontal', mesh: null, dots: null });
  let rafQueue = [];
  engine2.session = {
    requestAnimationFrame: (cb) => { rafQueue.push(cb); return rafQueue.length; },
    requestHitTestSource: async () => ({ cancel() {} }),
    addEventListener: () => {},
    removeEventListener: () => {},
  };
  const fakeAnchor3 = { anchorSpace: {}, delete() {} };
  const frame2 = {
    getViewerPose: () => ({
      transform: {
        position: { x: 0, y: 1.4, z: 0 },
        orientation: { x: 0, y: 0, z: 0, w: 1 },
      },
      views: [{ projectionMatrix: proj }],
    }),
    getPose: (space) =>
      space === planeSpace
        ? { transform: { position: { x: 0, y: 0, z: -2 }, orientation: { x: 0, y: 0, z: 0, w: 1 } } }
        : null,
    getHitTestResults: () => [],
    createAnchor: async () => fakeAnchor3,
  };
  async function pump(promise) {
    let result = null;
    promise.then((r) => { result = r; });
    for (let i = 0; i < 10 && result === null; i++) {
      const cbs = rafQueue;
      rafQueue = [];
      for (const cb of cbs) await cb(16 * i, frame2);
      await new Promise((r) => setTimeout(r, 1));
    }
    return result;
  }
  const withAnchor = await pump(engine2.hitTestAtPoint(0.5, 0.75, { anchor: true }));
  check('anchored hit resolves', withAnchor && withAnchor.hit === true);
  check('anchored hit carries the minted anchor', withAnchor.anchor === fakeAnchor3);
  const without = await pump(engine2.hitTestAtPoint(0.5, 0.75));
  check('plain hit still resolves', without && without.hit === true);
  check('plain hit carries no anchor', without.anchor === undefined);
});
