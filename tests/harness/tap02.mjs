// Tap semantics harness (owner's call, 2026-11-19): a tap places the
// model when nothing is placed yet; once a model is active, taps are
// inert and dragging is the only move gesture. A placing tap that
// misses every surface must route NO_SURFACE to onError.

import { test, expect } from 'vitest';

test('tap02', async () => {
  globalThis.window = globalThis;
  globalThis.innerWidth = 400;
  globalThis.innerHeight = 800;
  const { createARView } = await import('../../src/ar-view.js');
  const check = (name, cond) => expect(cond, name).toBe(true);

  const makeView = (hitResult) => {
    const handlers = {};
    const el = {
      style: {},
      addEventListener: (type, fn) => { handlers[type] = fn; },
      removeEventListener: (type) => { delete handlers[type]; },
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 400, height: 800 }),
    };
    const calls = { place: [], move: [] };
    const stubEngine = {
      hitTest: async () => hitResult,
      placeModel: async (opts) => { calls.place.push(opts); return { modelId: 'm1' }; },
      moveModel: async (opts) => { calls.move.push(opts); return { hit: true, position: [0, 0, -1] }; },
      anchors: new Map(),
      loadedModels: new Map(),
      dispose() {},
    };
    const view = createARView({ engine: stubEngine, overlay: el });
    const tap = async (x, y) => {
      const ev = (pointerId, cx, cy) => ({ pointerId, clientX: cx, clientY: cy, target: null, preventDefault() {}, stopPropagation() {} });
      handlers.pointerdown(ev(1, x, y));
      handlers.pointerup(ev(1, x, y));
      await new Promise((r) => setTimeout(r, 10));
    };
    return { view, calls, tap };
  };

  // ---------- A: first tap places, later taps are inert ----------
  {
    const { view, calls, tap } = makeView({ hit: true, position: [0.42, 0, -1.13] });
    let errors = 0;
    view.enableCustomization({ modelUrl: '/models/astronaut.glb', onError: () => { errors += 1; } });
    await tap(200, 420);
    check('first tap places the model', calls.place.length === 1 && view.activeModelId === 'm1');
    check('the placed model is the configured modelUrl', calls.place[0].modelUrl === '/models/astronaut.glb');
    await tap(100, 100);
    check('a tap with a model active does not place again', calls.place.length === 1);
    check('a tap with a model active does not move the model', calls.move.length === 0);
    check('no errors from well-placed taps', errors === 0);
  }

  // ---------- B: a placing tap that misses reaches onError ----------
  {
    const { view, calls, tap } = makeView({ hit: false });
    let captured = null;
    view.enableCustomization({ modelUrl: '/models/astronaut.glb', onError: (e) => { captured = e; } });
    await tap(200, 420);
    check('missed tap routes NO_SURFACE to onError', captured && captured.code === 'NO_SURFACE');
    check('missed tap places nothing', calls.place.length === 0 && view.activeModelId === null);
  }
});
