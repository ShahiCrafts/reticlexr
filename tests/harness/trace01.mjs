// Flight recorder: the engine trace ring caps and drains,
// diagnostics report the frame heartbeat and last operation,
// and a WebGL context loss lands in the trace (on a phone it is
// indistinguishable from the session closing, so it must be
// recorded as itself).

import { test, expect } from 'vitest';

test('trace01', async () => {
  const THREE = await import('three');
  const { ARCoreWeb } = await import('../../src/web.js');
  const check = (name, cond) => expect(cond, name).toBe(true);

  const engine = new ARCoreWeb();

  // Ring behaviour.
  for (let i = 0; i < 100; i++) engine._tracePush('e', { i });
  check('ring caps at 80', engine._trace.length === 80);
  check('ring keeps the newest entries', engine._trace[79].i === 99);
  const drained = engine.drainTrace();
  check('drain returns the entries', drained.length === 80);
  check('drain clears the ring', engine.drainTrace().length === 0);

  // Last-op + diagnostics shape.
  engine.noteOp('pinch scale=2.000');
  const d0 = engine.getDiagnostics();
  check('diagnostics report the last op', d0.lastOp === 'pinch scale=2.000');
  check('diagnostics report no session', d0.sessionActive === false && d0.frames === 0);

  // Context-loss tracing + frame heartbeat through the real loop.
  const listeners = {};
  let loopCb = null;
  engine.renderer = {
    domElement: {
      addEventListener: (name, fn) => { listeners[name] = fn; },
    },
    setAnimationLoop: (cb) => { loopCb = cb; },
    render: () => {},
  };
  engine.referenceSpace = {};
  engine.planeDetectionSupported = false;
  engine.config.showReticle = false;
  engine.scene = new THREE.Scene();
  engine.startRendering();
  check('context listeners bound', typeof listeners.webglcontextlost === 'function');
  listeners.webglcontextlost();
  const trace = engine.drainTrace();
  check('context loss recorded', trace.some((e) => e.kind === 'webgl-context-lost'));

  const frame = {
    getViewerPose: () => null,
    getPose: () => undefined,
    getHitTestResults: () => [],
  };
  loopCb(16, frame);
  loopCb(32, frame);
  const d1 = engine.getDiagnostics();
  check('heartbeat counts frames', d1.frames === 2);
  check('heartbeat is fresh', d1.lastFrameAgoMs != null && d1.lastFrameAgoMs < 1000);
});
