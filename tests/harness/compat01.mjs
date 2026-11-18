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

// Case 1: local-floor granted
{
  const { engine, state, spaces } = makeEngine({ granted: ['local-floor', 'local', 'viewer'] });
  const r = await engine.startSession({});
  check('local-floor granted: session starts', r.success === true);
  check('local-floor granted: referenceSpace is local-floor', engine.referenceSpace === spaces['local-floor']);
  check('requiredFeatures is [hit-test] only', JSON.stringify(state.sessionOptions.requiredFeatures) === '["hit-test"]');
  check('local-floor moved to optionalFeatures', state.sessionOptions.optionalFeatures.includes('local-floor'));
  check('anchors requested as optionalFeature', state.sessionOptions.optionalFeatures.includes('anchors'));
  check('referenceSpaceType recorded', engine.referenceSpaceType === 'local-floor');
  check('renderer pinned to the same space', state.renderSpaceType === 'local-floor');
  check('result reports the space', r.referenceSpace === 'local-floor');
}

// Case 2: local-floor rejected, local granted
{
  const { engine, spaces } = makeEngine({ granted: ['local', 'viewer'] });
  const r = await engine.startSession({});
  check('local fallback: session starts', r.success === true);
  check('local fallback: referenceSpace is local', engine.referenceSpace === spaces['local']);
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
