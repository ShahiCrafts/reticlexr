// Drag with NO hit-test results at all (short-drag insurance):
// the loop seeds a provisional drag plane (the model's own anchor
// height) and grab offset from the first frame's ray, so the model
// tracks the finger even if the drag ends before any hit-test
// source delivers — previously such a drag moved nothing. Same
// stub rig as drag02, except getHitTestResults always returns [].

import { test, expect } from 'vitest';

test('drag04', async () => {
  globalThis.XRRay = class {
    constructor(origin, direction) { this.origin = origin; this.direction = direction; }
  };
  const THREE = await import('three');
  const { ARCoreWeb } = await import('../../src/web.js');
  const check = (name, cond) => expect(cond, name).toBe(true);
  const tick = () => new Promise((r) => setTimeout(r, 5));
  const near4 = (a, b) => Math.abs(a - b) < 1e-4;

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

  const sources = [];
  engine.session = {
    requestHitTestSource: async ({ offsetRay }) => {
      const src = { offsetRay, cancelled: false, cancel() { this.cancelled = true; } };
      sources.push(src);
      return src;
    },
    addEventListener: () => {},
    removeEventListener: () => {},
  };
  engine.startRendering();

  const proj = new THREE.PerspectiveCamera(90, 1, 0.1, 100).projectionMatrix.toArray();
  const viewerTransform = {
    position: { x: 0, y: 1.4, z: 0 },
    orientation: { x: 0, y: 0, z: 0, w: 1 },
  };
  const frame = {
    getViewerPose: () => ({ transform: viewerTransform, views: [{ projectionMatrix: proj }] }),
    getHitTestResults: () => [], // no hits, ever
  };

  check('beginDragMove accepts the placed model', engine.beginDragMove('m1') === true);
  engine.updateDragPoint(0.25, 0.75);
  loopCb(16, frame);
  await tick();
  // The ray through (0.25, 0.75) from (0, 1.4, 0) meets y=0 at
  // (-1.4, 0, -2.8); the provisional grab offset is centre - that
  // = (1.4, 2.8), so the model correctly does not move yet: the
  // grabbed point is under the finger.
  check('provisional plane seeded from the anchor height', engine._dragMove.planeY === 0);
  check(
    'provisional grab offset recorded',
    engine._dragMove.grabOffset &&
    near4(engine._dragMove.grabOffset.x, 1.4) &&
    near4(engine._dragMove.grabOffset.z, 2.8)
  );
  check(
    'model unmoved while the finger is at the grab point',
    root.position.x === 0 && root.position.z === 0
  );
  check('a hit-test source was still created', sources.length === 1);

  // The finger slides right; with zero hit results the model must
  // still follow: the new ray meets the plane at (0, 0, -2.8), so
  // the target is (0 + 1.4, 0, -2.8 + 2.8) = (1.4, 0, 0).
  engine.updateDragPoint(0.5, 0.75);
  loopCb(32, frame);
  check(
    'model followed the finger with no hit-test results',
    near4(root.position.x, 1.4) && root.position.y === 0 && near4(root.position.z, 0)
  );

  engine.endDragMove();
  check('drag state cleared', engine._dragMove === null);
});
