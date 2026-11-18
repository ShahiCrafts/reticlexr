// Drag with NO tracked planes and a hit-test source that never
// returns results — the minimal-feature session posture
// (plane-detection off). Positioning must come from the math
// drag plane alone, which needs the provisional plane height +
// grab offset. Regression covered: the seeding used to run only
// while planeY was null, but planeY was assigned before the ray
// test — if the first frame's ray missed the plane (finger near
// the horizon at grab time), the offset never seeded and the
// drag was silently dead for the whole gesture (device report
// 2026-11-18, the minimal-feature A/B build). Tracked polygons
// had masked it: their branch needs no offset.

import { test, expect } from 'vitest';

test('drag06', async () => {
  globalThis.XRRay = class {
    constructor(origin, direction) { this.origin = origin; this.direction = direction; }
  };
  const THREE = await import('three');
  const { ARCoreWeb } = await import('../../src/web.js');
  const check = (name, cond) => expect(cond, name).toBe(true);
  const tick = () => new Promise((r) => setTimeout(r, 5));
  const near = (a, b) => Math.abs(a - b) < 1e-3;

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
    getHitTestResults: () => [], // the drag source never hits
  };

  check('beginDragMove accepts the placed model', engine.beginDragMove('m1') === true);

  // Frame 1: the finger grabs near the TOP of the screen — the
  // ray is near-horizontal and cannot meet the model's plane, so
  // the grab offset cannot seed yet. The model must not move,
  // and the drag must NOT be dead.
  engine.updateDragPoint(0.5, 0.05);
  loopCb(16, frame);
  await tick();
  let pos = engine.anchors.get('m1').position;
  check('no movement while the ray misses the plane', near(pos[0], 0) && near(pos[2], -2));
  check('plane height seeded from the model', engine._dragMove.planeY === 0);
  check('grab offset still unseeded after the missed ray', engine._dragMove.grabOffset === null);

  // Frame 2: the finger comes down to the model. The offset
  // seeds on THIS frame (the retry), and because it is computed
  // from the current centre, the model does not jump.
  engine.updateDragPoint(0.5, 0.75);
  loopCb(32, frame);
  await tick();
  pos = engine.anchors.get('m1').position;
  check('grab offset seeded on the retry frame', engine._dragMove.grabOffset !== null);
  check('model unmoved at the grab point', near(pos[0], 0) && near(pos[1], 0) && near(pos[2], -2));

  // Frame 3: slide right — the model follows on the math plane
  // alone (same geometry as drag05: centre to (1.4, 0, -2)).
  engine.updateDragPoint(0.75, 0.75);
  loopCb(48, frame);
  await tick();
  pos = engine.anchors.get('m1').position;
  check('model follows the finger with no planes and no source hits',
    near(pos[0], 1.4) && near(pos[1], 0) && near(pos[2], -2));
  check('rendered object matches the record',
    near(root.position.x, 1.4) && near(root.position.z, -2));
});
