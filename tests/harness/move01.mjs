// Gesture contract since 2026-11-18 (owner's call): taps never
// place or move models; drag is the placement and move gesture.
// Exercised against the real ARView + gesture controller with a
// stub engine:
//  A. A tap with no active model places nothing (onTap still
//     reports the tap to the host).
//  B. A drag with no active model places it (drag-to-place).
//  C. A tap WITH an active model does not move it.
//  D. A drag with an active model moves it: the settle calls
//     engine.moveModel once, with the active id and the release
//     point in normalised coordinates; no second model is placed.
//  E. A settle that misses every surface is silent by design
//     (the model keeps its last dragged position; drag01 covers
//     the session mechanics).

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
    beginDragMove: () => true,
    updateDragPoint: () => {},
    endDragMove: () => {},
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
  const tick = () => new Promise((r) => setTimeout(r, 10));
  const tap = async (x, y) => {
    handlers.pointerdown(ev(1, x, y));
    handlers.pointerup(ev(1, x, y));
    await tick();
  };
  const drag = async (x0, y0, x1, y1) => {
    handlers.pointerdown(ev(1, x0, y0));
    handlers.pointermove(ev(1, x1, y1));
    handlers.pointerup(ev(1, x1, y1));
    await tick();
  };

  // A: a tap places nothing.
  await tap(100, 200);
  check('tap with no model places nothing', calls.place.length === 0 && view.activeModelId == null);
  check('the tap is still reported to the host', taps === 1);

  // B: a drag places.
  await drag(100, 200, 112, 212);
  check('drag places the model', calls.place.length === 1 && view.activeModelId === 'm1');
  check('the placing drag does not also settle-move', calls.move.length === 0);

  // C: a tap does not move the placed model.
  await tap(300, 600);
  check('tap with an active model does not move it', calls.move.length === 0);
  check('the tap is still reported', taps === 2);

  // D: a drag moves the placed model, settling at the release point.
  await drag(280, 580, 300, 600);
  check('drag calls engine.moveModel once for the settle', calls.move.length === 1);
  check(
    'moveModel receives the active id and normalised release point',
    calls.move.length === 1 && calls.move[0].modelId === 'm1' && calls.move[0].x === 0.75 && calls.move[0].y === 0.75
  );
  check('the move does not place a second model', calls.place.length === 1);
  check('no errors so far', errors.length === 0);

  // E: a settle that misses is silent (model keeps its position).
  moveHit = false;
  await drag(280, 580, 200, 400);
  check('the missed settle was attempted', calls.move.length === 2);
  check('a missed settle routes no error', errors.length === 0);
});
