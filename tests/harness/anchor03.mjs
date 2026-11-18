// Anchor health monitoring: an anchored model whose recorded
// base sits centimetres off the runtime's CURRENT surface
// estimate (the anchor went stale as tracking re-fit the world)
// is re-anchored to a fresh trackable hit and adopts the current
// surface position — but only after TWO consecutive diverged
// checks, so a single glitch never moves a model.

import { test, expect } from 'vitest';

test('anchor03', async () => {
  globalThis.XRRay = class {
    constructor(origin, direction) { this.origin = origin; this.direction = direction; }
  };
  const THREE = await import('three');
  const { ARCoreWeb } = await import('../../src/web.js');
  const check = (name, cond) => expect(cond, name).toBe(true);
  const tick = () => new Promise((r) => setTimeout(r, 5));

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
  const root = new THREE.Group();
  engine.scene.add(root);

  let oldAnchorDeleted = false;
  const anchorSpace = {};
  const oldAnchor = { anchorSpace, delete() { oldAnchorDeleted = true; } };
  const freshAnchor = { anchorSpace: {}, delete() {} };
  engine.anchors.set('m1', {
    modelUrl: 'x.glb',
    // Stale: the model floats 5 cm above the surface the runtime
    // currently reports at y=0.
    position: [0, 0.05, -2],
    rotation: [0, 0, 0, 1],
    scale: [1, 1, 1],
    xrAnchor: oldAnchor,
    needsAnchor: false,
    anchorPending: false,
  });
  engine.loadedModels.set('m1', root);

  const planeSpace = {};
  engine.detectedPlanes.set(
    {
      planeSpace,
      polygon: [
        { x: -3, z: 1 }, { x: 3, z: 1 }, { x: 3, z: -5 }, { x: -3, z: -5 },
      ],
    },
    { orientation: 'horizontal' }
  );

  let rafQ = [];
  const source = { cancel() {} };
  engine.session = {
    requestAnimationFrame: (cb) => { rafQ.push(cb); return rafQ.length; },
    requestHitTestSource: async () => source,
    addEventListener: () => {},
    removeEventListener: () => {},
  };
  engine.startRendering();

  const proj = new THREE.PerspectiveCamera(90, 1, 0.1, 100).projectionMatrix.toArray();
  const viewerTransform = {
    position: { x: 0, y: 1.4, z: 0 },
    orientation: { x: 0, y: 0, z: 0, w: 1 },
    matrix: new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1.4, 0, 1]),
  };
  const frame = {
    getViewerPose: () => ({ transform: viewerTransform, views: [{ projectionMatrix: proj }] }),
    getPose: (space) => {
      if (space === anchorSpace) {
        return {
          transform: {
            position: { x: 0, y: 0.05, z: -2 },
            orientation: { x: 0, y: 0, z: 0, w: 1 },
          },
        };
      }
      if (space === planeSpace) {
        return {
          transform: {
            position: { x: 0, y: 0, z: 0 },
            orientation: { x: 0, y: 0, z: 0, w: 1 },
          },
        };
      }
      return undefined;
    },
    getHitTestResults: (src) => (src === source
      ? [{
          getPose: () => ({
            transform: {
              position: { x: 0, y: 0, z: -2 },
              orientation: { x: 0, y: 0, z: 0, w: 1 },
            },
          }),
          createAnchor: async () => freshAnchor,
        }]
      : []),
  };
  const pumpSession = async () => {
    for (let i = 0; i < 6; i++) {
      const cbs = rafQ;
      rafQ = [];
      for (const cb of cbs) cb(16 * i, frame);
      await tick();
    }
  };

  // Prime the screen-position cache.
  loopCb(0, frame);
  await tick();

  // First health check (t=2600): divergence ~9 cm registers, but
  // one diverged check must NOT move the model.
  loopCb(2600, frame);
  await tick();
  let rec = engine.anchors.get('m1');
  check('first diverged check only registers', rec._healthDiverged === 1);
  check('model unmoved after one diverged check', rec.position[1] === 0.05);
  check('old anchor still in place', rec.xrAnchor === oldAnchor);

  // Second consecutive diverged check (t=5200): re-anchor.
  loopCb(5200, frame);
  await pumpSession();
  await tick();
  rec = engine.anchors.get('m1');
  check('model adopted the current surface height', Math.abs(rec.position[1] - 0) < 1e-6);
  check('model re-anchored to the fresh trackable anchor', rec.xrAnchor === freshAnchor);
  check('old anchor released', oldAnchorDeleted === true);
  check('health state reset after re-anchor', (rec._healthDiverged || 0) === 0 && rec._healthPending === false);
});
