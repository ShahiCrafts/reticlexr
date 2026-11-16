// Verification harness (Phases 1-2). Stub-based, Vitest suite (TEST-01): run with `npm test`. See tests/README.md.
// SEC-04 follow-through harness: one-time console.warn + hint in the
// CAMERA_CAPTURE_UNAVAILABLE error, on both producer paths.

import { test, expect } from 'vitest';

test('sec04-followthrough', async () => {
globalThis.window = globalThis;
const { ARCoreWeb } = await import('../../src/web.js');

const check = (name, cond) => expect(cond, name).toBe(true);

let warnCount = 0;
const origWarn = console.warn;
console.warn = () => { warnCount++; };

function liveEngine() {
  const e = new ARCoreWeb();
  e.renderer = {}; e.scene = {}; e.camera = {}; e.session = {};
  return e;
}

// Path 1: no XRWebGLBinding at all -> coded result from takeScreenshot
const e = liveEngine();
e.xrGlBinding = null;
const r1 = await e.takeScreenshot();
check('coded CAMERA_CAPTURE_UNAVAILABLE', r1.success === false && r1.code === 'CAMERA_CAPTURE_UNAVAILABLE');
check('error message carries the enableScreenshots hint',
  typeof r1.error === 'string' && r1.error.includes('pass enableScreenshots: true to startSession to enable screenshots'));
check('warned once after first failure', warnCount === 1);
await e.takeScreenshot();
await e.takeScreenshot();
check('repeated failures do NOT re-warn (one-time per instance)', warnCount === 1);

// Path 2: binding exists but the session never granted camera-access
// (_captureXRFrame) -> thrown error carries code + hint; still no re-warn
e.xrGlBinding = { getCameraImage: () => null };
const fakeFrame = { getViewerPose: () => ({ views: [{ projectionMatrix: new Float32Array(16) }] }) };
let thrown = null;
try { await e._captureXRFrame(fakeFrame, {}); } catch (err) { thrown = err; }
check('_captureXRFrame throws for missing camera', thrown !== null);
check('thrown error carries the code', thrown && thrown.code === 'CAMERA_CAPTURE_UNAVAILABLE');
check('thrown error carries the hint', thrown && thrown.message.includes('enableScreenshots: true'));
check('still only one warn on the same instance', warnCount === 1);

// A fresh engine instance warns again (flag is per instance)
const e2 = liveEngine();
e2.xrGlBinding = null;
await e2.takeScreenshot();
check('fresh instance warns again', warnCount === 2);

console.warn = origWarn;
});
