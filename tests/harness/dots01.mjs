import { describe, it, expect, vi } from 'vitest';

// dots01 — overlapping planes must not draw overlapping dot
// fields. ARCore commonly reports the same surface as two
// overlapping planes; before the fix each drew its full dot grid,
// so the surface showed two interleaved grids. Now all planes'
// dots are rebuilt in one pass over a shared occupancy grid
// (largest plane first): no two dots in the world may sit closer
// than 0.75 × the dot spacing, while a lone plane keeps its exact
// regular grid.

const THREE = await import('three');
const { ARCoreWeb } = await import('../../src/web.js');

const SPACING = 0.14;
const MIN_DIST = SPACING * 0.75;

function makeEngine() {
  const engine = new ARCoreWeb();
  engine.scene = new THREE.Scene();
  engine.planesMeshGroup ??= new THREE.Group();
  engine.planeDotsGroup ??= new THREE.Group();
  engine.scene.add(engine.planesMeshGroup, engine.planeDotsGroup);
  engine.referenceSpace = {};
  engine.config.showPlanes = false;
  engine.config.showPlaneDots = true;
  engine.config.dotSpacing = SPACING;
  return engine;
}

const SQUARE = [
  { x: -1.05, z: -1.05 },
  { x: 1.05, z: -1.05 },
  { x: 1.05, z: 1.05 },
  { x: -1.05, z: 1.05 },
];

function makePlane(dx, dz) {
  const planeSpace = {};
  const matrix = new THREE.Matrix4().makeTranslation(dx, 0, dz).toArray();
  return {
    plane: {
      polygon: SQUARE,
      orientation: 'horizontal',
      planeSpace,
      lastChangedTime: 1,
    },
    planeSpace,
    pose: { transform: { matrix } },
  };
}

function makeFrame(entries) {
  const poses = new Map(entries.map((e) => [e.planeSpace, e.pose]));
  return {
    detectedPlanes: new Set(entries.map((e) => e.plane)),
    getPose: (space) => poses.get(space) || null,
  };
}

function worldDots(engine) {
  const out = [];
  const v = new THREE.Vector3();
  for (const [, data] of engine.detectedPlanes) {
    if (!data.dots) continue;
    const arr = data.dots.instanceMatrix.array;
    for (let i = 0; i < data.dots.count; i++) {
      v.set(arr[i * 16 + 12], arr[i * 16 + 13], arr[i * 16 + 14]);
      v.applyMatrix4(data.dots.matrix);
      out.push([v.x, v.y, v.z]);
    }
  }
  return out;
}

describe('dots01', () => {
  it('a lone plane keeps its full regular grid', () => {
    const engine = makeEngine();
    const a = makePlane(0, 0);
    engine.processDetectedPlanes(makeFrame([a]));
    const dots = worldDots(engine);
    // Grid from -1 to 0.96 at 0.14 spacing = 15 per axis, all
    // strictly inside the 2.1 m polygon.
    expect(dots.length).toBe(225);
  });

  it('overlapping planes share one dot field (no close pairs)', () => {
    const engine = makeEngine();
    const a = makePlane(0, 0);
    const b = makePlane(0.35, 0.21); // same surface, shifted grid
    engine.processDetectedPlanes(makeFrame([a, b]));

    const dotsA = engine.detectedPlanes.get(a.plane).dots;
    const dotsB = engine.detectedPlanes.get(b.plane).dots;
    expect(dotsA.count).toBe(225); // largest/first keeps its grid
    expect(dotsB.count).toBeGreaterThan(0); // fills only the gaps
    expect(dotsB.count).toBeLessThan(225);

    const all = worldDots(engine);
    let min = Infinity;
    for (let i = 0; i < all.length; i++) {
      for (let j = i + 1; j < all.length; j++) {
        const dx = all[i][0] - all[j][0];
        const dy = all[i][1] - all[j][1];
        const dz = all[i][2] - all[j][2];
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (d < min) min = d;
      }
    }
    expect(min).toBeGreaterThanOrEqual(MIN_DIST - 1e-6);
  });
});
