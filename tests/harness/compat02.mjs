// Verification harness (Phases 1-2). Stub-based, Vitest suite (TEST-01): run with `npm test`. See tests/README.md.
// Throwaway COMPAT-02 verification: checkSupport reason/code per environment.

import { test, expect } from 'vitest';

test('compat02', async () => {
const { ARCoreWeb } = await import('../../src/web.js');

const check = (name, cond) => expect(cond, name).toBe(true);
const engine = new ARCoreWeb();

// Case 1: insecure context -> distinct reason + code, even though xr exists
globalThis.window = { isSecureContext: false };
Object.defineProperty(globalThis, 'navigator', { value: { xr: { isSessionSupported: async () => true } }, configurable: true });
{
  const r = await engine.checkSupport();
  check('insecure context: supported=false', r.supported === false);
  check('insecure context: code INSECURE_CONTEXT', r.code === 'INSECURE_CONTEXT');
  check('insecure context: reason names the secure-context requirement', /secure context/.test(r.reason));
}

// Case 2: secure context, no WebXR -> original generic reason, no code
globalThis.window = { isSecureContext: true };
Object.defineProperty(globalThis, 'navigator', { value: {}, configurable: true });
{
  const r = await engine.checkSupport();
  check('secure + no xr: "WebXR not available"', r.supported === false && r.reason === 'WebXR not available' && r.code === undefined);
}

// Case 3: secure context with AR support -> unchanged success shape
Object.defineProperty(globalThis, 'navigator', { value: { xr: { isSessionSupported: async () => true } }, configurable: true });
{
  const r = await engine.checkSupport();
  check('secure + supported: supported=true', r.supported === true && r.reason === 'WebXR AR supported');
}

// Case 4: secure context, immersive-ar unsupported -> unchanged reason
Object.defineProperty(globalThis, 'navigator', { value: { xr: { isSessionSupported: async () => false } }, configurable: true });
{
  const r = await engine.checkSupport();
  check('secure + unsupported: original reason', r.supported === false && r.reason === 'immersive-ar not supported');
}
});
