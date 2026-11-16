// Verification harness (Phases 1-2). Stub-based, Vitest suite (TEST-01): run with `npm test`. See tests/README.md.
// Throwaway BUG-05 verification: stub element + stub engine, no DOM/WebXR.

import { test, expect } from 'vitest';

test('bug05', async () => {
globalThis.innerWidth = 1000;
globalThis.innerHeight = 1000;

const { ARView } = await import('../../src/ar-view.js');

let unhandled = 0;
process.on('unhandledRejection', () => { unhandled++; });

function makeElement() {
  const handlers = {};
  return {
    handlers,
    addEventListener(type, fn) { handlers[type] = fn; },
    removeEventListener(type) { delete handlers[type]; },
  };
}

function fireTap(el) {
  const ev = { pointerId: 1, clientX: 500, clientY: 500, target: null, preventDefault() {} };
  el.handlers.pointerdown(ev);
  el.handlers.pointerup(ev);
}

function makeEngine({ failPlace = false } = {}) {
  const calls = [];
  return {
    calls,
    async hitTest() { return { hit: true, position: [0, 0, 0], rotation: [0, 0, 0, 1] }; },
    async placeModel(args) {
      calls.push(args);
      if (failPlace) throw new Error('GLB 404');
      return { anchorId: 'anchor-1' };
    },
  };
}

const tick = () => new Promise(r => setTimeout(r, 20));
const check = (name, cond) => expect(cond, name).toBe(true);

// Case 1: string modelUrl (previously threw TypeError on every tap)
{
  const el = makeElement();
  const engine = makeEngine();
  const view = new ARView({ engine, overlay: el });
  let tapped = false;
  view.enableCustomization({ modelUrl: '/models/chair.glb', onTap: () => { tapped = true; } });
  fireTap(el);
  await tick();
  check('string modelUrl places without throwing', engine.calls.length === 1 && engine.calls[0].modelUrl === '/models/chair.glb');
  check('string modelUrl: onTap still fires after placement', tapped === true);
}

// Case 2: function modelUrl still works
{
  const el = makeElement();
  const engine = makeEngine();
  const view = new ARView({ engine, overlay: el });
  view.enableCustomization({ modelUrl: () => '/models/table.glb' });
  fireTap(el);
  await tick();
  check('function modelUrl resolves to its return value', engine.calls.length === 1 && engine.calls[0].modelUrl === '/models/table.glb');
}

// Case 3: placement failure routes to onError, no unhandled rejection
{
  const el = makeElement();
  const engine = makeEngine({ failPlace: true });
  const view = new ARView({ engine, overlay: el });
  let gotError = null; let tapped = false;
  view.enableCustomization({ modelUrl: '/models/missing.glb', onError: (e) => { gotError = e; }, onTap: () => { tapped = true; } });
  fireTap(el);
  await tick();
  check('placement failure reaches onError', gotError && /GLB 404/.test(gotError.message));
  check('onTap not fired when placement failed', tapped === false);
}

// Case 4: placement failure without onError is logged, not unhandled
{
  const el = makeElement();
  const engine = makeEngine({ failPlace: true });
  const view = new ARView({ engine, overlay: el });
  view.enableCustomization({ modelUrl: '/models/missing.glb' });
  fireTap(el);
  await tick();
  check('no unhandled rejections across all cases', unhandled === 0);
}
});
