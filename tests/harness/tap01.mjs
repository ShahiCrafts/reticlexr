// Tap-to-place regression harness (device report 2026-11-17: tapping a
// dotted surface never placed the model, with no feedback at all).
// Two links in the tap chain are exercised against the real code:
//  A. engine.hitTestAtPoint must not give up on the first frame whose
//     results are still empty — a freshly created hit-test source
//     commonly delivers its first results a frame or two late.
//  B. When placement still fails, ARView's gesture handler must route
//     the failure to the caller's onError (it previously swallowed
//     placeModel's { success: false } return, so the UI said nothing).

import { test, expect } from 'vitest';

test('tap01', async () => {
  globalThis.window = globalThis;
  globalThis.innerWidth = 400;
  globalThis.innerHeight = 800;
  globalThis.XRRay = class XRRay {
    constructor(origin, direction) { this.origin = origin; this.direction = direction; }
  };
  const THREE = await import('three');
  const { ARCoreWeb } = await import('../../src/web.js');
  const { createARView } = await import('../../src/ar-view.js');
  const check = (name, cond) => expect(cond, name).toBe(true);

  // ---------- A: hitTestAtPoint waits past an empty first frame ----------
  {
    const engine = new ARCoreWeb();
    const rafQueue = [];
    const proj = new THREE.PerspectiveCamera(60, 1, 0.1, 100).projectionMatrix.toArray();
    let resultsCalls = 0;
    const fakeHit = {
      getPose: () => ({
        transform: {
          position: { x: 0.1, y: 0, z: -1 },
          orientation: { x: 0, y: 0, z: 0, w: 1 },
        },
      }),
    };
    const frame = {
      getViewerPose: () => ({
        transform: { position: { x: 0, y: 1.5, z: 0 }, orientation: { x: 0, y: 0, z: 0, w: 1 } },
        views: [{ projectionMatrix: proj }],
      }),
      getHitTestResults: () => (++resultsCalls === 1 ? [] : [fakeHit]),
    };
    engine.session = {
      requestAnimationFrame: (cb) => rafQueue.push(cb),
      addEventListener: () => {},
      removeEventListener: () => {},
      requestHitTestSource: async () => ({ cancel() {} }),
    };
    engine.referenceSpace = {};

    let settled = null;
    const pending = engine.hitTest({ x: 0.3, y: 0.4 }).then((r) => { settled = r; });
    // Pump frames until the promise settles (bounded).
    for (let i = 0; i < 10 && !settled; i++) {
      const cbs = rafQueue.splice(0);
      for (const cb of cbs) await cb(16 * i, frame);
      await new Promise((r) => setTimeout(r, 0));
    }
    await pending;
    check('point hit-test survives an empty first frame', settled && settled.hit === true);
    check('point hit-test returns the hit position', settled && settled.position && settled.position[0] === 0.1);
  }

  // ---------- B: a failed tap reaches onError ----------
  {
    const handlers = {};
    const el = {
      style: {},
      addEventListener: (type, fn) => { handlers[type] = fn; },
      removeEventListener: (type) => { delete handlers[type]; },
    };
    const stubEngine = {
      hitTest: async () => ({ hit: false, code: 'NO_SURFACE', error: 'NO_SURFACE' }),
      placeModel: async () => { throw new Error('placeModel must not be reached'); },
    };
    const view = createARView({ engine: stubEngine, overlay: el });
    let captured = null;
    view.enableCustomization({
      modelUrl: '/models/astronaut.glb',
      onError: (e) => { captured = e; },
      onTap: () => {},
    });
    const ev = (pointerId, x, y) => ({ pointerId, clientX: x, clientY: y, target: null, preventDefault() {} });
    handlers.pointerdown(ev(1, 100, 200));
    handlers.pointerup(ev(1, 100, 200));
    await new Promise((r) => setTimeout(r, 10));
    check('failed tap routes a NO_SURFACE error to onError', captured && captured.code === 'NO_SURFACE');
  }
});
