// The Damper (critically damped spring, model-viewer design)
// and height-following across a surface step.
//  A. A damper at its goal stays there.
//  B. A step goal is approached monotonically — critically
//     damped means no overshoot, ever — and converges.
//  C. The velocity clamp caps a runaway step.
//  D. A drag whose hits climb a 0.3 m step carries the goal (and
//     then the model) up by the hit deltas: the surface height
//     follows the finger across surfaces of different heights.

import { test, expect } from 'vitest';

test('drag07', async () => {
  const THREE = await import('three');
  const { ARCoreWeb, Damper } = await import('../../src/web.js');
  const check = (name, cond) => expect(cond, name).toBe(true);
  const near = (a, b, eps = 1e-3) => Math.abs(a - b) < eps;
  const near3 = (p, q, eps = 1e-3) =>
    near(p[0], q[0], eps) && near(p[1], q[1], eps) && near(p[2], q[2], eps);

  // ---------- A/B: damper behaviour ----------
  {
    const d = new Damper(50, 4);
    let x = d.update(2, 2, 1 / 60);
    check('damper at goal stays at goal', x === 2 && d.velocity === 0);
    let prev = 0;
    let overshot = false;
    x = 0;
    for (let i = 0; i < 60; i++) {
      x = d.update(x, 1, 1 / 60);
      if (x < prev - 1e-12) overshot = true; // moved AWAY: not monotonic
      if (x > 1 + 1e-9) overshot = true; // past the goal: overshoot
      prev = x;
    }
    check('damper approach is monotonic, no overshoot', !overshot);
    check('damper converges to the goal', near(x, 1, 1e-4));
  }

  // ---------- C: velocity clamp ----------
  {
    const d = new Damper(50, 1.5);
    d.update(0, 100, 1 / 60); // absurd step
    check('velocity clamped', Math.abs(d.velocity) <= 1.5);
  }

  // ---------- D: climbing a step by hit deltas ----------
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
    modelUrl: 'x.glb', position: [0, 0, -2], rotation: [0, 0, 0, 1], scale: [1, 1, 1],
  });
  engine.loadedModels.set('m1', root);
  engine.session = {
    requestHitTestSource: async () => ({ cancel() {} }),
    addEventListener: () => {},
    removeEventListener: () => {},
  };
  engine.transientHitTestSource = { cancel() {} };
  engine.startRendering();

  const proj = new THREE.PerspectiveCamera(90, 1, 0.1, 100).projectionMatrix.toArray();
  const viewerTransform = {
    position: { x: 0, y: 1.4, z: 0 },
    orientation: { x: 0, y: 0, z: 0, w: 1 },
    matrix: new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1.4, 0, 1]),
  };
  const inputSource = { targetRaySpace: {} };
  let entries = [];
  const hitEntry = (pos) => ({
    inputSource,
    results: [{
      getPose: () => ({
        transform: {
          position: { x: pos[0], y: pos[1], z: pos[2] },
          orientation: { x: 0, y: 0, z: 0, w: 1 },
        },
      }),
    }],
  });
  const frame = {
    getViewerPose: () => ({ transform: viewerTransform, views: [{ projectionMatrix: proj }] }),
    getPose: () => undefined,
    getHitTestResults: () => [],
    getHitTestResultsForTransientInput: () => entries,
  };
  let ts = 0;
  const runFrames = (n) => { for (let i = 0; i < n; i++) { ts += 16; loopCb(ts, frame); } };

  check('beginDragMove accepts the placed model', engine.beginDragMove('m1') === true);
  engine.updateDragPoint(0.5, 0.75);
  entries = [hitEntry([0, 0, -2.2])]; // on the floor, under the finger
  runFrames(1);
  entries = [hitEntry([0.2, 0, -2.3])]; // sliding on the floor
  runFrames(1);
  check('goal followed the floor slide', near3(engine._dragMove.goal, [0.2, 0, -2.1], 0.01));
  entries = [hitEntry([0.4, 0.3, -2.4])]; // the finger climbs a 0.3 m step
  runFrames(1);
  check('goal climbed the step by the hit delta', near3(engine._dragMove.goal, [0.4, 0.3, -2.2], 0.01));
  runFrames(50);
  check('model settled on the step', near3(engine.anchors.get('m1').position, [0.4, 0.3, -2.2], 0.01));
  check('rendered object matches the record', near(root.position.y, 0.3, 0.01));
});
