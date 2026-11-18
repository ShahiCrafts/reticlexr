// Drag pipeline (model-viewer design, system design 2026-11-18):
// the loop reads the session's TRANSIENT-input hit-test source
// while a gesture is active and moves a GOAL position by delta
// accumulation — each accepted hit moves the goal by the change
// since the last hit, so the grabbed point stays under the
// finger (no centre snap, no grab-offset bookkeeping). The
// rendered position eases toward the goal through critically
// damped springs, so it approaches without overshoot. Frames
// where the hit test misses fall back to intersecting the finger
// ray with the last real surface plane (same delta rule); hits
// whose surface normal is not near-horizontal are rejected; a
// second finger pauses translation and forgets the last hit so
// resuming never jumps.
//  A. Guards: unknown model rejected; updateDragPoint with no
//     drag is a no-op.
//  B. The first hit only SEEDS (goal and model unmoved).
//  C. The second hit moves the goal by the delta; the position
//     damps toward it and converges without overshoot.
//  D. A wall-normal hit is rejected (goal unchanged).
//  E. A hit-test gap falls back to the finger ray on the last
//     surface plane (goal follows by the plane delta).
//  F. Two inputs pause translation and reset the last hit.
//  G. endDragMove clears state; the session-scoped transient
//     source is NOT cancelled.

import { test, expect } from 'vitest';

test('drag02', async () => {
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
    modelUrl: 'x.glb', position: [0, 0, -2], rotation: [0, 0, 0, 1], scale: [1, 1, 1],
  });
  engine.loadedModels.set('m1', root);
  engine.session = {
    requestHitTestSource: async () => ({ cancel() {} }),
    addEventListener: () => {},
    removeEventListener: () => {},
  };
  let transientCancelled = false;
  engine.transientHitTestSource = { cancel() { transientCancelled = true; } };
  engine.startRendering();

  const proj = new THREE.PerspectiveCamera(90, 1, 0.1, 100).projectionMatrix.toArray();
  const viewerTransform = {
    position: { x: 0, y: 1.4, z: 0 },
    orientation: { x: 0, y: 0, z: 0, w: 1 },
    matrix: new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1.4, 0, 1]),
  };
  const quatOf = (x, y, z) => {
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z));
    return { x: q.x, y: q.y, z: q.z, w: q.w };
  };
  const inputSource = { targetRaySpace: { kind: 'finger-ray' } };
  // Finger pose: by default a horizontal ray (fallback misses).
  let fingerPose = {
    transform: {
      position: { x: 0, y: 1.4, z: 0 },
      orientation: { x: 0, y: 0, z: 0, w: 1 },
    },
  };
  let transientEntries = [];
  const hitEntry = (pos, quat = { x: 0, y: 0, z: 0, w: 1 }) => ({
    inputSource,
    results: [{
      getPose: () => ({ transform: { position: { x: pos[0], y: pos[1], z: pos[2] }, orientation: quat } }),
    }],
  });
  const frame = {
    getViewerPose: () => ({ transform: viewerTransform, views: [{ projectionMatrix: proj }] }),
    getPose: (space) => (space === inputSource.targetRaySpace ? fingerPose : undefined),
    getHitTestResults: () => [],
    getHitTestResultsForTransientInput: () => transientEntries,
  };
  let ts = 0;
  const runFrames = (n) => { for (let i = 0; i < n; i++) { ts += 16; loopCb(ts, frame); } };

  // ---------- A: guards ----------
  check('beginDragMove rejects an unknown model', engine.beginDragMove('nope') === false);
  engine.updateDragPoint(0.5, 0.5); // no drag: must not throw
  runFrames(1);
  check('no drag state without begin', engine._dragMove == null);

  // ---------- B: the first hit only seeds ----------
  check('beginDragMove accepts the placed model', engine.beginDragMove('m1') === true);
  engine.updateDragPoint(0.5, 0.75);
  transientEntries = [hitEntry([0.3, 0, -2.6])];
  runFrames(1);
  check('first hit seeded the surface tracker', near3(engine._dragMove.lastHit, [0.3, 0, -2.6]));
  check('first hit did NOT move the goal', near3(engine._dragMove.goal, [0, 0, -2]));
  check('first hit did NOT move the model', near3(engine.anchors.get('m1').position, [0, 0, -2]));

  // ---------- C: delta accumulation + damped converge ----------
  transientEntries = [hitEntry([0.7, 0, -2.6])];
  runFrames(1);
  check('goal moved by the hit delta only', near3(engine._dragMove.goal, [0.4, 0, -2]));
  const midPos = [...engine.anchors.get('m1').position];
  check('position eased toward the goal (not teleported)', midPos[0] > 0 && midPos[0] < 0.4);
  runFrames(120);
  check('position converged to the goal', near3(engine.anchors.get('m1').position, [0.4, 0, -2]));
  check('no overshoot past the goal', engine.anchors.get('m1').position[0] <= 0.4 + 1e-9);
  check('rendered object matches the record', near(root.position.x, 0.4) && near(root.position.z, -2));

  // ---------- D: wall-normal hit rejected ----------
  transientEntries = [hitEntry([0.9, 0.5, -2.6], quatOf(Math.PI / 2, 0, 0))];
  runFrames(2);
  check('wall hit rejected: goal unchanged', near3(engine._dragMove.goal, [0.4, 0, -2]));

  // ---------- E: hit gap -> finger-ray fallback on the last plane ----------
  // Finger ray from (0.5, 1.4, -1.19) tilted 60 degrees down meets
  // the y=0 surface plane at (0.5, 0, -2.0); the last plane point
  // was the last hit (0.7, 0, -2.6), so the goal moves by
  // (-0.2, 0, +0.6).
  fingerPose = {
    transform: {
      position: { x: 0.5, y: 1.4, z: -1.19 },
      orientation: quatOf(-Math.PI / 3, 0, 0),
    },
  };
  transientEntries = [{ inputSource, results: [] }];
  runFrames(1);
  check('fallback moved the goal by the plane delta', near3(engine._dragMove.goal, [0.2, 0, -1.4], 0.02));

  // ---------- F: two inputs pause and reset ----------
  transientEntries = [hitEntry([2, 0, -4]), hitEntry([2.2, 0, -4])];
  runFrames(1);
  check('two inputs: goal unchanged', near3(engine._dragMove.goal, [0.2, 0, -1.4], 0.02));
  check('two inputs: last hit forgotten', engine._dragMove.lastHit === null);
  transientEntries = [hitEntry([2, 0, -4])];
  runFrames(1);
  check('resume re-seeds without jumping', near3(engine._dragMove.goal, [0.2, 0, -1.4], 0.02));

  // ---------- G: end ----------
  engine.endDragMove();
  check('drag state cleared', engine._dragMove === null);
  check('transient source survives the drag (session-scoped)', transientCancelled === false);
  // The model freezes at its last damped position (the caller's
  // release settle lands it precisely in production); later
  // frames must not move it at all.
  const frozen = [...engine.anchors.get('m1').position];
  runFrames(2);
  check('model stayed put after the drag', near3(engine.anchors.get('m1').position, frozen, 1e-9));
});
