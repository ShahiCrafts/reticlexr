// Drag plane math + screen projection (pure helpers behind the
// third drag implementation and the debug projection readout):
//  A. dragPlaneTarget intersects the finger ray with the drag
//     plane and re-applies the grab offset; it refuses rays that
//     point at/above the horizon, rays whose plane crossing is out
//     of sane reach, and a missing plane.
//  B. projectToScreen is rayFromScreenPoint's inverse: a world
//     point projects to the normalised screen point whose ray
//     passes through it; points behind the camera return null.

import { test, expect } from 'vitest';

test('drag03', async () => {
  const THREE = await import('three');
  const { dragPlaneTarget, projectToScreen, rayFromScreenPoint } =
    await import('../../src/web.js');
  const check = (name, cond) => expect(cond, name).toBe(true);
  const near = (a, b) => Math.abs(a - b) < 1e-4;

  // ---------- A: dragPlaneTarget ----------
  // Viewer at (0, 1.4, 0), ray straight down-forward (0, -1, -1)/√2.
  const down = {
    origin: { x: 0, y: 1.4, z: 0 },
    direction: { x: 0, y: -Math.SQRT1_2, z: -Math.SQRT1_2 },
  };
  const hit = dragPlaneTarget(down, 0, null);
  check(
    'down ray meets the plane at (0, 0, -1.4)',
    hit && near(hit[0], 0) && hit[1] === 0 && near(hit[2], -1.4)
  );
  const shifted = dragPlaneTarget(down, 0, { x: -3, z: 2 });
  check(
    'grab offset shifts the target, height stays the plane',
    shifted && near(shifted[0], -3) && shifted[1] === 0 && near(shifted[2], 0.6)
  );
  const raised = dragPlaneTarget(down, 0.5, null);
  check(
    'a raised plane (bed height) meets closer',
    raised && near(raised[2], -0.9) && raised[1] === 0.5
  );
  check(
    'upward ray returns null',
    dragPlaneTarget(
      { origin: down.origin, direction: { x: 0, y: 0.5, z: -1 } },
      0,
      null
    ) === null
  );
  check(
    'missing plane returns null',
    dragPlaneTarget(down, null, null) === null
  );
  check(
    'out-of-reach crossing returns null',
    dragPlaneTarget(
      { origin: down.origin, direction: { x: 0, y: -0.03, z: -1 } },
      -5,
      null
    ) === null
  );

  // ---------- B: projectToScreen ----------
  const proj = new THREE.PerspectiveCamera(90, 1, 0.1, 100).projectionMatrix.toArray();
  const atOrigin = {
    position: { x: 0, y: 0, z: 0 },
    orientation: { x: 0, y: 0, z: 0, w: 1 },
    matrix: new THREE.Matrix4().toArray(),
  };
  const centre = projectToScreen([0, 0, -2], atOrigin, proj);
  check(
    'a point dead ahead projects to screen centre',
    centre && near(centre.x, 0.5) && near(centre.y, 0.5)
  );
  const right = projectToScreen([1, 0, -2], atOrigin, proj);
  check(
    'a point right of ahead projects right of centre',
    right && near(right.x, 0.75) && near(right.y, 0.5)
  );
  const lowLeft = projectToScreen([-2, -2, -2], atOrigin, proj);
  check(
    'a low-left point projects to the bottom-left corner',
    lowLeft && near(lowLeft.x, 0) && near(lowLeft.y, 1)
  );
  check(
    'a point behind the camera returns null',
    projectToScreen([0, 0, 2], atOrigin, proj) === null
  );
  // Round trip: the ray through the projected point passes through
  // the original world point (cross-check against rayFromScreenPoint).
  const p = [0.6, -0.3, -2.5];
  const n = projectToScreen(p, atOrigin, proj);
  const ray = rayFromScreenPoint(atOrigin, proj, n.x, n.y);
  const s = p[2] / ray.direction.z; // scale along the ray to p's depth
  check(
    'ray through the projection reaches the original point',
    near(ray.origin.x + ray.direction.x * s, p[0]) &&
    near(ray.origin.y + ray.direction.y * s, p[1])
  );
  // A raised viewer shifts the projection down-screen.
  const raisedViewer = {
    position: { x: 0, y: 1.4, z: 0 },
    orientation: { x: 0, y: 0, z: 0, w: 1 },
    matrix: new THREE.Matrix4().makeTranslation(0, 1.4, 0).toArray(),
  };
  const fromAbove = projectToScreen([0, 0, -2], raisedViewer, proj);
  check(
    'from a raised viewer the floor point projects lower',
    fromAbove && near(fromAbove.x, 0.5) && near(fromAbove.y, 0.85)
  );
});
