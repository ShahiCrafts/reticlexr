// Drag with NO hit-test results at all and NO transient-input
// API (short-drag insurance, fallback path): the loop drives the
// delta machinery from the DOM drag point — the finger ray meets
// the plane at the model's own goal height, the first frame only
// seeds the plane point (the grabbed spot stays under the
// finger), and later frames move the goal by plane-point deltas,
// with the damped position converging on it. Previously such a
// drag (ending before any source delivered) moved nothing.

import { test, expect } from 'vitest';

test('drag04', async () => {
  const THREE = await import('three');
  const { ARCoreWeb } = await import('../../src/web.js');
  const check = (name, cond) => expect(cond, name).toBe(true);
  const near = (a, b, eps = 1e-3) => Math.abs(a - b) < eps;
  const near3 = (p, q, eps = 1e-3) =>
    near(p[0], q[0], eps) && near(p[1], q[1], eps) && near(p[2], q[2], eps);

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
  engine.anchors.set('m1', {
    modelUrl: 'x.glb', position: [0, 0, 0], rotation: [0, 0, 0, 1], scale: [1, 1, 1],
  });
  engine.loadedModels.set('m1', root);
  engine.session = {
    requestHitTestSource: async () => ({ cancel() {} }),
    addEventListener: () => {},
    removeEventListener: () => {},
  };
  // No transientHitTestSource and no
  // getHitTestResultsForTransientInput on the frame: the DOM
  // fallback path is the only driver.
  engine.startRendering();

  const proj = new THREE.PerspectiveCamera(90, 1, 0.1, 100).projectionMatrix.toArray();
  const viewerTransform = {
    position: { x: 0, y: 1.4, z: 0 },
    orientation: { x: 0, y: 0, z: 0, w: 1 },
    matrix: new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1.4, 0, 1]),
  };
  const frame = {
    getViewerPose: () => ({ transform: viewerTransform, views: [{ projectionMatrix: proj }] }),
    getPose: () => undefined,
    getHitTestResults: () => [],
  };
  let ts = 0;
  const runFrames = (n) => { for (let i = 0; i < n; i++) { ts += 16; loopCb(ts, frame); } };

  check('beginDragMove accepts the placed model', engine.beginDragMove('m1') === true);
  engine.updateDragPoint(0.25, 0.75);
  runFrames(1);
  // The ray through (0.25, 0.75) from (0, 1.4, 0) meets y=0 at
  // (-1.4, 0, -2.8): that only SEEDS the fallback plane point —
  // the grabbed spot is under the finger, so nothing moves.
  check('first frame seeded the plane point', near3(engine._dragMove.lastPlanePoint, [-1.4, 0, -2.8], 0.01));
  check('goal unmoved at the grab point', near3(engine._dragMove.goal, [0, 0, 0]));
  check('model unmoved at the grab point', near3(engine.anchors.get('m1').position, [0, 0, 0]));

  // The finger slides right: the new ray meets the plane at
  // (0, 0, -2.8), so the goal moves by the delta (1.4, 0, 0) and
  // the damped position converges on it.
  engine.updateDragPoint(0.5, 0.75);
  runFrames(1);
  check('goal followed the finger with no hit results at all', near3(engine._dragMove.goal, [1.4, 0, 0], 0.01));
  runFrames(120);
  check('position converged to the goal', near3(engine.anchors.get('m1').position, [1.4, 0, 0]));
  check('rendered object matches the record', near(root.position.x, 1.4) && near(root.position.z, 0));

  engine.endDragMove();
  check('drag state cleared', engine._dragMove === null);
});
