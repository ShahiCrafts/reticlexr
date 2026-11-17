// Drag-to-move, second implementation (owner report 2026-11-17: the
// first drag trailed the finger and landed where it HAD been — one
// promise-based hit test per pointer move, serialised behind a
// queue). The contract now: ARView opens an engine drag session
// (beginDragMove / updateDragPoint / endDragMove — the engine tracks
// the finger inside its render loop, see drag02), and exactly one
// precise moveModel lands the model on the release point.
// Exercised against the real ARView + gesture controller with a
// stub engine:
//  A. A drag opens one session, streams normalised points in order,
//     and settles once at the release point. No mid-drag moveModel,
//     no second placement, no tap, no error.
//  B. A drag with nothing placed opens no session and settles
//     nothing (the consumer onDrag still fires).
//  C. A second finger (pinch) ends the drag at the first finger's
//     last point; no tap follows.
//  D. pointercancel ends the drag the same way.

import { test, expect } from 'vitest';

test('drag01', async () => {
  globalThis.window = globalThis;
  globalThis.innerWidth = 400;
  globalThis.innerHeight = 800;
  const { createARView } = await import('../../src/ar-view.js');
  const check = (name, cond) => expect(cond, name).toBe(true);
  const tick = () => new Promise((r) => setTimeout(r, 10));

  function makeView() {
    const handlers = {};
    const el = {
      style: {},
      addEventListener: (type, fn) => { handlers[type] = fn; },
      removeEventListener: (type) => { delete handlers[type]; },
    };
    const calls = { place: [], settle: [], begin: [], point: [], end: 0 };
    const stubEngine = {
      hitTest: async () => ({ hit: true, position: [0, 0, -1], rotation: [0, 0, 0, 1] }),
      placeModel: async ({ modelUrl }) => {
        calls.place.push(modelUrl);
        return { modelId: 'm1', modelUrl };
      },
      moveModel: async ({ modelId, x, y }) => {
        calls.settle.push({ modelId, x, y });
        return { hit: true, success: true, position: [x, 0, y], rotation: [0, 0, 0, 1] };
      },
      beginDragMove: (modelId) => { calls.begin.push(modelId); return true; },
      updateDragPoint: (x, y) => { calls.point.push({ x, y }); },
      endDragMove: () => { calls.end++; },
      transformModel: async () => ({ success: true }),
    };
    const view = createARView({ engine: stubEngine, overlay: el });
    const seen = { errors: [], taps: 0, drags: [], dragEnds: 0 };
    view.enableCustomization({
      modelUrl: '/models/rhino.glb',
      onError: (e) => { seen.errors.push(e); },
      onTap: () => { seen.taps++; },
      onDrag: (d) => { seen.drags.push(d); },
      onDragEnd: () => { seen.dragEnds++; },
    });
    const ev = (pointerId, x, y) => ({ pointerId, clientX: x, clientY: y, target: null, preventDefault() {} });
    return { handlers, calls, view, seen, ev };
  }

  async function placeViaTap(ctx) {
    ctx.handlers.pointerdown(ctx.ev(1, 100, 200));
    ctx.handlers.pointerup(ctx.ev(1, 100, 200));
    await tick();
  }

  // ---------- A: drag streams points, settles once ----------
  {
    const ctx = makeView();
    const { handlers, calls, seen, ev } = ctx;
    await placeViaTap(ctx);
    check('setup: tap placed the model', calls.place.length === 1 && seen.taps === 1);

    handlers.pointerdown(ev(1, 100, 200));
    handlers.pointermove(ev(1, 160, 280));
    handlers.pointermove(ev(1, 300, 600));
    check('one drag session opened', calls.begin.length === 1 && calls.begin[0] === 'm1');
    check(
      'points streamed normalised, in order',
      calls.point.length === 2 &&
        calls.point[0].x === 0.4 && calls.point[0].y === 0.35 &&
        calls.point[1].x === 0.75 && calls.point[1].y === 0.75
    );
    check('no moveModel during the drag itself', calls.settle.length === 0);
    check('consumer onDrag received the pixel payloads', seen.drags.length === 2);

    handlers.pointerup(ev(1, 300, 600));
    await tick();
    check('session ended once on release', calls.end === 1 && seen.dragEnds === 1);
    check(
      'exactly one settle move, at the release point',
      calls.settle.length === 1 && calls.settle[0].x === 0.75 && calls.settle[0].y === 0.75
    );
    check('no second placement, no tap, no error',
      calls.place.length === 1 && seen.taps === 1 && seen.errors.length === 0);
  }

  // ---------- B: drag with nothing placed ----------
  {
    const { handlers, calls, seen, ev } = makeView();
    handlers.pointerdown(ev(1, 100, 200));
    handlers.pointermove(ev(1, 300, 600));
    handlers.pointerup(ev(1, 300, 600));
    await tick();
    check('no session, no settle, no placement',
      calls.begin.length === 0 && calls.point.length === 0 &&
      calls.end === 0 && calls.settle.length === 0 && calls.place.length === 0);
    check('consumer onDrag still fired', seen.drags.length === 1);
    check('no error', seen.errors.length === 0);
  }

  // ---------- C: a second finger ends the drag ----------
  {
    const ctx = makeView();
    const { handlers, calls, seen, ev } = ctx;
    await placeViaTap(ctx);
    handlers.pointerdown(ev(1, 100, 200));
    handlers.pointermove(ev(1, 160, 280));
    handlers.pointerdown(ev(2, 220, 320));
    await tick();
    check('pinch transition ended the session', calls.end === 1 && seen.dragEnds === 1);
    check(
      'settled at the first finger\'s last point',
      calls.settle.length === 1 && calls.settle[0].x === 0.4 && calls.settle[0].y === 0.35
    );
    handlers.pointermove(ev(2, 260, 380));
    check('no further drag points during the pinch', calls.point.length === 1);
    handlers.pointerup(ev(2, 260, 380));
    handlers.pointerup(ev(1, 160, 280));
    await tick();
    check('no second end, no tap, no error',
      calls.end === 1 && seen.taps === 1 && seen.errors.length === 0);
  }

  // ---------- D: pointercancel ends the drag ----------
  {
    const ctx = makeView();
    const { handlers, calls, seen, ev } = ctx;
    await placeViaTap(ctx);
    handlers.pointerdown(ev(1, 100, 200));
    handlers.pointermove(ev(1, 200, 400));
    handlers.pointercancel(ev(1, 200, 400));
    await tick();
    check('cancel ended the session with a settle at the last point',
      calls.end === 1 && calls.settle.length === 1 &&
      calls.settle[0].x === 0.5 && calls.settle[0].y === 0.5);
    check('no tap, no error', seen.taps === 1 && seen.errors.length === 0);
  }
});
