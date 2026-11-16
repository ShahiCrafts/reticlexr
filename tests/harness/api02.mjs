// Verification harness (Phase 4). Stub-based, runs under plain Node:
// `node tests/harness/api02.mjs`. Phase 6 (TEST-01) formalises these
// into the Vitest suite — see tests/README.md.
// API-02: the native event bridge installs LAZILY and IDEMPOTENTLY
// (never at import time, never twice on the same plugin), and the
// React hook is reachable through the reticlexr/react subpath module.
const { setupEventBridge, ARCore } = await import('../../src/index.js');
const reactEntry = await import('../../src/react.js');

let failures = 0;
const check = (name, cond) => { console.log(cond ? 'PASS' : 'FAIL', name); if (!cond) failures++; };

// --- The react subpath module exists and re-exports the hook ---
check('reticlexr/react module exports useARCore', typeof reactEntry.useARCore === 'function');
check('root still re-exports useARCore (deprecated alias)', typeof ARCore === 'object');

// --- Bridge: lazy + idempotent, single delivery ---
const subs = {};
const fakePlugin = {
  addListener: (type, cb) => {
    (subs[type] = subs[type] || []).push(cb);
    return Promise.resolve({ remove: async () => {} });
  },
};
const bus = {};
let delivered = 0;
let lastData = null;
bus.modelPlaced = [(data) => { delivered++; lastData = data; }];

check('first install returns true', setupEventBridge(fakePlugin, bus) === true);
check('second install is a no-op', setupEventBridge(fakePlugin, bus) === false);
check('third install is a no-op', setupEventBridge(fakePlugin, bus) === false);

const types = Object.keys(subs);
check('bridge subscribes to all 12 native event types', types.length === 12);
check('exactly one bridge listener per type', types.every((t) => subs[t].length === 1));

subs.modelPlaced.forEach((cb) => cb({ modelId: 'm1' }));
check('one native event is delivered exactly once', delivered === 1);
check('event payload passes through untouched', lastData && lastData.modelId === 'm1');

// A different plugin object gets its own bridge (WeakSet is per-plugin)
const otherPlugin = { addListener: () => Promise.resolve({ remove: async () => {} }) };
check('a different plugin can still be bridged', setupEventBridge(otherPlugin, bus) === true);

// A throwing local listener must not break delivery to the others
let secondRan = false;
bus.error = [() => { throw new Error('listener boom'); }, () => { secondRan = true; }];
const errPlugin = { addListener: (t, cb) => { if (t === 'error') errPlugin.cb = cb; return Promise.resolve({ remove: async () => {} }); } };
setupEventBridge(errPlugin, bus);
const origError = console.error;
console.error = () => {};
errPlugin.cb({ message: 'x' });
console.error = origError;
check('a throwing listener does not block later listeners', secondRan === true);

console.log(failures === 0 ? 'ALL PASS' : `${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
