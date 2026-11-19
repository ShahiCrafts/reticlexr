// Decoder wiring harness (2026-11-19): the engine's GLTFLoader
// must carry the Meshopt decoder unconditionally, and a KTX2
// loader only when a Basis transcoder path is configured AND a
// renderer exists to detect GPU support against. Wiring is
// idempotent per loader instance.

import { test, expect } from 'vitest';

test('loader01', async () => {
  globalThis.window = globalThis;
  globalThis.innerWidth = 400;
  globalThis.innerHeight = 800;
  const { ARCoreWeb } = await import('../../src/web.js');
  const { MeshoptDecoder } = await import('three/examples/jsm/libs/meshopt_decoder.module.js');
  const check = (name, cond) => expect(cond, name).toBe(true);

  const engine = new ARCoreWeb();
  const calls = { meshopt: [], ktx2: [] };
  engine.gltfLoader = {
    setMeshoptDecoder: (d) => calls.meshopt.push(d),
    setKTX2Loader: (l) => calls.ktx2.push(l),
  };

  // No transcoder path configured: meshopt only.
  engine._wireModelDecoders();
  check('meshopt decoder attached', calls.meshopt.length === 1 && calls.meshopt[0] === MeshoptDecoder);
  check('no ktx2 loader without a path', calls.ktx2.length === 0);

  // Idempotent for the same loader instance.
  engine._wireModelDecoders();
  check('wiring is idempotent per loader', calls.meshopt.length === 1 && calls.ktx2.length === 0);

  // A partial loader stub without the setters must not throw
  // (the api05 session-failure path relies on this).
  const partial = new ARCoreWeb();
  partial.gltfLoader = {};
  let threw = false;
  try { partial._wireModelDecoders(); } catch { threw = true; }
  check('a setter-less loader stub does not throw', !threw);

  // A path without a renderer still cannot wire KTX2 (support
  // detection needs the renderer's capabilities).
  engine.ktx2TranscoderPath = '/libs/basis/';
  engine._wireModelDecoders();
  check('no ktx2 loader without a renderer', calls.ktx2.length === 0);

  // Path + renderer: the loader is created through the seam,
  // configured with the path, support-detected, and attached.
  const fakeKtx2 = {
    path: null,
    detectedWith: null,
    setTranscoderPath(p) { this.path = p; },
    detectSupport(r) { this.detectedWith = r; },
  };
  engine._createKTX2Loader = () => fakeKtx2;
  engine.renderer = { fakeRenderer: true };
  engine._wireModelDecoders();
  check('ktx2 loader attached once path and renderer exist', calls.ktx2.length === 1 && calls.ktx2[0] === fakeKtx2);
  check('transcoder path passed through', fakeKtx2.path === '/libs/basis/');
  check('support detected against the renderer', fakeKtx2.detectedWith === engine.renderer);
});
