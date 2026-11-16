// PERF-02 verification: surface-state notifications are throttled
// (steady state at most 10 Hz) but hasSurface TRANSITIONS fire
// immediately. Stub render loop, runs under plain Node:
// `node tests/harness/perf02.mjs`.
const { ARCoreWeb } = await import('../../src/web.js');

let failures = 0;
const check = (name, cond) => {
  console.log(cond ? 'PASS' : 'FAIL', name);
  if (!cond) failures++;
};

const engine = new ARCoreWeb();
let loopCb = null;
engine.renderer = {
  setAnimationLoop: (cb) => { loopCb = cb; },
  render: () => {},
};
engine.hitTestSource = {};
engine.referenceSpace = {};
engine.planeDetectionSupported = false;
// Reticle hidden: the notification path is independent of it
engine.config.showReticle = false;

const events = [];
engine.addFrameListener((e) => events.push(e.type));

engine.startRendering();

const pose = {
  transform: {
    position: { x: 0, y: 0, z: 0 },
    orientation: { x: 0, y: 0, z: 0, w: 1 },
  },
};
const hitFrame = { getHitTestResults: () => [{ getPose: () => pose }] };
const missFrame = { getHitTestResults: () => [] };

const count = (type) => events.filter((t) => t === type).length;

// 120 hit frames at 60 fps (timestamps in ms)
for (let i = 0; i < 120; i++) loopCb(i * 16.7, hitFrame);
const detectedSteady = count('surfaceDetected');
check(
  `steady-state surfaceDetected is throttled (got ${detectedSteady} for 120 frames, expect ~18, well under 120)`,
  detectedSteady >= 10 && detectedSteady <= 25
);
// Payload identity: the same object must be handed to listeners
// every time (documented "do not retain" contract)
{
  const seen = [];
  const unsub = engine.addFrameListener((e) => {
    if (e.type === 'surfaceDetected') seen.push(e);
  });
  for (let i = 0; i < 30; i++) loopCb(3000 + i * 16.7, hitFrame);
  unsub();
  check('surfaceDetected payload identity is stable (reused object)', seen.length > 0 && seen.every((p) => p === seen[0]));
}

// Transition to lost fires immediately, exactly once
const lostBefore = count('surfaceLost');
loopCb(4000, missFrame);
check('surfaceLost fires on the transition frame', count('surfaceLost') === lostBefore + 1);
for (let i = 0; i < 30; i++) loopCb(4100 + i * 16.7, missFrame);
check('surfaceLost does not repeat while lost', count('surfaceLost') === lostBefore + 1);

// Regaining the surface fires immediately even inside the 100 ms
// steady-state window (last steady emit was < 100 ms ago)
const detectedBefore = count('surfaceDetected');
loopCb(4200, hitFrame);
check('surfaceDetected fires immediately on regain (transition beats throttle)', count('surfaceDetected') === detectedBefore + 1);

// surfaceState is one stable object, mutated in place
check('getSurfaceDetectionState returns a stable object', engine.getSurfaceDetectionState() === engine.surfaceState);
check('surfaceState reflects the current hit', engine.surfaceState.hasSurface === true && engine.surfaceState.planeType === 'horizontal');

console.log(failures === 0 ? 'ALL PASS' : `${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
