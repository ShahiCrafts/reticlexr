// Verification harness (Phases 1-2). Stub-based, runs under plain
// Node: `node tests/harness/bug07.mjs`. Phase 6 (TEST-01) formalises
// these into the Vitest suite — see tests/README.md.
// BUG-07 (recreated in Phase 2; the Phase 1 original was a throwaway
// /tmp script): when startSession fails AFTER requestSession succeeded
// (here: every reference space rejects), the live session is ended and
// the engine's session fields are cleared before the error propagates.
const { ARCoreWeb } = await import('../../src/web.js');

let failures = 0;
const check = (name, cond) => { console.log(cond ? 'PASS' : 'FAIL', name); if (!cond) failures++; };

globalThis.document = { body: { appendChild() {} } };

const state = { ended: false };
const session = {
  async requestReferenceSpace(type) { throw new Error(`NotSupportedError: ${type}`); },
  async requestHitTestSource() { return {}; },
  addEventListener() {},
  async end() { state.ended = true; },
};
const engine = new ARCoreWeb();
engine.renderer = {
  domElement: {},
  xr: { async setSession() {} },
  getContext() { return {}; },
};
engine.startRendering = () => {};
Object.defineProperty(globalThis, 'navigator', {
  value: { xr: { async requestSession() { return session; } } },
  configurable: true,
});

let thrown = null;
try {
  await engine.startSession({});
} catch (err) {
  thrown = err;
}
check('startSession rejects on total reference-space failure', thrown !== null);
check('error is the wrapped start failure', !!thrown && /Failed to start AR session/.test(thrown.message));
check('live session was ended (no leak)', state.ended === true);
check('engine.session cleared', engine.session === null);
check('engine.hitTestSource cleared', engine.hitTestSource === null);
check('engine.referenceSpace cleared', engine.referenceSpace === null);
check('engine.viewerSpace cleared', engine.viewerSpace === null);

console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
