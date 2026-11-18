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
    // Fire-and-tick, not await-per-callback: the polygon path's
    // pose-frame callback now awaits rAF-driven work (the anchor
    // upgrade), so awaiting the callback here would deadlock.
    for (let i = 0; i < 24 && result === null; i++) {
      const cbs = rafQueue;
      rafQueue = [];
      for (const cb of cbs) cb(16 * i, frame2);
      await new Promise((r) => setTimeout(r, 5));
    }
    return result;
  }
  const withAnchor = await pump(engine2.hitTestAtPoint(0.5, 0.75, { anchor: true }));
  check('anchored hit resolves', withAnchor && withAnchor.hit === true);
  check('anchored hit carries the minted anchor', withAnchor.anchor === fakeAnchor3);
  const without = await pump(engine2.hitTestAtPoint(0.5, 0.75));
  check('plain hit still resolves', without && without.hit === true);
  check('plain hit carries no anchor', without.anchor === undefined);

  // ---- Part D: on the runtime hit-test path, the hit result's
  // OWN (trackable-attached) anchor wins over a pose-minted one ----
  const engine3 = new ARCoreWeb();
  engine3.referenceSpace = {};
  engine3.planeDetectionSupported = true;
  // No tracked planes: the polygon fast path cannot settle, so the
  // tap goes through the asynchronous runtime source.
  let rafQueue3 = [];
  const source3 = { cancel() {} };
  engine3.session = {
    requestAnimationFrame: (cb) => { rafQueue3.push(cb); return rafQueue3.length; },
    requestHitTestSource: async () => source3,
    addEventListener: () => {},
    removeEventListener: () => {},
  };
  const trackableAnchor = { anchorSpace: {}, delete() {} };
  const poseAnchor = { anchorSpace: {}, delete() {} };
  const hitResult3 = {
    getPose: () => ({
      transform: {
        position: { x: 0, y: 0, z: -2.8 },
        orientation: { x: 0, y: 0, z: 0, w: 1 },
      },
    }),
    createAnchor: async () => trackableAnchor,
  };
  const frame3 = {
    getViewerPose: () => ({
      transform: {
        position: { x: 0, y: 1.4, z: 0 },
        orientation: { x: 0, y: 0, z: 0, w: 1 },
      },
      views: [{ projectionMatrix: proj }],
    }),
    getHitTestResults: (src) => (src === source3 ? [hitResult3] : []),
    createAnchor: async () => poseAnchor,
  };
  let result3 = null;
  engine3.hitTestAtPoint(0.5, 0.75, { anchor: true }).then((r) => { result3 = r; });
  for (let i = 0; i < 10 && result3 === null; i++) {
    const cbs = rafQueue3;
    rafQueue3 = [];
    for (const cb of cbs) await cb(16 * i, frame3);
    await new Promise((r) => setTimeout(r, 1));
  }
  check('runtime-path hit resolves', result3 && result3.hit === true);
  check(
    'trackable-attached anchor preferred over pose-minted',
    result3.anchor === trackableAnchor
  );

  // ---- Part E: on the POLYGON fast path, a confirming runtime
  // hit upgrades the placement to a trackable-attached anchor;
  // a disagreeing hit leaves the pose-minted anchor in place ----
  const makePolygonRig = (hitPosePosition) => {
    const engine = new ARCoreWeb();
    engine.referenceSpace = {};
    engine.viewerSpace = {};
    engine.planeDetectionSupported = true;
    const planeSpaceE = {};
    // detectedPlanes is keyed by the plane object itself (which
    // carries polygon + planeSpace); the value holds the metadata.
    engine.detectedPlanes.set(
      {
        planeSpace: planeSpaceE,
        polygon: [
          { x: -2, z: 0 }, { x: 2, z: 0 }, { x: 2, z: -4 }, { x: -2, z: -4 },
        ],
      },
      { orientation: 'horizontal' }
    );
    let rafQE = [];
    const sourceE = { cancel() {} };
    engine.session = {
      requestAnimationFrame: (cb) => { rafQE.push(cb); return rafQE.length; },
      requestHitTestSource: async () => sourceE,
      addEventListener: () => {},
      removeEventListener: () => {},
    };
    const trackableE = { anchorSpace: {}, delete() {} };
    const poseE = { anchorSpace: {}, delete() {} };
    const hitResultE = {
      getPose: () => ({
        transform: {
          position: hitPosePosition,
          orientation: { x: 0, y: 0, z: 0, w: 1 },
        },
      }),
      createAnchor: async () => trackableE,
    };
    const frameE = {
      getViewerPose: () => ({
        transform: {
          position: { x: 0, y: 1.4, z: 0 },
          orientation: { x: 0, y: 0, z: 0, w: 1 },
        },
        views: [{ projectionMatrix: proj }],
      }),
      getPose: (space) => (space === planeSpaceE
        ? {
            transform: {
              position: { x: 0, y: 0, z: 0 },
              orientation: { x: 0, y: 0, z: 0, w: 1 },
            },
          }
        : undefined),
      getHitTestResults: (src) => (src === sourceE ? [hitResultE] : []),
      createAnchor: async () => poseE,
    };
    const pumpE = async (promise) => {
      let result = null;
      promise.then((r) => { result = r; });
      // Do NOT await the frame callbacks: the polygon path now
      // awaits rAF-driven work (the anchor upgrade) inside its
      // pose-frame callback, so awaiting it here would deadlock
      // the pump. Fire the callbacks, then let microtasks and the
      // next pump iteration interleave as a real session would.
      for (let i = 0; i < 24 && result === null; i++) {
        const cbs = rafQE;
        rafQE = [];
        for (const cb of cbs) cb(16 * i, frameE);
        await new Promise((r) => setTimeout(r, 5));
      }
      return result;
    };
    return { engine, pumpE, trackableE, poseE };
  };

  // The polygon hit for point (0.5, 0.75) from (0, 1.4, 0) is
  // (0, 0, -2.8); a runtime hit at the same spot confirms it.
  const rigNear = makePolygonRig({ x: 0, y: 0, z: -2.8 });
  const nearResult = await rigNear.pumpE(
    rigNear.engine.hitTestAtPoint(0.5, 0.75, { anchor: true })
  );
  check('polygon hit resolves with anchor upgrade rig', nearResult && nearResult.hit === true);
  check(
    'confirming hit upgrades to the trackable anchor',
    nearResult.anchor === rigNear.trackableE
  );

  // A runtime hit 2 m away disagrees: keep the pose-minted anchor.
  const rigFar = makePolygonRig({ x: 2, y: 0, z: -2.8 });
  const farResult = await rigFar.pumpE(
    rigFar.engine.hitTestAtPoint(0.5, 0.75, { anchor: true })
  );
  check('polygon hit resolves with far-hit rig', farResult && farResult.hit === true);
  check(
    'disagreeing hit keeps the pose-minted anchor',
    farResult.anchor === rigFar.poseE
  );
});
