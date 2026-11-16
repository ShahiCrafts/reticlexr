// Verification harness (Phases 1-2). Stub-based, runs under plain
// Node: `node tests/harness/bug10.mjs`. Phase 6 (TEST-01) formalises
// these into the Vitest suite — see tests/README.md.
// Throwaway BUG-10 verification: pure gesture controller, stub element.
const { createARGestureController } = await import('../../src/gestures.js');

let failures = 0;
const check = (name, cond) => { console.log(cond ? 'PASS' : 'FAIL', name); if (!cond) failures++; };

function makeElement() {
  const handlers = {};
  return {
    handlers,
    addEventListener(type, fn) { handlers[type] = fn; },
    removeEventListener(type) { delete handlers[type]; },
  };
}
const ev = (pointerId, x, y) => ({ pointerId, clientX: x, clientY: y, target: null, preventDefault() {} });

// Case 1: quick stationary touch ending in pointercancel must NOT fire onTap
{
  const el = makeElement();
  let taps = 0;
  createARGestureController({ element: el, onTap: () => { taps++; } });
  el.handlers.pointerdown(ev(1, 100, 100));
  el.handlers.pointercancel(ev(1, 100, 100));
  check('pointercancel does not fire onTap', taps === 0);
}

// Case 2 (control): same touch ending in pointerup DOES fire onTap
{
  const el = makeElement();
  let taps = 0;
  createARGestureController({ element: el, onTap: () => { taps++; } });
  el.handlers.pointerdown(ev(1, 100, 100));
  el.handlers.pointerup(ev(1, 100, 100));
  check('pointerup still fires onTap', taps === 1);
}

// Case 3: state is clean after cancel — a later genuine tap still works
{
  const el = makeElement();
  let taps = 0;
  createARGestureController({ element: el, onTap: () => { taps++; } });
  el.handlers.pointerdown(ev(1, 100, 100));
  el.handlers.pointercancel(ev(1, 100, 100));
  el.handlers.pointerdown(ev(2, 200, 200));
  el.handlers.pointerup(ev(2, 200, 200));
  check('tap after a cancelled gesture still fires once', taps === 1);
}

// Case 4: cancelling one of two pointers does not fire tap and leaves the other usable
{
  const el = makeElement();
  let taps = 0; let drags = 0;
  createARGestureController({ element: el, onTap: () => { taps++; }, onDrag: () => { drags++; } });
  el.handlers.pointerdown(ev(1, 100, 100));
  el.handlers.pointerdown(ev(2, 150, 100));
  el.handlers.pointercancel(ev(2, 150, 100));
  el.handlers.pointermove(ev(1, 130, 100));
  check('two-pointer cancel: no tap, remaining pointer still drags', taps === 0 && drags > 0);
}

console.log(failures === 0 ? 'ALL PASS' : `${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
