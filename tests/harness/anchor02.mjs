// Session-stability hardening (device report 2026-11-18: "the AR
// view keeps on closing"): anchor work must never be able to
// kill the frame loop or churn anchors.
//  A. frame.createAnchor throws SYNCHRONOUSLY (session did not
//     grant the anchors feature — the method exists regardless):
//     the loop must survive, render must still run every frame,
//     minting must stop for the session, anchorPending must clear.
//  B. Anchor pose queries throw TRANSIENTLY: the anchor is kept
//     (only a sustained failure run drops it), and write-back
//     resumes when poses succeed again.
//  C. A non-finite position never enters a model record.

import { test, expect } from 'vitest';

test('anchor02', async () => {
  globalThis.XRRay = class {
    constructor(origin, direction) { this.origin = origin; this.direction = direction; }
  };
  globalThis.XRRigidTransform = class {
    constructor(position, orientation) { this.position = position; this.orientation = orientation; }
  };
  const THREE = await import('three');
  const { ARCoreWeb } = await import('../../src/web.js');
  const check = (name, cond) => expect(cond, name).toBe(true);
  const tick = () => new Promise((r) => setTimeout(r, 5));

  const proj = new THREE.PerspectiveCamera(90, 1, 0.1, 100).projectionMatrix.toArray();
  const viewerTransform = {
    position: { x: 0, y: 1.4, z: 0 },
    orientation: { x: 0, y: 0, z: 0, w: 1 },
  };
  const baseFrame = {
    getViewerPose: () => ({ transform: viewerTransform, views: [{ projectionMatrix: proj }] }),
    getHitTestResults: () => [],
    getPose: () => undefined,
  };
  const makeEngine = () => {
    const engine = new ARCoreWeb();
    const state = { renders: 0, loopCb: null };
    engine.renderer = {
      setAnimationLoop: (cb) => { state.loopCb = cb; },
      render: () => { state.renders++; },
    };
    engine.referenceSpace = {};
    engine.planeDetectionSupported = false;
    engine.config.showReticle = false;
    engine.scene = new THREE.Scene();
    engine.session = {
      requestHitTestSource: async () => ({ cancel() {} }),
      addEventListener: () => {},
      removeEventListener: () => {},
    };
    return { engine, state };
  };

  // ---- Part A: synchronous createAnchor throw ----
  {
    const { engine, state } = makeEngine();
    const root = new THREE.Group();
    engine.scene.add(root);
    engine.anchors.set('m1', {
      modelUrl: 'x.glb', position: [0, 0, -2], rotation: [0, 0, 0, 1], scale: [1, 1, 1],
      xrAnchor: null, needsAnchor: true, anchorPending: false,
    });
    engine.loadedModels.set('m1', root);
    let mintCalls = 0;
    const frame = {
      ...baseFrame,
      createAnchor: () => { mintCalls++; throw new Error('anchors feature not granted'); },
    };
    engine.startRendering();
    for (let i = 0; i < 3; i++) {
      state.loopCb(16 * (i + 1), frame); // must not throw
      await tick();
    }
    check('render ran on every frame despite the mint throw', state.renders === 3);
    check('minting stopped after the sync throw', mintCalls === 1 && engine._anchorMintBroken === true);
    check('anchorPending cleared after the throw', engine.anchors.get('m1').anchorPending === false);
    check('model fell back to coordinates', engine.anchors.get('m1').xrAnchor === null);
  }

  // ---- Part B: transient anchor pose failures ----
  {
    const { engine, state } = makeEngine();
    const root = new THREE.Group();
    engine.scene.add(root);
    const anchorSpace = {};
    engine.anchors.set('m1', {
      modelUrl: 'x.glb', position: [0, 0, -2], rotation: [0, 0, 0, 1], scale: [1, 1, 1],
      xrAnchor: { anchorSpace, delete() {} }, needsAnchor: false, anchorPending: false,
    });
    engine.loadedModels.set('m1', root);
    let poseThrows = true;
    const frame = {
      ...baseFrame,
      getPose: () => {
        if (poseThrows) throw new Error('transient pose failure');
        return {
          transform: {
            position: { x: 0.5, y: 0, z: -2 },
            orientation: { x: 0, y: 0, z: 0, w: 1 },
          },
        };
      },
    };
    engine.startRendering();
    for (let i = 0; i < 5; i++) {
      state.loopCb(16 * (i + 1), frame);
      await tick();
    }
    check(
      'anchor survives transient pose failures',
      engine.anchors.get('m1').xrAnchor !== null
    );
    poseThrows = false;
    state.loopCb(200, frame);
    await tick();
    const rec = engine.anchors.get('m1');
    check('write-back resumes after recovery', rec.position[0] === 0.5 && rec.position[2] === -2);
    check('failure counter reset on success', (rec._anchorPoseFailures || 0) === 0);
  }

  // ---- Part C: non-finite positions are rejected ----
  {
    const { engine } = makeEngine();
    const root = new THREE.Group();
    engine.scene.add(root);
    engine.anchors.set('m1', {
      modelUrl: 'x.glb', position: [0, 0, -2], rotation: [0, 0, 0, 1], scale: [1, 1, 1],
    });
    engine.loadedModels.set('m1', root);
    await engine.transformModel({ modelId: 'm1', position: [NaN, 0, -2] });
    check(
      'NaN position ignored, last good kept',
      engine.anchors.get('m1').position[2] === -2 && Number.isFinite(engine.anchors.get('m1').position[0])
    );
    await engine.transformModel({ modelId: 'm1', position: [1, 0, -2] });
    check('finite position still applies', engine.anchors.get('m1').position[0] === 1);
  }
});
