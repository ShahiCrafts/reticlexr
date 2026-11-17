// Engine drag tracking (drag-to-move, second implementation): while
// a drag is active the render loop keeps a hit-test source for the
// latest drag point and applies hits directly, so the model stays
// within a frame or two of the finger. Stub session + stub render
// loop, modelled on perf02:
//  A. beginDragMove rejects unknown models; updateDragPoint with no
//     drag is a no-op.
//  B. The loop creates ONE source whose ray matches the drag point,
//     then applies the hit to the model and the anchor record.
//  C. Moving the point cancels the old source, creates a new one,
//     and the model follows the new hit.
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
  const identityTransform = {
    position: { x: 0, y: 0, z: 0 },
    orientation: { x: 0, y: 0, z: 0, w: 1 },
  };
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
    'the hit moved the model root',
    root.position.x === 3 && root.position.y === 0 && root.position.z === -2
  );
  check(
    'the anchor record followed',
    JSON.stringify(engine.anchors.get('m1').position) === '[3,0,-2]'
  );

  // ---------- C: the point moves on ----------
  engine.updateDragPoint(0.25, 0.75);
  loopCb(48, frame);
  await tick();
  check('the stale source was cancelled', sources[0].cancelled === true);
  check('a fresh source was created', sources.length === 2);
  hitPosition = [-1, 0, -4];
  loopCb(64, frame);
  check(
    'the model followed the new hit',
    root.position.x === -1 && root.position.z === -4
  );

  // ---------- D: end ----------
  engine.endDragMove();
  check('endDragMove cancelled the live source', sources[1].cancelled === true);
  loopCb(80, frame);
  await tick();
  check('no new sources after the drag ended', sources.length === 2);
  check('the model stayed put', root.position.x === -1 && root.position.z === -4);
});
