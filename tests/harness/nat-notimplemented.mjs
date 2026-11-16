// Verification harness (Phase 6, Stage A — owner decision 1).
// Stub-based, runs under plain Node:
// `node tests/harness/nat-notimplemented.mjs`.
//
// Native setTransform / setMaterial / removeModel now reject with a
// coded NOT_IMPLEMENTED (Option B), like placeModel / moveModel /
// getPlacedModels / clearModels. The Java plugin cannot run here, so
// this harness stubs the native side at Capacitor's own seam: a
// PluginHeader for ARCore (which makes the real Capacitor proxy
// dispatch these methods to `nativePromise`) plus a nativePromise
// double that rejects the way PluginCall.reject(message, code)
// surfaces in JS — an Error whose `code` is the native code and
// whose message is the native message. For each method it verifies
// the facade (src/index.js):
//   1. routes the call to the native method of the same name,
//   2. rejects (never resolves a fictional success),
//   3. surfaces the native NOT_IMPLEMENTED code unchanged (the
//      API-05 convention: runtime codes are preserved),
//   4. keeps the facade's 'Failed to …: ' prefix with the native
//      message intact.
//
// The stub globals MUST be installed before @capacitor/core is
// first imported (it snapshots window.Capacitor at import time), so
// src/index.js is pulled in with a dynamic import after the stub.

const nativeCalls = [];
globalThis.Capacitor = {
  PluginHeaders: [
    {
      name: 'ARCore',
      methods: [
        { name: 'setTransform', rtype: 'promise' },
        { name: 'setMaterial', rtype: 'promise' },
        { name: 'removeModel', rtype: 'promise' },
      ],
    },
  ],
  nativePromise: (pluginName, methodName) => {
    nativeCalls.push([pluginName, methodName]);
    const err = new Error(
      `${methodName} is not implemented in the native Android runtime: ` +
        'native is scoped to session + hit-testing (Option B) and places no models'
    );
    err.code = 'NOT_IMPLEMENTED';
    return Promise.reject(err);
  },
};

const { ARCore } = await import('../../src/index.js');

let failures = 0;
const check = (name, cond) => { console.log(cond ? 'PASS' : 'FAIL', name); if (!cond) failures++; };
const rejectionOf = async (p) => { try { await p; return null; } catch (e) { return e; } };

const cases = [
  ['setTransform', () => ARCore.setTransform({ modelId: 'm1', scale: 2 }), 'Failed to update transform: '],
  ['setMaterial', () => ARCore.setMaterial({ modelId: 'm1', color: '#ff0000' }), 'Failed to update material: '],
  ['removeModel', () => ARCore.removeModel({ modelId: 'm1' }), 'Failed to remove model: '],
];

for (const [method, invoke, prefix] of cases) {
  nativeCalls.length = 0;
  const err = await rejectionOf(invoke());
  check(`${method}: facade rejects when the native side rejects`, err instanceof Error);
  check(`${method}: native NOT_IMPLEMENTED code surfaces unchanged`, !!err && err.code === 'NOT_IMPLEMENTED');
  check(
    `${method}: facade routed to native ARCore.${method}`,
    nativeCalls.length === 1 && nativeCalls[0][0] === 'ARCore' && nativeCalls[0][1] === method
  );
  check(
    `${method}: message keeps facade prefix + native message`,
    !!err && err.message.startsWith(prefix) && err.message.includes('not implemented in the native Android runtime')
  );
}

console.log(failures === 0 ? 'ALL PASS' : `${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
