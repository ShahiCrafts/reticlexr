// Verification harness (Phases 1-2). Stub-based, Vitest suite (TEST-01): run with `npm test`. See tests/README.md.
// Throwaway BUG-08 verification: fake XRSession, no DOM/WebXR hardware.

import { test, expect } from 'vitest';

test('bug08', async () => {
const { ARCoreWeb } = await import('../../src/web.js');

const check = (name, cond) => expect(cond, name).toBe(true);

function makeSession(rafImpl) {
  const s = new EventTarget();
  s.requestAnimationFrame = rafImpl;
  s.endListeners = () => {};
  return s;
}

function makeEngine(session) {
  const engine = new ARCoreWeb();
  engine.session = session;
  engine.hitTestSource = {};
  engine.referenceSpace = {};
  engine.lastHitPosition = null;
  engine.reticleVisible = false;
  engine.planeDetectionSupported = false;
  return engine;
}

// Case 1: frame never fires, session ends -> promise settles SESSION_ENDED
{
  const session = makeSession(() => {}); // rAF callback never invoked
  const engine = makeEngine(session);
  let endListenerCount = 0;
  const origAdd = session.addEventListener.bind(session);
  session.addEventListener = (t, f, o) => { if (t === 'end') endListenerCount++; return origAdd(t, f, o); };
  const p = engine.hitTest({ x: 0.5, y: 0.5 });
  let settled = null;
  p.then(r => { settled = r; });
  await new Promise(r => setTimeout(r, 10));
  check('pending before session end', settled === null);
  session.dispatchEvent(new Event('end'));
  await new Promise(r => setTimeout(r, 10));
  check('settles on session end with SESSION_ENDED', settled && settled.hit === false && settled.error === 'SESSION_ENDED');
}

// Case 2: frame fires with no results -> { hit: false }, end listener removed
{
  let endListeners = 0;
  const session = makeSession((cb) => { cb(0, { getHitTestResults: () => [] }); });
  const origAdd = session.addEventListener.bind(session);
  const origRemove = session.removeEventListener.bind(session);
  session.addEventListener = (t, f, o) => { if (t === 'end') endListeners++; return origAdd(t, f, o); };
  session.removeEventListener = (t, f, o) => { if (t === 'end') endListeners--; return origRemove(t, f, o); };
  const engine = makeEngine(session);
  const r = await engine.hitTest({ x: 0.5, y: 0.5 });
  check('empty frame resolves {hit:false}', r && r.hit === false && !r.error);
  check('end listener removed after normal settle', endListeners === 0);
}

// Case 3: frame fires with a hit -> hit:true payload unchanged
{
  const pose = { transform: { position: { x: 1, y: 2, z: 3 }, orientation: { x: 0, y: 0, z: 0, w: 1 } } };
  const session = makeSession((cb) => { cb(0, { getHitTestResults: () => [{ getPose: () => pose }] }); });
  const engine = makeEngine(session);
  const r = await engine.hitTest({ x: 0.5, y: 0.5 });
  check('hit resolves position/rotation arrays', r && r.hit === true && JSON.stringify(r.position) === '[1,2,3]' && JSON.stringify(r.rotation) === '[0,0,0,1]');
}
});
