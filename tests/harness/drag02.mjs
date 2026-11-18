// Engine drag tracking (drag-to-move, third implementation): while
// a drag is active the loop positions the model EVERY FRAME by
// intersecting the finger's current ray with the drag plane (the
// surface height established by the drag's first hit), re-applying
// the grab offset so the grabbed spot stays under the finger.
// Hit-test sources run alongside only to establish/refresh the
// plane height — positioning from their hits trailed the finger,
// because a source's ray is fixed at its creation-time point.
// Stub session + stub render loop, modelled on perf02:
//  A. beginDragMove rejects unknown models; updateDragPoint with no
//     drag is a no-op.
//  B. The loop creates ONE source whose ray matches the drag point;
//     its first hit establishes plane + grab offset WITHOUT moving
//     the model (no centre snap).
//  C. Moving the point positions the model the SAME frame from the
//     current ray (before the new source's hit lands); the stale
//     source is cancelled and a fresh one created; a later source
//     hit does not teleport the model.
//  D. endDragMove cancels the live source; later frames do nothing.

import { test, expect } from 'vitest';

test('drag02', async () => {
  globalThis.XRRay = class {
    constructor(origin, direction) { this.origin = origin; this.direction = direction; }
  };
  const THREE = await import('three');
  const { ARCoreWeb, rayFromScreenPoint } = await import('../../src/web.js');
  const check = (name, cond) => expect(cond, name).toBe(true);
  const tick = () => new Promise((r) => setTimeout(r, 5));
  const near = (a, b) => Math.abs(a - b) < 1e-6;

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
  let hitPosition = [3, 0, -2];
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
  // The viewer hovers 1.4 m above the drag plane (y=0), like a held
  // phone — a viewer IN the plane could never ray-hit it.
  const identityTransform = {
    position: { x: 0, y: 1.4, z: 0 },
    orientation: { x: 0, y: 0, z: 0, w: 1 },
  };
  const near4 = (a, b) => Math.abs(a - b) < 1e-4;
  const frame = {
    getViewerPose: () => ({ transform: identityTransform, views: [{ projectionMatrix: proj }] }),
    getHitTestResults: (src) => {
      if (engine._dragMove && src === engine._dragMove.source) {
        return [{
          getPose: () => ({
            transform: {
              position: { x: hitPosition[0], y: hitPosition[1], z: hitPosition[2] },
              orientation: { x: 0, y: 0, z: 0, w: 1 },
            },
          }),
        }];
      }
      return [];
    },
  };

  // ---------- A: guards ----------
  check('beginDragMove rejects an unknown model', engine.beginDragMove('nope') === false);
  engine.updateDragPoint(0.5, 0.5); // no drag: must not throw
  loopCb(0, frame);
  check('no source without a drag', sources.length === 0);

  // ---------- B: source creation + first hit ----------
  check('beginDragMove accepts the placed model', engine.beginDragMove('m1') === true);
  engine.updateDragPoint(0.75, 0.25);
  loopCb(16, frame);
  await tick();
  check('one hit-test source created', sources.length === 1);
  const expected = rayFromScreenPoint(identityTransform, proj, 0.75, 0.25);
  const ray = sources[0].offsetRay;
  check(
    'the source ray matches the drag point',
    near(ray.direction.x, expected.direction.x) &&
    near(ray.direction.y, expected.direction.y) &&
    near(ray.direction.z, expected.direction.z)
  );
  loopCb(32, frame);
  check(
    'the first hit established the drag plane',
    engine._dragMove.planeY === 0
  );
  check(
    'the first hit recorded the grab offset (centre - hit)',
    engine._dragMove.grabOffset.x === -3 && engine._dragMove.grabOffset.z === 2
  );
  check(
    'the first hit did NOT snap the model to the hit',
    root.position.x === 0 && root.position.y === 0 && root.position.z === 0
  );

  // ---------- C: the point moves on ----------
  engine.updateDragPoint(0.25, 0.75);
  loopCb(48, frame);
  // The new point's ray from (0, 1.4, 0) meets the plane at
  // (-1.4, 0, -2.8); with the grab offset (-3, +2) the model must
  // be at (-4.4, 0, -0.8) in THIS frame — before the replacement
  // source's hit has landed.
  check(
    'the model followed the current ray the same frame',
    near4(root.position.x, -4.4) && root.position.y === 0 && near4(root.position.z, -0.8)
  );
  check(
    'the anchor record followed',
    near4(engine.anchors.get('m1').position[0], -4.4) &&
    near4(engine.anchors.get('m1').position[2], -0.8)
  );
  await tick();
  check('the stale source was cancelled', sources[0].cancelled === true);
  check('a fresh source was created', sources.length === 2);
  hitPosition = [-1, 0, -4];
  loopCb(64, frame);
  check(
    'the new source hit did not teleport the model',
    near4(root.position.x, -4.4) && near4(root.position.z, -0.8)
  );

  // ---------- D: end ----------
  engine.endDragMove();
  check('endDragMove cancelled the live source', sources[1].cancelled === true);
  loopCb(80, frame);
  await tick();
  check('no new sources after the drag ended', sources.length === 2);
  check('the model stayed put', near4(root.position.x, -4.4) && near4(root.position.z, -0.8));
});
