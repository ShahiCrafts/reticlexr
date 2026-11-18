// Mid-drag second-contact guard (device report 2026-11-19: while
// dragging, the model sometimes scaled up or down on its own). A
// resting palm/thumb contact landing mid-drag turns the drag
// finger's motion into inter-finger distance change, which the
// pinch math reads as scaling. The controller now guards a second
// contact that lands during an established drag: pinch/rotate stay
// silent until the NEW finger itself has moved ~10 px. A gesture
// that starts as two fingers is never guarded (anchored pinch
// keeps working — see gestures-smooth case 2).

import { test, expect } from 'vitest';

test('gest07', async () => {
  const { createARGestureController } = await import('../../src/gestures.js');
  const check = (name, cond) => expect(cond, name).toBe(true);

  function makeElement() {
    const handlers = {};
    return {
      handlers,
      style: {},
      addEventListener(type, fn) { handlers[type] = fn; },
      removeEventListener(type) { delete handlers[type]; },
    };
  }
  const ev = (pointerId, x, y) => ({ pointerId, clientX: x, clientY: y, target: null, preventDefault() {} });

  function rig() {
    const el = makeElement();
    const out = { pinches: [], rotates: [], dragEnds: 0 };
    createARGestureController({
      element: el,
      onPinch: ({ factor }) => out.pinches.push(factor),
      onRotate: ({ delta }) => out.rotates.push(delta),
      onDragEnd: () => { out.dragEnds++; },
    });
    return { el, out };
  }

  // A: drag in progress, resting contact lands and stays, drag
  // finger keeps travelling: NO pinch, NO rotate. The drag still
  // ends when the second contact lands (existing contract).
  {
    const { el, out } = rig();
    el.handlers.pointerdown(ev(1, 200, 400));
    for (let x = 210; x <= 300; x += 10) el.handlers.pointermove(ev(1, x, 400)); // established drag
    el.handlers.pointerdown(ev(2, 700, 800)); // resting contact, far away
    check('second contact ends the drag', out.dragEnds === 1);
    for (let x = 310; x <= 500; x += 10) el.handlers.pointermove(ev(1, x, 400)); // drag finger travels 200 px
    el.handlers.pointermove(ev(2, 701, 801)); // resting contact jitters 1-2 px
    el.handlers.pointermove(ev(2, 700, 800));
    check('no pinch from a resting contact', out.pinches.length === 0);
    check('no rotate from a resting contact', out.rotates.length === 0);
    el.handlers.pointerup(ev(2, 700, 800));
    el.handlers.pointerup(ev(1, 500, 400));
  }

  // B: same start, but the second finger then moves itself:
  // the guard lifts and the pinch runs from the live geometry.
  {
    const { el, out } = rig();
    el.handlers.pointerdown(ev(1, 200, 400));
    for (let x = 210; x <= 300; x += 10) el.handlers.pointermove(ev(1, x, 400));
    el.handlers.pointerdown(ev(2, 400, 400)); // 100 px from finger 1
    for (let x = 310; x <= 360; x += 10) el.handlers.pointermove(ev(1, x, 400)); // guarded drift
    check('guarded drift fires nothing', out.pinches.length === 0);
    for (let x = 410; x <= 460; x += 10) el.handlers.pointermove(ev(2, x, 400)); // finger 2 pinches outward itself
    for (let i = 0; i < 6; i++) el.handlers.pointermove(ev(2, 460, 400)); // settle
    const total = out.pinches.reduce((a, b) => a * b, 1);
    check(`pinch fires after the new finger moves (product ${total.toFixed(3)})`, out.pinches.length > 0 && total > 1.1);
    el.handlers.pointerup(ev(2, 460, 400));
    el.handlers.pointerup(ev(1, 360, 400));
  }

  // C: a gesture that STARTS as two fingers is never guarded:
  // anchored pinch (finger 1 still, finger 2 moves) fires as before.
  {
    const { el, out } = rig();
    el.handlers.pointerdown(ev(1, 0, 0));
    el.handlers.pointerdown(ev(2, 100, 0));
    for (let x = 110; x <= 160; x += 10) el.handlers.pointermove(ev(2, x, 0));
    check('anchored pinch from rest still fires', out.pinches.length > 0);
    el.handlers.pointerup(ev(2, 160, 0));
    el.handlers.pointerup(ev(1, 0, 0));
  }
});
