// Debug readout (owner request 2026-11-17): with
// enableCustomization({ debug: true, onDebug }), ARView reports
// each step of an interaction: the tapped pixel and normalised
// point, the hit coordinate, the model's measured base centre,
// and where the model's centre lies after the tap, so placement
// accuracy can be verified on-device. With debug off, nothing is
// reported.

import { test, expect } from 'vitest';

test('debug01', async () => {
  globalThis.window = globalThis;
  globalThis.innerWidth = 400;
  globalThis.innerHeight = 800;
  const { createARView } = await import('../../src/ar-view.js');
  const check = (name, cond) => expect(cond, name).toBe(true);
  const tick = () => new Promise((r) => setTimeout(r, 0));

  const makeEl = () => {
    const listeners = new Map();
    return {
      addEventListener(t, fn) {
        if (!listeners.has(t)) listeners.set(t, new Set());
        listeners.get(t).add(fn);
      },
      removeEventListener(t, fn) {
        listeners.get(t)?.delete(fn);
      },
      setPointerCapture() {},
      releasePointerCapture() {},
      getBoundingClientRect() {
        return { left: 0, top: 0, width: 400, height: 800 };
      },
      fire(t, e) {
        for (const fn of [...(listeners.get(t) || [])]) fn(e);
      },
    };
  };

  const makeEngine = () => ({
    anchors: new Map([['m1', { position: [0.42, 0, -1.13] }]]),
    loadedModels: new Map([
      ['m1', { children: [{ position: { x: -0.57, y: 0, z: 0 } }] }],
    ]),
    async hitTest() {
      return { hit: true, position: { x: 0.42, y: 0, z: -1.13 }, rotation: [0, 0, 0, 1] };
    },
    async placeModel() {
      return { success: true, modelId: 'm1' };
    },
    async moveModel({ modelId }) {
      this.anchors.set(modelId, { position: [0.1, 0, -0.5] });
      return { hit: true, position: { x: 0.1, y: 0, z: -0.5 } };
    },
    dispose() {},
  });

  const tap = async (el, x, y) => {
    const ev = { pointerId: 7, pointerType: 'touch', clientX: x, clientY: y, target: el, preventDefault() {}, stopPropagation() {} };
    el.fire('pointerdown', { ...ev });
    el.fire('pointerup', { ...ev });
    await tick();
    await tick();
  };

  // ---------- debug on ----------
  const entries = [];
  const el = makeEl();
  const view = createARView({ engine: makeEngine(), overlay: el });
  view.enableCustomization({
    modelUrl: () => 'model.glb',
    debug: true,
    onDebug: (e) => entries.push(e),
  });
  await tap(el, 200, 420);

  const tapEntry = entries.find((e) => e.type === 'tap');
  check('tap entry reported', !!tapEntry);
  check('tap pixel is the touched pixel', tapEntry.pixel.x === 200 && tapEntry.pixel.y === 420);
  check(
    'tap normalised via the overlay rect',
    Math.abs(tapEntry.normalised.x - 0.5) < 1e-9 && Math.abs(tapEntry.normalised.y - 0.525) < 1e-9,
  );
  const placed = entries.find((e) => e.type === 'placed');
  check('placed entry reported', !!placed);
  check('placed hit is the runtime coordinate', placed.hit.x === 0.42 && placed.hit.z === -1.13);
  check('centre after tap matches the anchor', placed.centre.x === 0.42 && placed.centre.z === -1.13);
  check('base centre is the measured centre (negated wrapper offset)', placed.baseCentre.x === 0.57 && placed.baseCentre.y === 0);

  await tap(el, 100, 200);
  const moved = entries.find((e) => e.type === 'moved');
  check('moved entry reported on the second tap', !!moved);
  check('moved centre follows the new anchor', moved.centre.x === 0.1 && moved.centre.z === -0.5);
  view.destroy();

  // ---------- debug off: silent ----------
  const silent = [];
  const el2 = makeEl();
  const view2 = createARView({ engine: makeEngine(), overlay: el2 });
  view2.enableCustomization({
    modelUrl: () => 'model.glb',
    onDebug: (e) => silent.push(e),
  });
  await tap(el2, 200, 420);
  check('no entries without debug: true', silent.length === 0);
  view2.destroy();
});
