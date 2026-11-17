import { describe, it, expect, vi } from 'vitest';

// tapchain01 — tap-to-place / tap-to-move accuracy, end to end.
// The REAL gesture controller, ARView and engine are wired to a
// fake XR runtime whose hit test does honest ray-vs-floor maths:
// the ray the engine builds is intersected with the floor plane
// y = 0 analytically, exactly as ARCore would. For a grid of tap
// pixels the placed model must land on the floor point that an
// INDEPENDENT implementation (three's Raycaster through the same
// camera) predicts, and projecting the landed position back to
// screen pixels must reproduce the tapped pixel to under half a
// pixel. Any error in the chain (normalisation, rect mapping,
// y-flip, ray construction, pose plumbing, placement offset)
// breaks one of these equalities.

globalThis.window = globalThis;
globalThis.innerWidth = 400;
globalThis.innerHeight = 800;
globalThis.XRRay = class {
  constructor(origin, direction) {
    this.origin = origin;
    this.direction = direction;
  }
};

const THREE = await import('three');
const { ARCoreWeb } = await import('../../src/web.js');
const { createARView } = await import('../../src/ar-view.js');

function fakeElement() {
  const listeners = new Map();
  const el = {
    addEventListener(type, fn) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(fn);
    },
    removeEventListener(type, fn) {
      listeners.get(type)?.delete(fn);
    },
    setPointerCapture() {},
    releasePointerCapture() {},
    getBoundingClientRect() {
      return { left: 0, top: 0, width: 400, height: 800 };
    },
    fire(type, event) {
      for (const fn of [...(listeners.get(type) || [])]) fn(event);
    },
  };
  return el;
}

const tick = () => new Promise((r) => setTimeout(r, 0));

// Camera: standing height, looking down-forward at the floor.
const camera = new THREE.PerspectiveCamera(70, 400 / 800, 0.1, 100);
camera.position.set(0.4, 1.5, 0.6);
camera.lookAt(0, 0, -0.8);
camera.updateMatrixWorld(true);
const q = camera.quaternion;
const viewerTransform = {
  position: { x: 0.4, y: 1.5, z: 0.6 },
  orientation: { x: q.x, y: q.y, z: q.z, w: q.w },
};

function intersectFloor(ray) {
  const o = ray.origin;
  const d = ray.direction;
  if (!o || !d || d.y >= -1e-9) return null;
  const t = -o.y / d.y;
  return { x: o.x + d.x * t, y: 0, z: o.z + d.z * t };
}

const frame = {
  getViewerPose: () => ({
    transform: viewerTransform,
    views: [{ projectionMatrix: Array.from(camera.projectionMatrix.elements) }],
  }),
  getHitTestResults: (source) => {
    const hit = intersectFloor(source.offsetRay);
    return hit
      ? [{ getPose: () => ({ transform: { position: hit, orientation: { x: 0, y: 0, z: 0, w: 1 } } }) }]
      : [];
  },
};

function expectedFor(px, py) {
  const ndc = new THREE.Vector2((px / 400) * 2 - 1, -((py / 800) * 2 - 1));
  const rc = new THREE.Raycaster();
  rc.setFromCamera(ndc, camera);
  const out = new THREE.Vector3();
  rc.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), out);
  return out;
}

function projectToPixel(pos) {
  const v = new THREE.Vector3(pos.x, pos.y, pos.z).project(camera);
  return { px: ((v.x + 1) / 2) * 400, py: ((1 - v.y) / 2) * 800 };
}

describe('tapchain01', () => {
  it('taps land on the tapped pixel (place + moves, sub-pixel round trip)', async () => {
    const el = fakeElement();
    const engine = new ARCoreWeb();
    engine.scene = new THREE.Scene();
    const rafQueue = [];
    engine.session = {
      addEventListener() {},
      removeEventListener() {},
      requestAnimationFrame(cb) {
        rafQueue.push(cb);
      },
      async requestHitTestSource({ offsetRay }) {
        return { offsetRay, cancelled: false, cancel() { this.cancelled = true; } };
      },
    };
    engine.gltfLoader = {
      load(url, onLoad) {
        const group = new THREE.Group();
        const geo = new THREE.BoxGeometry(0.3, 0.5, 0.3);
        const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial());
        mesh.position.y = 0.25; // base centre exactly at the origin
        group.add(mesh);
        onLoad({ scene: group, animations: [] });
      },
    };

    const view = createARView({ engine, overlay: el });
    engine.referenceSpace = {};
    engine.viewerSpace = {};
    view.enableCustomization({ modelUrl: () => 'model.glb' });

    const pump = async () => {
      for (let i = 0; i < 14; i++) {
        const cbs = rafQueue.splice(0);
        for (const cb of cbs) cb(0, frame);
        await tick();
      }
    };
    const tap = async (x, y) => {
      const ev = { pointerId: 5, pointerType: 'touch', clientX: x, clientY: y, target: el, preventDefault() {}, stopPropagation() {} };
      el.fire('pointerdown', { ...ev });
      el.fire('pointerup', { ...ev });
      await pump();
    };

    const points = [
      [200, 420],
      [64, 150],
      [340, 690],
      [310, 260],
    ];
    for (const [px, py] of points) {
      await tap(px, py);
      expect(view.activeModelId).toBeTruthy();
      const anchor = engine.anchors.get(view.activeModelId);
      const pos = Array.isArray(anchor.position)
        ? { x: anchor.position[0], y: anchor.position[1], z: anchor.position[2] }
        : anchor.position;
      const expected = expectedFor(px, py);
      const err = Math.hypot(
        pos.x - expected.x,
        pos.y - expected.y,
        pos.z - expected.z,
      );
      expect(err).toBeLessThan(1e-4); // lands on the analytic floor point
      const back = projectToPixel(pos);
      expect(Math.abs(back.px - px)).toBeLessThan(0.5); // sub-pixel round trip
      expect(Math.abs(back.py - py)).toBeLessThan(0.5);
    }
    view.destroy();
  });
});
