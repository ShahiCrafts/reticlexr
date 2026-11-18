// Pinch-remainder drag (device report 2026-11-18: interactions
// after a pinch did nothing). When a two-pointer gesture drops to
// one pointer, the remaining finger must become a working drag:
// its travel is measured and its release fires onDragEnd. Before
// the fix, `start` had been cleared when the second finger landed,
// so the remainder finger's release was skipped entirely — no
// onDragEnd, and (via ARView's endDragSession) no final move: the
// whole post-pinch drag was a dead gesture. The remainder finger
// must also never fire onTap merely by lifting.

import { test, expect } from 'vitest';

test('gest06', async () => {
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
    const out = { taps: [], drags: [], dragEnds: [] };
    createARGestureController({
      element: el,
      onTap: (p) => out.taps.push(p),
      onDrag: (p) => out.drags.push(p),
      onDragEnd: (p) => out.dragEnds.push(p),
    });
    return { el, out };
  }

  // A: pinch, lift one finger, drag with the remainder, release.
  {
    const { el, out } = rig();
    el.handlers.pointerdown(ev(1, 100, 100));
    el.handlers.pointerdown(ev(2, 200, 100));
    el.handlers.pointermove(ev(2, 230, 100)); // pinch motion
    el.handlers.pointerup(ev(2, 230, 100));   // 2 -> 1 transition
    el.handlers.pointermove(ev(1, 100, 190)); // remainder drags down
    el.handlers.pointermove(ev(1, 100, 220));
    el.handlers.pointerup(ev(1, 100, 220));   // release
    check('remainder drag fired onDrag', out.drags.length > 0);
    check(
      'remainder release fired onDragEnd at the release point',
      out.dragEnds.length === 1 && out.dragEnds[0].x === 100 && out.dragEnds[0].y === 220
    );
    check('remainder release did not fire onTap', out.taps.length === 0);
  }

  // B: pinch, lift one finger, lift the other without moving.
  {
    const { el, out } = rig();
    el.handlers.pointerdown(ev(1, 100, 100));
    el.handlers.pointerdown(ev(2, 200, 100));
    el.handlers.pointerup(ev(2, 200, 100));
    el.handlers.pointerup(ev(1, 100, 100));
    check('stationary remainder fires no onTap', out.taps.length === 0);
    check('stationary remainder fires no onDragEnd', out.dragEnds.length === 0);
  }

  // C: an ordinary one-finger tap still works.
  {
    const { el, out } = rig();
    el.handlers.pointerdown(ev(1, 50, 50));
    el.handlers.pointerup(ev(1, 52, 51));
    check('plain tap still fires onTap', out.taps.length === 1);
  }

  // D: an ordinary one-finger drag still ends properly.
  {
    const { el, out } = rig();
    el.handlers.pointerdown(ev(1, 50, 50));
    el.handlers.pointermove(ev(1, 50, 140));
    el.handlers.pointerup(ev(1, 50, 140));
    check(
      'plain drag still fires onDragEnd',
      out.dragEnds.length === 1 && out.dragEnds[0].y === 140
    );
    check('plain drag did not fire onTap', out.taps.length === 0);
  }
});
