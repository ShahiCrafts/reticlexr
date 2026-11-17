// Verification harness (Phases 1-2). Stub-based, Vitest suite (TEST-01): run with `npm test`. See tests/README.md.
// BUG-03 harness: ray-based hit testing for explicit screen points.
// Part 1: NDC -> ray math against known screen points.
// Part 2: full hitTestAtPoint flow against a fake XRSession, including
// source.cancel() on every settle path.

import { test, expect } from 'vitest';
import * as THREE from 'three';

test('bug03', async () => {
globalThis.window = globalThis;
globalThis.XRRay = class XRRay {
  constructor(origin, direction) { this.origin = origin; this.direction = direction; }
};
const { ARCoreWeb, rayFromScreenPoint } = await import('../../src/web.js');

const check = (name, cond) => expect(cond, name).toBe(true);
const EPS = 1e-5;
const dirNear = (d, [x, y, z], eps = EPS) =>
  Math.abs(d.x - x) <= eps && Math.abs(d.y - y) <= eps && Math.abs(d.z - z) <= eps;

// ---------- Part 1: ray math ----------
// Camera: fov 90, aspect 1 -> tan(half-fov) = 1 on both axes.
const proj90 = new THREE.PerspectiveCamera(90, 1, 0.01, 100).projectionMatrix.toArray();
const identityPose = {
  position: { x: 0, y: 1.6, z: 0 },
  orientation: { x: 0, y: 0, z: 0, w: 1 },
};
const S3 = 1 / Math.sqrt(3); // 0.5773502691896258

const centre = rayFromScreenPoint(identityPose, proj90, 0.5, 0.5);
check('centre (0.5,0.5) direction == forward (0,0,-1)', dirNear(centre.direction, [0, 0, -1]));
check('centre origin == camera position', centre.origin.x === 0 && centre.origin.y === 1.6 && centre.origin.z === 0);

const tl = rayFromScreenPoint(identityPose, proj90, 0, 0);
const tr = rayFromScreenPoint(identityPose, proj90, 1, 0);
const bl = rayFromScreenPoint(identityPose, proj90, 0, 1);
const br = rayFromScreenPoint(identityPose, proj90, 1, 1);
check('corner TL (0,0) == (-1,1,-1)/sqrt3', dirNear(tl.direction, [-S3, S3, -S3]));
check('corner TR (1,0) == (1,1,-1)/sqrt3', dirNear(tr.direction, [S3, S3, -S3]));
check('corner BL (0,1) == (-1,-1,-1)/sqrt3', dirNear(bl.direction, [-S3, -S3, -S3]));
check('corner BR (1,1) == (1,-1,-1)/sqrt3', dirNear(br.direction, [S3, -S3, -S3]));
check('corners symmetric: |dx| equal, sign flips L/R',
  Math.abs(Math.abs(tl.direction.x) - Math.abs(br.direction.x)) <= EPS && tl.direction.x === -tr.direction.x);
check('corners symmetric: |dy| equal, sign flips T/B',
  Math.abs(Math.abs(tl.direction.y) - Math.abs(br.direction.y)) <= EPS && tl.direction.y === -bl.direction.y);
check('corners share forward component', tl.direction.z === tr.direction.z && tl.direction.z === bl.direction.z && tl.direction.z === br.direction.z);
check('corner rays are unit length',
  [tl, tr, bl, br].every(r => Math.abs(Math.hypot(r.direction.x, r.direction.y, r.direction.z) - 1) <= EPS));
check('edge midpoint R (1,0.5) == (1,0,-1)/sqrt2', dirNear(rayFromScreenPoint(identityPose, proj90, 1, 0.5).direction, [Math.SQRT1_2, 0, -Math.SQRT1_2]));
check('edge midpoint T (0.5,0) == (0,1,-1)/sqrt2', dirNear(rayFromScreenPoint(identityPose, proj90, 0.5, 0).direction, [0, Math.SQRT1_2, -Math.SQRT1_2]));

// Aspect handling: fov 60 vertical, aspect 2 -> horizontal half-angle tan = 2*tan(30deg)
const projWide = new THREE.PerspectiveCamera(60, 2, 0.01, 100).projectionMatrix.toArray();
const rEdge = rayFromScreenPoint(identityPose, projWide, 1, 0.5);
const expectedRatio = 2 * Math.tan(Math.PI / 6); // 1.1547005383792517
check('wide aspect: right-edge dx / -dz == aspect * tan(fov/2)',
  Math.abs(rEdge.direction.x / -rEdge.direction.z - expectedRatio) <= 1e-4);
const tEdge = rayFromScreenPoint(identityPose, projWide, 0.5, 0);
check('wide aspect: top-edge dy / -dz == tan(fov/2)',
  Math.abs(tEdge.direction.y / -tEdge.direction.z - Math.tan(Math.PI / 6)) <= 1e-4);

// Pose rotation: yaw +90deg about Y turns forward (0,0,-1) into (-1,0,0)
const yawPose = {
  position: { x: 1, y: 2, z: 3 },
  orientation: { x: 0, y: Math.SQRT1_2, z: 0, w: Math.SQRT1_2 },
};
const yawCentre = rayFromScreenPoint(yawPose, proj90, 0.5, 0.5);
check('yaw90 centre direction == (-1,0,0)', dirNear(yawCentre.direction, [-1, 0, 0], 1e-6));
check('yaw90 origin == pose position', yawCentre.origin.x === 1 && yawCentre.origin.y === 2 && yawCentre.origin.z === 3);
// Pitch down 90deg about X: forward becomes (0,-1,0)... quaternion (x=sin(-45)?) use rotation -90 about X: q=( -s,0,0,s ) maps (0,0,-1) -> (0,-1,0)? verify via THREE in-line:
const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
const pitchPose = { position: { x: 0, y: 0, z: 0 }, orientation: { x: q.x, y: q.y, z: q.z, w: q.w } };
const pitchCentre = rayFromScreenPoint(pitchPose, proj90, 0.5, 0.5);
check('pitch-90 centre direction == (0,-1,0)', dirNear(pitchCentre.direction, [0, -1, 0], 1e-6));

// ---------- Part 2: hitTestAtPoint flow with a fake session ----------
class FakeSource {
  constructor(owner, offsetRay) { this.owner = owner; this.offsetRay = offsetRay; this.cancelled = false; }
  cancel() { this.cancelled = true; }
}
class FakeSession {
  constructor() { this.listeners = new Map(); this.raf = []; this.sources = []; }
  addEventListener(t, fn) { if (!this.listeners.has(t)) this.listeners.set(t, []); this.listeners.get(t).push(fn); }
  removeEventListener(t, fn) { this.listeners.set(t, (this.listeners.get(t) || []).filter(f => f !== fn)); }
  emit(t) { (this.listeners.get(t) || []).slice().forEach(fn => fn()); }
  requestAnimationFrame(cb) { this.raf.push(cb); }
  async requestHitTestSource({ space, offsetRay }) {
    const s = new FakeSource(this, offsetRay);
    this.sources.push(s);
    return s;
  }
  pump(frame) { const q = this.raf; this.raf = []; q.forEach(cb => cb(0, frame)); }
}
const tick = () => new Promise(r => setImmediate(r));
const hitPose = {
  transform: {
    position: { x: 2, y: 0, z: -3 },
    orientation: { x: 0, y: 0, z: 0, w: 1 },
  },
};
function frameWith({ pose = null, results = [] } = {}) {
  return {
    getViewerPose: () => pose,
    getHitTestResults: () => results,
    detectedPlanes: undefined,
  };
}
const viewerPose = {
  transform: identityPose,
  views: [{ projectionMatrix: proj90 }],
};
const hitResult = { getPose: () => hitPose };

function engineWith(session) {
  const e = new ARCoreWeb();
  e.session = session;
  e.referenceSpace = { name: 'ref' };
  e.hitTestSource = { name: 'viewer-source' };
  return e;
}

// 2a: successful tap hit at corner (1, 0)
{
  const session = new FakeSession();
  const e = engineWith(session);
  const p = e.hitTest({ x: 1, y: 0 });
  session.pump(frameWith({ pose: viewerPose }));       // pose frame
  await tick();                                        // source created, results frame queued
  check('2a source created with offsetRay', session.sources.length === 1 && session.sources[0].offsetRay instanceof globalThis.XRRay);
  check('2a offsetRay direction == TR corner ray', dirNear(session.sources[0].offsetRay.direction, [S3, S3, -S3]));
  check('2a offsetRay origin == camera position', session.sources[0].offsetRay.origin.y === 1.6);
  session.pump(frameWith({ results: [hitResult] }));   // results frame
  const res = await p;
  check('2a resolves hit with pose position', res.hit === true && JSON.stringify(res.position) === '[2,0,-3]');
  check('2a result rotation is quat array', JSON.stringify(res.rotation) === '[0,0,0,1]');
  check('2a source cancelled after consume', session.sources[0].cancelled === true);
}

// 2b: no hit across the empty-frame grace -> {hit:false}
{
  const session = new FakeSession();
  const e = engineWith(session);
  const p = e.hitTest({ x: 0.25, y: 0.75 });
  session.pump(frameWith({ pose: viewerPose }));
  await tick();
  // A fresh source's first frames are commonly empty (async raycast);
  // the engine tolerates a bounded grace of them before calling a miss.
  for (let i = 0; i < 6; i++) session.pump(frameWith({ results: [] }));
  const res = await p;
  check('2b resolves {hit:false}', res.hit === false && !res.error);
  check('2b source cancelled after no-hit', session.sources[0].cancelled === true);
}

// 2c: session ends before any frame -> SESSION_ENDED, no source created
{
  const session = new FakeSession();
  const e = engineWith(session);
  const p = e.hitTest({ x: 0.1, y: 0.1 });
  session.emit('end');
  const res = await p;
  check('2c settles SESSION_ENDED', res.hit === false && res.error === 'SESSION_ENDED');
  session.pump(frameWith({ pose: viewerPose }));
  await tick();
  check('2c no source created after end', session.sources.length === 0);
}

// 2d: session ends WHILE source creation is in flight -> late source cancelled
{
  const session = new FakeSession();
  let resolveSource;
  session.requestHitTestSource = ({ offsetRay }) => new Promise(res => {
    resolveSource = () => { const s = new FakeSource(session, offsetRay); session.sources.push(s); res(s); };
  });
  const e = engineWith(session);
  const p = e.hitTest({ x: 0.9, y: 0.9 });
  session.pump(frameWith({ pose: viewerPose }));
  await tick();                       // onPoseFrame now awaiting the source promise
  session.emit('end');                // settles SESSION_ENDED with no source yet
  const res = await p;
  check('2d settles SESSION_ENDED during creation', res.error === 'SESSION_ENDED');
  resolveSource();                    // source arrives late
  await tick();
  check('2d late source cancelled (no leak)', session.sources.length === 1 && session.sources[0].cancelled === true);
}

// 2e: timeout when results frame never arrives -> HIT_TEST_TIMEOUT + cancel
{
  const session = new FakeSession();
  const e = engineWith(session);
  const p = e.hitTest({ x: 0.3, y: 0.3 });
  session.pump(frameWith({ pose: viewerPose }));
  await tick();
  check('2e source created', session.sources.length === 1);
  const res = await p;                // waits ~1000ms for the timeout
  check('2e settles HIT_TEST_TIMEOUT', res.hit === false && res.error === 'HIT_TEST_TIMEOUT');
  check('2e source cancelled on timeout', session.sources[0].cancelled === true);
}

// 2f: centre path regression — cache still serves (0.5, 0.5) and defaults
{
  const session = new FakeSession();
  const e = engineWith(session);
  e.lastHitPosition = [1, 2, 3];
  e.lastHitRotation = [0, 0, 0, 1];
  e.reticleVisible = true;
  const res = await e.hitTest({ x: 0.5, y: 0.5 });
  check('2f centre uses cached hit', res.hit === true && JSON.stringify(res.position) === '[1,2,3]');
  check('2f centre creates no ray source', session.sources.length === 0);
  const res2 = await e.hitTest({});
  check('2f default args are centre', res2.hit === true);
  const res3 = await e.hitTest();
  check('2f no-arg call is centre', res3.hit === true);
}

// 2g: moveModel shim now targets the tap point (facade contract match)
{
  const session = new FakeSession();
  const e = engineWith(session);
  e.anchors.set('m1', { modelUrl: 'x.glb', position: [0, 0, 0], rotation: [0, 0, 0, 1], scale: [1, 1, 1] });
  const p = e.moveModel({ modelId: 'm1', x: 1, y: 0 });
  session.pump(frameWith({ pose: viewerPose }));
  await tick();
  session.pump(frameWith({ results: [hitResult] }));
  const res = await p;
  check('2g moveModel succeeds via ray hit', res.success === true);
  check('2g model moved to hit position', JSON.stringify(e.anchors.get('m1').position) === '[2,0,-3]');
}
});
