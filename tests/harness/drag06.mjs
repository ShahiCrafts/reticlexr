// Drag with NO tracked planes and NO hit results — the
// minimal-feature session posture (plane-detection off, no
// transient source in this rig). Positioning comes from the DOM
// fallback plane alone. Regression covered: a first frame whose
// ray misses the plane entirely (finger near the horizon at grab
// time) must neither move the model nor kill the drag — earlier
// pipelines seeded their drag state exactly once, from that
// first frame, and a miss left the whole gesture silently dead
// (device report 2026-11-18, the minimal-feature A/B build). The
// delta machinery seeds whenever the ray first lands, however
// late in the gesture that is.

import { test, expect } from 'vitest';

test('drag06', async () => {
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
  engine.planeDetectionSupported = false; // minimal-feature posture
  engine.config.showReticle = false;
  engine.scene = new THREE.Scene();
  const root = new THREE.Group();
  engine.scene.add(root);
  engine.anchors.set('m1', {
    modelUrl: 'x.glb', position: [0, 0, -2], rotation: [0, 0, 0, 1], scale: [1, 1, 1],
  });
  engine.loadedModels.set('m1', root);
  // detectedPlanes stays empty: no polygon path exists.

  engine.session = {
    requestHitTestSource: async () => ({ cancel() {} }),
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
    getPose: () => undefined,
    getHitTestResults: () => [], // no hits, ever
  };
  let ts = 0;
  const runFrames = (n) => { for (let i = 0; i < n; i++) { ts += 16; loopCb(ts, frame); } };

  check('beginDragMove accepts the placed model', engine.beginDragMove('m1') === true);

  // Frame 1: the finger grabs near the TOP of the screen — the
  // ray cannot meet the model's plane, so nothing can seed yet.
  // The model must not move, and the drag must NOT be dead.
  engine.updateDragPoint(0.5, 0.05);
  runFrames(1);
  let pos = engine.anchors.get('m1').position;
  check('no movement while the ray misses the plane', near3(pos, [0, 0, -2]));
  check('nothing seeded after the missed ray', engine._dragMove.lastPlanePoint === null);
  check('drag still alive after the missed ray', engine._dragMove !== null);

  // Frame 2: the finger comes down to the model. The plane point
  // seeds on THIS frame, and because deltas are computed from it,
  // the model does not jump.
  engine.updateDragPoint(0.5, 0.75);
  runFrames(1);
  check('plane point seeded on the retry frame', engine._dragMove.lastPlanePoint !== null);
  check('model unmoved at the grab point', near3(engine.anchors.get('m1').position, [0, 0, -2]));

  // Frame 3+: slide right — the model follows on the fallback
  // plane alone and the damped position converges to the same
  // target the old math-plane pipeline produced: (1.4, 0, -2).
  engine.updateDragPoint(0.75, 0.75);
  runFrames(1);
  check('goal followed the finger', near3(engine._dragMove.goal, [1.4, 0, -2], 0.01));
  runFrames(120);
  pos = engine.anchors.get('m1').position;
  check('model converged with no planes and no source hits', near3(pos, [1.4, 0, -2]));
  check('rendered object matches the record', near(root.position.x, 1.4) && near(root.position.z, -2));
});
