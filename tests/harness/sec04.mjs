// Verification harness (Phases 1-2). Stub-based, Vitest suite (TEST-01): run with `npm test`. See tests/README.md.
// SEC-04 + Tier 0 posture (system design 2026-11-18): by default
// the session requests hit-test and nothing else — no
// light-estimation, no plane-detection, no anchors, and above
// all no camera-access. camera-access is gated behind
// enableScreenshots; lightEstimation alone requests only
// light-estimation (it must not widen the permission surface).

import { test, expect } from 'vitest';

test('sec04', async () => {
const { ARCoreWeb } = await import('../../src/web.js');

const check = (name, cond) => expect(cond, name).toBe(true);

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
  check('defaults: light-estimation NOT requested (Tier 0)', !f.includes('light-estimation'));
  check('defaults: plane-detection NOT requested (Tier 0)', !f.includes('plane-detection'));
  check('defaults: anchors NOT requested (Tier 0)', !f.includes('anchors'));
  check('defaults: camera-access NOT requested', !f.includes('camera-access'));
}
{
  const f = await featuresFor({ enableScreenshots: true });
  check('enableScreenshots: camera-access requested', f.includes('camera-access'));
  check('enableScreenshots: light-estimation still NOT implied', !f.includes('light-estimation'));
}
{
  const f = await featuresFor({ lightEstimation: true });
  check('lightEstimation opt-in: light-estimation requested', f.includes('light-estimation'));
  check('lightEstimation opt-in: no camera-access', !f.includes('camera-access'));
}
{
  const f = await featuresFor({ lightEstimation: true, enableScreenshots: true });
  check('both opt-ins: camera-access and light-estimation', f.includes('camera-access') && f.includes('light-estimation'));
}
{
  const f = await featuresFor({ planeDetection: true, anchors: true });
  check('tier opt-ins: plane-detection and anchors requested', f.includes('plane-detection') && f.includes('anchors'));
}
});
