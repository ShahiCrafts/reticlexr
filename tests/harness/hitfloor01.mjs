// Floor-plane fallback for point hit tests (device report
// 2026-11-18: five taps in the lower third of the screen produced no
// move at all). The runtime's hit test only answers where it has
// tracked planes; the floor right under the user — where a low tap
// aims when pulling a model closer — is commonly outside every
// tracked polygon. On a genuine miss, hitTestAtPoint now intersects
// the tap ray with the horizontal plane at the most recent centre
// hit's height and resolves with fallback: true. Scaffolding
// follows bug03's fake session.

import { test, expect } from 'vitest';
import * as THREE from 'three';

test('hitfloor01', async () => {
  globalThis.window = globalThis;
  globalThis.XRRay = class XRRay {
    constructor(origin, direction) { this.origin = origin; this.direction = direction; }
  };
  const { ARCoreWeb, rayFromScreenPoint } = await import('../../src/web.js');
  const check = (name, cond) => expect(cond, name).toBe(true);
  const tick = () => new Promise((r) => setImmediate(r));

  class FakeSource {
    constructor(owner, offsetRay) { this.owner = owner; this.offsetRay = offsetRay; this.cancelled = false; }
    cancel() { this.cancelled = true; }
  }
  class FakeSession {
    constructor() { this.listeners = new Map(); this.raf = []; this.sources = []; }
    addEventListener(t, fn) { if (!this.listeners.has(t)) this.listeners.set(t, []); this.listeners.get(t).push(fn); }
    removeEventListener(t, fn) { this.listeners.set(t, (this.listeners.get(t) || []).filter((f) => f !== fn)); }
    requestAnimationFrame(cb) { this.raf.push(cb); }
    async requestHitTestSource({ offsetRay }) {
      const s = new FakeSource(this, offsetRay);
      this.sources.push(s);
      return s;
    }
    pump(frame) { const q = this.raf; this.raf = []; q.forEach((cb) => cb(0, frame)); }
  }

  const proj90 = new THREE.PerspectiveCamera(90, 1, 0.01, 100).projectionMatrix.toArray();
  const identityPose = {
    position: { x: 0, y: 1.6, z: 0 },
    orientation: { x: 0, y: 0, z: 0, w: 1 },
  };
  const viewerPose = { transform: identityPose, views: [{ projectionMatrix: proj90 }] };
  const frameWith = ({ pose = null, results = [] } = {}) => ({
    getViewerPose: () => pose,
    getHitTestResults: () => results,
    detectedPlanes: undefined,
  });

  async function missFlow(engine, session, x, y) {
    const p = engine.hitTest({ x, y });
    session.pump(frameWith({ pose: viewerPose })); // pose frame: ray + source
    await tick();
    for (let i = 0; i < 6; i++) session.pump(frameWith({ results: [] })); // grace expires
    return p;
  }

  // A: low tap, runtime misses, floor known -> fallback hit where
  // the ray meets the floor plane (y = 0.1), flagged as a fallback.
  {
    const session = new FakeSession();
    const e = new ARCoreWeb();
    e.session = session;
    e.referenceSpace = { name: 'ref' };
    e.lastHitPosition = [0, 0.1, -0.8];
    e.lastHitRotation = [0, 0, 0, 1];
    const res = await missFlow(e, session, 0.5, 0.75);
    const ray = rayFromScreenPoint(identityPose, proj90, 0.5, 0.75);
    const t = (0.1 - ray.origin.y) / ray.direction.y;
    const expected = [ray.origin.x + ray.direction.x * t, 0.1, ray.origin.z + ray.direction.z * t];
    check('A: fallback resolves a hit', res.hit === true && res.fallback === true);
    check(
      'A: position is the ray/floor intersection',
      res.position.every((v, i) => Math.abs(v - expected[i]) < 1e-6)
    );
    check('A: planeType horizontal', res.planeType === 'horizontal');
    check('A: source still cancelled on settle', session.sources[0].cancelled === true);
  }

  // B: no floor known yet (no centre hit ever) -> the miss stands.
  {
    const session = new FakeSession();
    const e = new ARCoreWeb();
    e.session = session;
    e.referenceSpace = { name: 'ref' };
    const res = await missFlow(e, session, 0.5, 0.75);
    check('B: without a known floor the miss stands', res.hit === false && !res.fallback);
  }

  // C: a ray that does not head down at the floor (upper-screen
  // tap) must not be rescued onto the floor.
  {
    const session = new FakeSession();
    const e = new ARCoreWeb();
    e.session = session;
    e.referenceSpace = { name: 'ref' };
    e.lastHitPosition = [0, 0.1, -0.8];
    const res = await missFlow(e, session, 0.5, 0.4);
    check('C: upward ray still misses', res.hit === false && !res.fallback);
  }

  // D: a tracked hit always wins over the fallback.
  {
    const session = new FakeSession();
    const e = new ARCoreWeb();
    e.session = session;
    e.referenceSpace = { name: 'ref' };
    e.lastHitPosition = [0, 0.1, -0.8];
    const hitResult = {
      getPose: () => ({
        transform: {
          position: { x: 2, y: 0.1, z: -3 },
          orientation: { x: 0, y: 0, z: 0, w: 1 },
        },
      }),
    };
    const p = e.hitTest({ x: 0.5, y: 0.75 });
    session.pump(frameWith({ pose: viewerPose }));
    await tick();
    session.pump(frameWith({ results: [hitResult] }));
    const res = await p;
    check(
      'D: tracked hit wins, no fallback flag',
      res.hit === true && !res.fallback && JSON.stringify(res.position) === '[2,0.1,-3]'
    );
  }
});
