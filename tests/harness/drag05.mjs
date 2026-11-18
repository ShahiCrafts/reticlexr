// Drag positioning from the REAL tracked plane polygons (the
// geometry that makes taps land exactly) on the DOM fallback
// path, with a hard rule that a full miss moves NOTHING — a drag
// must never make the model vanish or fly off (device report
// 2026-11-18: "while dragging the model vanishes ... we should
// show the model while moving too"). Polygon hits feed the same
// delta machinery as transient hits: the first only seeds, later
// ones move the goal by their deltas, and the damped position
// converges. Also covers the screen-position cache behind
// ARView's grab gate.

import { test, expect } from 'vitest';

test('drag05', async () => {
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
  engine.planeDetectionSupported = true;
  engine.config.showReticle = false;
  engine.scene = new THREE.Scene();
  const root = new THREE.Group();
  engine.scene.add(root);
  engine.anchors.set('m1', {
    modelUrl: 'x.glb', position: [0, 0, -2], rotation: [0, 0, 0, 1], scale: [1, 1, 1],
  });
  engine.loadedModels.set('m1', root);

  // One tracked floor plane, polygon x in [-3, 3], z in [-5, 1],
  // keyed the way production keys it: by the plane object itself.
  const planeSpace = {};
  const xrPlane = {
    planeSpace,
    orientation: 'horizontal',
    lastChangedTime: 1,
    polygon: [
      { x: -3, z: 1 }, { x: 3, z: 1 }, { x: 3, z: -5 }, { x: -3, z: -5 },
    ],
  };
  engine.detectedPlanes.set(xrPlane, { orientation: 'horizontal', lastChangedTime: 1, mesh: null, dots: null });

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
    detectedPlanes: new Set([xrPlane]),
    getViewerPose: () => ({ transform: viewerTransform, views: [{ projectionMatrix: proj }] }),
    getPose: (space) => (space === planeSpace
      ? { transform: { position: { x: 0, y: 0, z: 0 }, orientation: { x: 0, y: 0, z: 0, w: 1 }, matrix: new Float32Array(16) } }
      : undefined),
    getHitTestResults: () => [], // sources never hit: polygons must do the work
  };
  let ts = 0;
  const runFrames = (n) => { for (let i = 0; i < n; i++) { ts += 16; loopCb(ts, frame); } };

  check('beginDragMove accepts the placed model', engine.beginDragMove('m1') === true);

  // Grab the model where it stands: the ray through (0.5, 0.75)
  // meets the polygon at (0, 0, -2.8) — a seed only, no motion.
  engine.updateDragPoint(0.5, 0.75);
  runFrames(1);
  let pos = engine.anchors.get('m1').position;
  check('polygon hit seeded the drag', near3(engine._dragMove.lastHit, [0, 0, -2.8], 0.01));
  check('model unmoved at the grab point', near3(pos, [0, 0, -2]));

  // Slide the finger right: the polygon hit moves to
  // (1.4, 0, -2.8), the goal follows by the delta, and the damped
  // position converges DURING the drag.
  engine.updateDragPoint(0.75, 0.75);
  runFrames(1);
  check('goal followed the polygon hit', near3(engine._dragMove.goal, [1.4, 0, -2], 0.01));
  runFrames(40);
  pos = engine.anchors.get('m1').position;
  check('model converged mid-drag', near3(pos, [1.4, 0, -2]));
  check('rendered object matches the record mid-drag', near(root.position.x, 1.4) && near(root.position.z, -2));

  // Flick the finger to the top of the screen (ray points up, off
  // every surface, and the fallback plane intersection is behind
  // the ray): the model must STAY — never vanish, never fly off.
  engine.updateDragPoint(0.5, 0.05);
  runFrames(3);
  pos = engine.anchors.get('m1').position;
  check('a full miss leaves the model where it was', near3(pos, [1.4, 0, -2]));
  check('a full miss leaves the goal where it was', near3(engine._dragMove.goal, [1.4, 0, -2], 0.01));

  // The screen-position cache (ARView's grab gate) tracks the
  // model: at (1.4, 0, -2) from a camera at (0, 1.4, 0) with a 90°
  // lens it projects to about (0.85, 0.85).
  await new Promise((r) => setTimeout(r, 120));
  ts += 200; loopCb(ts, frame);
  const sp = engine.getModelScreenPosition('m1');
  check('screen position cached', !!sp);
  check('screen position plausible', sp.x > 0.8 && sp.x < 0.9 && sp.y > 0.8 && sp.y < 0.9);
  check('unknown model has no screen position', engine.getModelScreenPosition('nope') === null);
});
