// Verification harness (Phases 1-2). Stub-based, Vitest suite (TEST-01): run with `npm test`. See tests/README.md.
// Throwaway COMPAT-01 verification: startSession reference-space fallback
// with a stubbed renderer and fake XRSession. No DOM/WebXR hardware.

import { test, expect } from 'vitest';

test('compat01', async () => {
const { ARCoreWeb } = await import('../../src/web.js');

const check = (name, cond) => expect(cond, name).toBe(true);

globalThis.document = { body: { appendChild() {} } };

function makeEngine({ granted }) {
  const engine = new ARCoreWeb();
  const spaces = { 'local-floor': { type: 'local-floor' }, 'local': { type: 'local' }, 'viewer': { type: 'viewer' } };
  const state = { sessionOptions: null, ended: false };
  const session = {
    async requestReferenceSpace(type) {
      if (granted.includes(type)) return spaces[type];
      throw new Error(`NotSupportedError: ${type}`);
    },
    async requestHitTestSource() { return {}; },
    addEventListener() {},
    async end() { state.ended = true; },
  };
  engine.renderer = {
    domElement: {},
    xr: {
      async setSession() {},
      setReferenceSpaceType(type) { state.renderSpaceType = type; },
    },
    getContext() { return {}; },
  };
  engine.startRendering = () => {};
  Object.defineProperty(globalThis, 'navigator', {
    value: { xr: { async requestSession(mode, opts) { state.sessionOptions = opts; return session; } } },
    configurable: true,
  });
  return { engine, state, spaces };
}

// Case 1: everything granted -> 'local' wins (Tier 0 posture,
// system design 2026-11-18: model-viewer-class viewers
// standardise on local; surface heights come from hit tests, not
// a floor origin). local-floor stays in optionalFeatures so the
// fallback below remains available, and anchors are NOT
// requested by default.
{
  const { engine, state, spaces } = makeEngine({ granted: ['local-floor', 'local', 'viewer'] });
  const r = await engine.startSession({});
  check('all granted: session starts', r.success === true);
  check('all granted: referenceSpace is local', engine.referenceSpace === spaces['local']);
  check('requiredFeatures is [hit-test] only', JSON.stringify(state.sessionOptions.requiredFeatures) === '["hit-test"]');
  check('local-floor in optionalFeatures (fallback stays possible)', state.sessionOptions.optionalFeatures.includes('local-floor'));
  check('anchors NOT requested by default (Tier 0)', !state.sessionOptions.optionalFeatures.includes('anchors'));
  check('referenceSpaceType recorded', engine.referenceSpaceType === 'local');
  check('renderer pinned to the same space', state.renderSpaceType === 'local');
  check('result reports the space', r.referenceSpace === 'local');
}

// Case 2: local rejected, local-floor granted -> fallback
{
  const { engine, spaces } = makeEngine({ granted: ['local-floor', 'viewer'] });
  const r = await engine.startSession({});
  check('local-floor fallback: session starts', r.success === true);
  check('local-floor fallback: referenceSpace is local-floor', engine.referenceSpace === spaces['local-floor']);
}

// Case 3: only viewer granted -> startup FAILS. The viewer space
// is defined relative to the device's current pose, so content
// placed in it moves WITH the view — the opposite of world-locked
// AR (device report 2026-11-18: "model moves with the view"). A
// session that cannot offer a world-locked space must fail loudly
// rather than glue models to the user's face.
{
  const { engine, state } = makeEngine({ granted: ['viewer'] });
  let threw = false;
  try { await engine.startSession({}); } catch { threw = true; }
  check('viewer-only: startSession throws', threw === true);
  check('viewer-only: live session was ended', state.ended === true);
  check('viewer-only: no reference space kept', engine.referenceSpace === null);
}

// Case 5: anchors are a Tier 2 opt-in — requested only when the
// caller asks for them.
{
  const { engine, state } = makeEngine({ granted: ['local-floor', 'local', 'viewer'] });
  await engine.startSession({ anchors: true });
  check('anchors opt-in: requested as optionalFeature', state.sessionOptions.optionalFeatures.includes('anchors'));
}

// Case 4: no space granted -> startup fails AND the session is ended (BUG-07 interplay)
{
  const { engine, state } = makeEngine({ granted: [] });
  let threw = false;
  try { await engine.startSession({}); } catch { threw = true; }
  check('no space: startSession throws', threw === true);
  check('no space: live session was ended', state.ended === true);
  check('no space: session field cleared', engine.session === null);
}
});
