// Synchronous tracked-plane raycast (the instant-placement fast
// path): when a tap ray crosses a plane the runtime is already
// tracking, hitTestAtPoint must settle on the FIRST frame from the
// polygon intersection — without creating a hit-test source. The
// WebXR source path is asynchronous (create source, wait frames),
// so taps resolved through it land where the phone pointed when
// the results arrived, not where the finger touched. A ray that
// misses every tracked polygon still falls through to the source
// path (and, beyond it, the floor fallback).

import { test, expect } from 'vitest';

test('hitplane01', async () => {
  globalThis.XRRay = class {
    constructor(origin, direction) { this.origin = origin; this.direction = direction; }
  };
  const THREE = await import('three');
  const { ARCoreWeb } = await import('../../src/web.js');
  const check = (name, cond) => expect(cond, name).toBe(true);
  const near = (a, b) => Math.abs(a - b) < 1e-4;

  const engine = new ARCoreWeb();
  engine.referenceSpace = {};
  engine.planeDetectionSupported = true;

  // One tracked floor plane: pose at (0, 0, -2), identity rotation,
  // polygon ±1 m → covers world x ∈ [-1, 1], z ∈ [-3, -1].
  const planeSpace = {};
  const plane = {
    planeSpace,
    orientation: 'horizontal',
    polygon: [
      { x: -1, y: 0, z: -1 },
      { x: 1, y: 0, z: -1 },
      { x: 1, y: 0, z: 1 },
      { x: -1, y: 0, z: 1 },
    ],
  };
  engine.detectedPlanes.set(plane, { orientation: 'horizontal', mesh: null, dots: null });

  let rafQueue = [];
  let sourceCount = 0;
  engine.session = {
    requestAnimationFrame: (cb) => { rafQueue.push(cb); return rafQueue.length; },
    requestHitTestSource: async () => {
      sourceCount++;
      return { cancel() {} };
    },
    addEventListener: () => {},
    removeEventListener: () => {},
  };

  const proj = new THREE.PerspectiveCamera(90, 1, 0.1, 100).projectionMatrix.toArray();
  const frame = {
    getViewerPose: () => ({
      transform: {
        position: { x: 0, y: 1.4, z: 0 },
        orientation: { x: 0, y: 0, z: 0, w: 1 },
      },
      views: [{ projectionMatrix: proj }],
    }),
    getPose: (space) =>
      space === planeSpace
        ? {
            transform: {
              position: { x: 0, y: 0, z: -2 },
              orientation: { x: 0, y: 0, z: 0, w: 1 },
            },
          }
        : null,
    getHitTestResults: () => [],
  };

  async function pumpUntilSettled(promise) {
    let result = null;
    promise.then((r) => { result = r; });
    for (let i = 0; i < 30 && result === null; i++) {
      const cbs = rafQueue;
      rafQueue = [];
      for (const cb of cbs) await cb(16 * i, frame);
      await new Promise((r) => setTimeout(r, 1));
    }
    return result;
  }

  // A: tap (0.5, 0.75) — the ray meets y=0 at (0, 0, -2.8), inside
  // the tracked polygon → instant settle, no source created.
  {
    const before = sourceCount;
    const result = await pumpUntilSettled(engine.hitTestAtPoint(0.5, 0.75));
    check('tracked-plane tap hits', result && result.hit === true);
    check(
      'hit position is the polygon intersection (0, 0, -2.8)',
      near(result.position[0], 0) && near(result.position[1], 0) && near(result.position[2], -2.8)
    );
    check('plane type comes from the tracked plane', result.planeType === 'horizontal');
    check('no hit-test source was created', sourceCount === before);
  }

  // B: tap (0.95, 0.75) — lands at x ≈ 2.52 on the floor, outside
  // every tracked polygon → falls through to the source path,
  // which (with no results and no floor history) settles a miss.
  {
    const before = sourceCount;
    const result = await pumpUntilSettled(engine.hitTestAtPoint(0.95, 0.75));
    check('off-polygon tap settles as a miss', result && result.hit === false);
    check('the source path was used as fallback', sourceCount === before + 1);
  }
});
