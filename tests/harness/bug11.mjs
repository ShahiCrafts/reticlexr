// Verification harness (Phases 1-2). Stub-based, runs under plain
// Node: `node tests/harness/bug11.mjs`. Phase 6 (TEST-01) formalises
// these into the Vitest suite — see tests/README.md.
// Throwaway BUG-11 verification: stub engine, no DOM/WebXR.
const { ARView } = await import('../../src/ar-view.js');

let failures = 0;
const check = (name, cond) => { console.log(cond ? 'PASS' : 'FAIL', name); if (!cond) failures++; };

function makeView({ fail = false } = {}) {
  const calls = [];
  const engine = {
    async transformModel(args) {
      calls.push(args);
      if (fail) throw new Error('Anchor a1 not found');
      return { success: true };
    },
  };
  const view = new ARView({ engine });
  view.activeModelId = 'a1';
  return { view, calls };
}

// Success path: state commits, engine receives clamped value
{
  const { view, calls } = makeView();
  await view.setScale(10); // clamps to 5
  check('setScale success commits clamped scale', view.transform.scale === 5 && calls[0].scale[0] === 5);
  await view.rotateBy(0.5);
  check('rotateBy success commits rotationY', Math.abs(view.transform.rotationY - 0.5) < 1e-9);
}

// Failure path: state must NOT move, error propagates to caller
{
  const { view } = makeView({ fail: true });
  view.transform.scale = 2;
  view.transform.rotationY = 0.25;
  let threw = false;
  try { await view.setScale(3); } catch { threw = true; }
  check('setScale failure propagates error', threw === true);
  check('setScale failure leaves transform.scale unchanged', view.transform.scale === 2);
  threw = false;
  try { await view.rotateBy(1); } catch { threw = true; }
  check('rotateBy failure propagates error', threw === true);
  check('rotateBy failure leaves transform.rotationY unchanged', view.transform.rotationY === 0.25);
}

console.log(failures === 0 ? 'ALL PASS' : `${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
