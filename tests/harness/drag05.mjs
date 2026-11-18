// Drag positioning from the REAL tracked plane polygons (the
// geometry that makes taps land exactly), with the math drag
// plane as fallback and a hard rule that a full miss moves
// NOTHING — a drag must never make the model vanish or fly off
// (device report 2026-11-18: "while dragging the model vanishes
// ... we should show the model while moving too"). Also covers
// the screen-position cache behind ARView's grab gate.

import { test, expect } from 'vitest';

test('drag05', async () => {
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
  engine.planeDetectionSupported = true;
  engine.config.showReticle = false;
  engine.scene = new THREE.Scene();
  const root = new THREE.Group();
  engine.scene.add(root);
  engine.anchors.set('m1', {
    modelUrl: 'x.glb', position: [0, 0, -2], rotation: [0, 0, 0, 1], scale: [1, 1, 1],
  });
  engine.loadedModels.set('m1', root);

  // One tracked floor plane, polygon x in [-3, 3], z in [-5, 1].
  const planeSpace = {};
  engine.detectedPlanes.set('p1', {
    planeSpace,
    orientation: 'horizontal',
    polygon: [
      { x: -3, z: 1 }, { x: 3, z: 1 }, { x: 3, z: -5 }, { x: -3, z: -5 },
    ],
  });

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
    // Column-major view transform for the projection helper.
    matrix: new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1.4, 0, 1]),
  };
  const frame = {
    getViewerPose: () => ({ transform: viewerTransform, views: [{ projectionMatrix: proj }] }),
    getPose: (space) => (space === planeSpace
      ? { transform: { position: { x: 0, y: 0, z: 0 }, orientation: { x: 0, y: 0, z: 0, w: 1 } } }
      : undefined),
    getHitTestResults: () => [], // sources never hit: polygons must do the work
  };

  check('beginDragMove accepts the placed model', engine.beginDragMove('m1') === true);

  // Grab the model where it stands: ray through (0.5, 0.75) meets
  // the floor at (0, 0, -2.8); the grab offset (0, +0.8) keeps the
  // centre exactly where it was.
  engine.updateDragPoint(0.5, 0.75);
  loopCb(16, frame);
  await tick();
  let pos = engine.anchors.get('m1').position;
  check('model unmoved at the grab point', near(pos[0], 0) && near(pos[1], 0) && near(pos[2], -2));

  // Slide the finger right: the model must follow DURING the drag
  // (not only on release) — ray through (0.75, 0.75) meets the
  // floor at (1.4, 0, -2.8), so the centre goes to (1.4, 0, -2).
  engine.updateDragPoint(0.75, 0.75);
  loopCb(32, frame);
  await tick();
  pos = engine.anchors.get('m1').position;
  check('model follows the finger mid-drag', near(pos[0], 1.4) && near(pos[1], 0) && near(pos[2], -2));
  check(
    'rendered object matches the record mid-drag',
    near(root.position.x, 1.4) && near(root.position.z, -2)
  );

  // Flick the finger to the top of the screen (ray points up, off
  // every surface): the model must STAY at its last drag position
  // — never vanish, never fly off.
  engine.updateDragPoint(0.5, 0.05);
  loopCb(48, frame);
  await tick();
  pos = engine.anchors.get('m1').position;
  check('a full miss leaves the model where it was', near(pos[0], 1.4) && near(pos[2], -2));

  // The screen-position cache (ARView's grab gate) tracks the
  // model: at (1.4, 0, -2) from a camera at (0, 1.4, 0) with a 90°
  // lens it projects to about (0.85, 0.85).
  await new Promise((r) => setTimeout(r, 120));
  loopCb(200, frame);
  await tick();
  const sp = engine.getModelScreenPosition('m1');
  check('screen position cached', !!sp);
  check('screen position plausible', sp.x > 0.8 && sp.x < 0.9 && sp.y > 0.8 && sp.y < 0.9);
  check('unknown model has no screen position', engine.getModelScreenPosition('nope') === null);
});
