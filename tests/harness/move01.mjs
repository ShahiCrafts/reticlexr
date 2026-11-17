// Tap-to-move regression harness (device report 2026-11-17: once a
// model was placed it could not be moved — tapping a new spot did
// nothing, because ARView's gesture handler only placed when no model
// was active and had no move path at all, despite the engine having
// moveModel). The gesture chain is exercised against the real
// ARView + gesture controller with a stub engine:
//  A. A tap with no active model places (unchanged behaviour).
//  B. A tap WITH an active model moves it: engine.moveModel receives
//     the active id and the tap point in normalised coordinates, and
//     no second model is placed.
//  C. A move that misses every surface routes NO_SURFACE to onError
//     (same contract as a failed placement) and does not fire onTap.

import { test, expect } from 'vitest';

test('move01', async () => {
  globalThis.window = globalThis;
  globalThis.innerWidth = 400;
  globalThis.innerHeight = 800;
  const { createARView } = await import('../../src/ar-view.js');
  const check = (name, cond) => expect(cond, name).toBe(true);

  const handlers = {};
  const el = {
    style: {},
    addEventListener: (type, fn) => { handlers[type] = fn; },
    removeEventListener: (type) => { delete handlers[type]; },
  };
  const calls = { place: [], move: [] };
  let moveHit = true;
  const stubEngine = {
    hitTest: async () => ({ hit: true, position: [0, 0, -1], rotation: [0, 0, 0, 1] }),
    placeModel: async ({ modelUrl }) => {
      calls.place.push(modelUrl);
      return { modelId: 'm1', modelUrl };
    },
    moveModel: async ({ modelId, x, y }) => {
      calls.move.push({ modelId, x, y });
      return moveHit
        ? { hit: true, success: true, position: [0.2, 0, -0.5], rotation: [0, 0, 0, 1] }
        : { hit: false, code: 'NO_SURFACE' };
    },
  };
  const view = createARView({ engine: stubEngine, overlay: el });
  let errors = [];
  let taps = 0;
  view.enableCustomization({
    modelUrl: '/models/rhino.glb',
    onError: (e) => { errors.push(e); },
    onTap: () => { taps++; },
  });
  const ev = (pointerId, x, y) => ({ pointerId, clientX: x, clientY: y, target: null, preventDefault() {} });
  const tap = async (x, y) => {
    handlers.pointerdown(ev(1, x, y));
    handlers.pointerup(ev(1, x, y));
    await new Promise((r) => setTimeout(r, 10));
  };

  // A: first tap places.
  await tap(100, 200);
  check('first tap places the model', calls.place.length === 1 && view.activeModelId === 'm1');
  check('placement tap does not move', calls.move.length === 0);
  check('placement tap fires onTap', taps === 1);

  // B: second tap, elsewhere, moves the placed model.
  await tap(300, 600);
  check('tap with an active model calls engine.moveModel once', calls.move.length === 1);
  check(
    'moveModel receives the active id and normalised tap point',
    calls.move.length === 1 && calls.move[0].modelId === 'm1' && calls.move[0].x === 0.75 && calls.move[0].y === 0.75
  );
  check('move does not place a second model', calls.place.length === 1);
  check('successful move fires onTap', taps === 2);
  check('no errors so far', errors.length === 0);

  // C: a move onto no surface reports NO_SURFACE and skips onTap.
  moveHit = false;
  await tap(200, 400);
  check('missed move routes NO_SURFACE to onError', errors.length === 1 && errors[0].code === 'NO_SURFACE');
  check('missed move does not fire onTap', taps === 2);
});
