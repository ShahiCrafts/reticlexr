// Verification harness (Phases 1-2). Stub-based, runs under plain
// Node: `node tests/harness/sec04.mjs`. Phase 6 (TEST-01) formalises
// these into the Vitest suite — see tests/README.md.
// Throwaway SEC-04 verification: camera-access is gated behind
// enableScreenshots; lightEstimation alone requests only light-estimation.
const { ARCoreWeb } = await import('../../src/web.js');

let failures = 0;
const check = (name, cond) => { console.log(cond ? 'PASS' : 'FAIL', name); if (!cond) failures++; };

globalThis.document = { body: { appendChild() {} } };

async function featuresFor(options) {
  const engine = new ARCoreWeb();
  let captured = null;
  const session = {
    async requestReferenceSpace(type) { return { type }; },
    async requestHitTestSource() { return {}; },
    addEventListener() {},
    async end() {},
  };
  engine.renderer = { domElement: {}, xr: { async setSession() {} }, getContext() { return {}; } };
  engine.startRendering = () => {};
  Object.defineProperty(globalThis, 'navigator', {
    value: { xr: { async requestSession(mode, opts) { captured = opts; return session; } } },
    configurable: true,
  });
  await engine.startSession(options);
  return captured.optionalFeatures;
}

{
  const f = await featuresFor({});
  check('defaults: light-estimation requested', f.includes('light-estimation'));
  check('defaults: camera-access NOT requested', !f.includes('camera-access'));
}
{
  const f = await featuresFor({ enableScreenshots: true });
  check('enableScreenshots: camera-access requested', f.includes('camera-access'));
  check('enableScreenshots: light-estimation still requested', f.includes('light-estimation'));
}
{
  const f = await featuresFor({ lightEstimation: false });
  check('lightEstimation off: no light-estimation', !f.includes('light-estimation'));
  check('lightEstimation off: no camera-access', !f.includes('camera-access'));
}
{
  const f = await featuresFor({ lightEstimation: false, enableScreenshots: true });
  check('screenshots without light estimation: camera-access only', f.includes('camera-access') && !f.includes('light-estimation'));
}

console.log(failures === 0 ? 'ALL PASS' : `${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
