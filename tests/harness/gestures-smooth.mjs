// Gesture smoothness verification: stub element, synthetic pointer events.
// Covers the device-test findings on the Redmi Note 9S (pinch/twist worked
// but were glitchy): the controller now sets touch-action:none, smooths the
// two-pointer distance/angle, and gives each component a micro-deadzone
// whose baseline only advances when the component actually fires.

import { test, expect } from 'vitest';

test('gestures-smooth', async () => {
const { createARGestureController } = await import('../../src/gestures.js');

const check = (name, cond) => expect(cond, name).toBe(true);

function makeElement(style = {}) {
  const handlers = {};
  return {
    handlers,
    style,
    addEventListener(type, fn) { handlers[type] = fn; },
    removeEventListener(type) { delete handlers[type]; },
  };
}
const ev = (pointerId, x, y) => ({ pointerId, clientX: x, clientY: y, target: null, preventDefault() {} });

function rig() {
  const el = makeElement();
  const out = { pinches: [], rotates: [] };
  createARGestureController({
    element: el,
    onPinch: ({ factor }) => out.pinches.push(factor),
    onRotate: ({ delta }) => out.rotates.push(delta),
  });
  return { el, out };
}
const product = xs => xs.reduce((a, b) => a * b, 1);
const sum = xs => xs.reduce((a, b) => a + b, 0);

// 1: touch-action is forced to none (unless the element already set one)
{
  const el = makeElement();
  createARGestureController({ element: el });
  check('touch-action defaults to none', el.style.touchAction === 'none');
  const el2 = makeElement({ touchAction: 'pan-x' });
  createARGestureController({ element: el2 });
  check('existing touch-action is respected', el2.style.touchAction === 'pan-x');
}

// 2: a real pinch accumulates to the true factor, with no rotation leak
{
  const { el, out } = rig();
  el.handlers.pointerdown(ev(1, 0, 0));
  el.handlers.pointerdown(ev(2, 100, 0));
  for (let x = 110; x <= 200; x += 10) el.handlers.pointermove(ev(2, x, 0));
  for (let i = 0; i < 6; i++) el.handlers.pointermove(ev(2, 200, 0)); // settle
  const total = product(out.pinches);
  check(`pinch product ${total.toFixed(3)} ≈ 2`, total > 1.95 && total < 2.05);
  check('pure pinch fires no rotation', out.rotates.length === 0);
}

// 3: resting jitter (±1px) cancels out instead of shaking the model
{
  const { el, out } = rig();
  el.handlers.pointerdown(ev(1, 0, 0));
  el.handlers.pointerdown(ev(2, 100, 0));
  for (let i = 0; i < 40; i++) {
    const dx = i % 2 === 0 ? 1 : -1;
    const dy = i % 4 < 2 ? 1 : -1;
    el.handlers.pointermove(ev(2, 100 + dx, dy));
  }
  const net = product(out.pinches);
  check(`jitter net factor ${net.toFixed(3)} ≈ 1`, net > 0.97 && net < 1.03);
  check('jitter rotation drift is negligible', Math.abs(sum(out.rotates)) < 0.02);
}

// 4: a slow twist in sub-deadzone steps still accumulates and fires
{
  const { el, out } = rig();
  el.handlers.pointerdown(ev(1, 0, 0));
  el.handlers.pointerdown(ev(2, 100, 0));
  const step = 0.002;
  for (let k = 1; k <= 25; k++) {
    const t = step * k;
    el.handlers.pointermove(ev(2, 100 * Math.cos(t), 100 * Math.sin(t)));
  }
  for (let i = 0; i < 5; i++) el.handlers.pointermove(ev(2, 100 * Math.cos(0.05), 100 * Math.sin(0.05)));
  const total = sum(out.rotates);
  check(`slow twist total ${total.toFixed(4)} ≈ 0.05`, total > 0.042 && total < 0.052);
  check('pure twist fires no pinch', out.pinches.length === 0);
}

// 5: a fast twist applies its full angle (smoothing loses nothing)
{
  const { el, out } = rig();
  el.handlers.pointerdown(ev(1, 0, 0));
  el.handlers.pointerdown(ev(2, 100, 0));
  for (let k = 1; k <= 6; k++) {
    const t = 0.05 * k;
    el.handlers.pointermove(ev(2, 100 * Math.cos(t), 100 * Math.sin(t)));
  }
  for (let i = 0; i < 6; i++) el.handlers.pointermove(ev(2, 100 * Math.cos(0.3), 100 * Math.sin(0.3)));
  const total = sum(out.rotates);
  check(`fast twist total ${total.toFixed(4)} ≈ 0.3`, total > 0.29 && total < 0.31);
}
});
