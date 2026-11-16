// Verification harness (Phase 4). Stub-based Vitest suite (TEST-01): run with `npm test`. See tests/README.md.
// API-01: ONE canonical model identifier — `modelId` — across the
// engine, ARView and the facade. `anchorId` remains as a deprecated
// alias (same string) on inputs, outputs and event payloads, with a
// one-time console.warn when an alias INPUT is used. The facade
// accepts `modelUrl` or `modelPath` and forwards both.

import { test, expect } from 'vitest';
import * as THREE from 'three';

test('api01', async () => {
const { ARCoreWeb, warnDeprecatedOnce } = await import('../../src/web.js');
const { ARView } = await import('../../src/ar-view.js');
const { ARCore } = await import('../../src/index.js');

const check = (name, cond) => expect(cond, name).toBe(true);

// Capture deprecation warnings
const warns = [];
const origWarn = console.warn;
console.warn = (...args) => { warns.push(args.join(' ')); };
const warnsSince = (n) => warns.length - n;

// ---- Engine stub (same pattern as leak-phase3) ----
function makeEngine() {
  const engine = new ARCoreWeb();
  engine.scene = new THREE.Scene();
  engine.planesMeshGroup = new THREE.Group();
  engine.planeDotsGroup = new THREE.Group();
  engine.scene.add(engine.planesMeshGroup, engine.planeDotsGroup);
  engine.gltfLoader = {
    load(url, onLoad) {
      const scene = new THREE.Group();
      scene.add(new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshStandardMaterial({ color: 0xffffff })
      ));
      onLoad({ scene, cameras: [], animations: [] });
    },
  };
  return engine;
}

const engine = makeEngine();
const events = [];
engine.addFrameListener((e) => events.push(e));

// ---- Canonical shape: placeModel({ modelUrl }) ----
let mark = warns.length;
const placed = await engine.placeModel({ modelUrl: 'a.glb', position: [0, 0, -1] });
check('placeModel returns modelId', typeof placed.modelId === 'string' && placed.modelId.length > 0);
check('placeModel returns anchorId alias with the SAME value', placed.anchorId === placed.modelId);
check('modelUrl (canonical) triggers no deprecation warning', warnsSince(mark) === 0);
check('engine tracks the model under the canonical id', engine.getAnchors().has(placed.modelId));

const placedEvent = events.find((e) => e.type === 'modelPlaced');
check('modelPlaced event carries modelId', placedEvent && placedEvent.modelId === placed.modelId);
check('modelPlaced event carries anchorId alias (same value)', placedEvent && placedEvent.anchorId === placed.modelId);

// ---- Deprecated input alias: modelPath, warned once ----
mark = warns.length;
const placed2 = await engine.placeModel({ modelPath: 'b.glb', position: [0, 0, -2] });
check('placeModel({ modelPath }) still works', typeof placed2.modelId === 'string');
check('modelPath use warns exactly once', warnsSince(mark) === 1 && warns[warns.length - 1].includes('modelPath'));
mark = warns.length;
await engine.placeModel({ modelPath: 'b.glb', position: [0, 0, -3] });
check('second modelPath use does not warn again', warnsSince(mark) === 0);

// ---- transformModel: canonical and alias inputs ----
await engine.transformModel({ modelId: placed.modelId, scale: 2 });
check('transformModel({ modelId }) applies', engine.getAnchors().get(placed.modelId).scale[0] === 2);
mark = warns.length;
await engine.transformModel({ anchorId: placed.modelId, scale: 3 });
check('transformModel({ anchorId }) still applies', engine.getAnchors().get(placed.modelId).scale[0] === 3);
check('anchorId input warns exactly once', warnsSince(mark) === 1 && warns[warns.length - 1].includes('anchorId'));
const transformedEvent = events.filter((e) => e.type === 'modelTransformed').pop();
check('modelTransformed event carries modelId + alias',
  transformedEvent.modelId === placed.modelId && transformedEvent.anchorId === placed.modelId);

// ---- setModelColor / switchModel / removeModel via both names ----
await engine.setModelColor({ modelId: placed.modelId, color: '#ff0000' });
const colorEvent = events.filter((e) => e.type === 'modelColorChanged').pop();
check('modelColorChanged event carries modelId + alias',
  colorEvent.modelId === placed.modelId && colorEvent.anchorId === placed.modelId);

mark = warns.length;
const switched = await engine.switchModel({ anchorId: placed.modelId, modelUrl: 'c.glb' });
check('switchModel({ anchorId }) returns canonical modelId', switched.modelId === placed.modelId && switched.anchorId === placed.modelId);
check('alias reuse does not re-warn', warnsSince(mark) === 0);

await engine.removeModel({ modelId: placed2.modelId });
check('removeModel({ modelId }) removes', !engine.getAnchors().has(placed2.modelId));
const removedEvent = events.filter((e) => e.type === 'modelRemoved').pop();
check('modelRemoved event carries modelId + alias',
  removedEvent.modelId === placed2.modelId && removedEvent.anchorId === placed2.modelId);
await engine.removeModel({ anchorId: placed.modelId });
check('removeModel({ anchorId }) removes', !engine.getAnchors().has(placed.modelId));

// ---- warnDeprecatedOnce helper semantics ----
mark = warns.length;
warnDeprecatedOnce('harness-key-1', 'first');
warnDeprecatedOnce('harness-key-1', 'second');
warnDeprecatedOnce('harness-key-2', 'other');
check('warnDeprecatedOnce: once per key', warnsSince(mark) === 2);

// ---- ARView: canonical id end to end ----
const view = new ARView({ engine: makeEngine() });
const viewPlaced = await view.placeModel('a.glb', { position: [0, 0, -1] });
check('ARView.placeModel succeeds with modelId', viewPlaced.success === true && viewPlaced.modelId === viewPlaced.anchorId);
check('ARView.activeModelId is the canonical id', view.activeModelId === viewPlaced.modelId);
await view.removeModel();
check('ARView.removeModel clears the active id', view.activeModelId === null);

// ---- Facade: one option shape across runtimes ----
// Through the real Capacitor proxy to the real web implementation:
// with no model field the engine's required-field error must come
// back; with modelUrl alone the call must get PAST that check and
// fail at load time instead (the facade forwarded a usable shape).
let facadeError = null;
try { await ARCore.placeModel({}); } catch (e) { facadeError = e; }
check('facade placeModel({}) surfaces the required-field error',
  !!facadeError && facadeError.message.includes('modelUrl/modelPath is required'));
facadeError = null;
try { await ARCore.placeModel({ modelUrl: 'a.glb', position: [0, 0, -1] }); } catch (e) { facadeError = e; }
check('facade placeModel({ modelUrl }) gets past the field check (fails at load, not validation)',
  !!facadeError && facadeError.message.includes('Failed to load model'));

console.warn = origWarn;
});
