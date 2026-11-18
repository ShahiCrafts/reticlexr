// moveModel must move POSITION ONLY (device report 2026-11-18:
// tap-to-move and drags landed the model "not right there"). The
// engine's moveModel — and the render loop's drag tracking — applied
// the hit pose's ORIENTATION to the model on every move. That
// orientation is the surface plane's (its yaw is the plane's own
// axis alignment, not the model's facing), so each move twisted the
// model to the plane's axes and silently discarded the rotation the
// user had set; the model's bulk then lay in a direction nobody
// chose, away from the tapped point. Moves now keep the model's
// current facing; rotation stays owned by transformModel/rotateBy.

import { test, expect } from 'vitest';

test('move02', async () => {
  globalThis.window = globalThis;
  const THREE = await import('three');
  const { ARCoreWeb } = await import('../../src/web.js');
  const check = (name, cond) => expect(cond, name).toBe(true);

  const engine = new ARCoreWeb();
  const yaw = [0, Math.SQRT1_2, 0, Math.SQRT1_2]; // 90 deg about Y — the user's facing
  const root = new THREE.Group();
  root.quaternion.set(yaw[0], yaw[1], yaw[2], yaw[3]);
  engine.anchors.set('m1', {
    modelUrl: 'x.glb', position: [0, 0, 0], rotation: [...yaw], scale: [1, 1, 1],
  });
  engine.loadedModels.set('m1', root);

  // A hit whose orientation is some plane's — deliberately unlike yaw.
  engine.hitTest = async () => ({
    hit: true,
    position: [0.5, 0.1, -1.2],
    rotation: [0.5, 0.5, 0.5, 0.5],
  });

  const res = await engine.moveModel({ modelId: 'm1', x: 0.3, y: 0.7 });
  check('move reports success', res.success === true);
  check(
    'anchor position followed the hit',
    JSON.stringify(engine.anchors.get('m1').position) === '[0.5,0.1,-1.2]'
  );
  check(
    'anchor rotation kept the user facing (no plane-orientation stomp)',
    JSON.stringify(engine.anchors.get('m1').rotation) === JSON.stringify(yaw)
  );
  check(
    'scene object moved and kept its facing',
    root.position.x === 0.5 && root.position.z === -1.2 &&
    Math.abs(root.quaternion.y - Math.SQRT1_2) < 1e-9 && Math.abs(root.quaternion.w - Math.SQRT1_2) < 1e-9
  );

  // A miss leaves everything untouched.
  engine.hitTest = async () => ({ hit: false, code: 'NO_SURFACE' });
  const miss = await engine.moveModel({ modelId: 'm1', x: 0.9, y: 0.9 });
  check('miss passes through', miss.hit === false);
  check(
    'miss changed nothing',
    JSON.stringify(engine.anchors.get('m1').position) === '[0.5,0.1,-1.2]' &&
    JSON.stringify(engine.anchors.get('m1').rotation) === JSON.stringify(yaw)
  );
});
