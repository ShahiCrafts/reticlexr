// Verification harness (Phase 4). Runs under plain Node:
// `node tests/harness/api04.mjs`. Phase 6 (TEST-01) formalises these
// into the Vitest suite — see tests/README.md.
// API-04: useARCore can target an instance-scoped engine via
// useARCore({ engine }); the default remains ONE shared engine for
// all consumers (now constructed lazily). Rendered with
// react-dom/server: renderToString runs the hook body (state, refs,
// callbacks) without effects — enough to prove which engine each
// hook instance resolved and that config written through one hook
// lands on exactly that engine.
import React from 'react';
import { renderToString } from 'react-dom/server';
import { ARCoreWeb } from '../../src/web.js';
import { useARCore } from '../../src/hooks.js';

let failures = 0;
const check = (name, cond) => { console.log(cond ? 'PASS' : 'FAIL', name); if (!cond) failures++; };

function probe(options) {
  let captured = null;
  function Probe() {
    captured = useARCore(options);
    return null;
  }
  renderToString(React.createElement(Probe));
  return captured;
}

// --- Per-instance engines are isolated ---
const engineA = new ARCoreWeb();
const engineB = new ARCoreWeb();
const hookA = probe({ engine: engineA });
const hookB = probe({ engine: engineB });

hookA.setConfig({ debug: true });
check('config written via hook A lands on engine A', engineA.getConfig().debug === true);
check('engine B is untouched by hook A', engineB.getConfig().debug === false);
check('hook B reads engine B (debug still false)', hookB.getConfig().debug === false);

hookB.setConfig({ dotSize: 0.5 });
check('config written via hook B lands on engine B', engineB.getConfig().dotSize === 0.5);
check('engine A does not see hook B config', engineA.getConfig().dotSize !== 0.5);

// --- Default behaviour unchanged: one shared engine ---
const hookD1 = probe();
const hookD2 = probe(undefined);
const hookD3 = probe({});
hookD1.setConfig({ dotSpacing: 0.4242 });
check('default consumers share one engine (1→2)', hookD2.getConfig().dotSpacing === 0.4242);
check('default consumers share one engine (1→3)', hookD3.getConfig().dotSpacing === 0.4242);
check('shared default engine is neither passed instance',
  engineA.getConfig().dotSpacing !== 0.4242 && engineB.getConfig().dotSpacing !== 0.4242);

// --- The hook surface is intact ---
check('hook returns the documented API',
  typeof hookA.startSession === 'function' &&
  typeof hookA.placeModel === 'function' &&
  typeof hookA.getRenderer === 'function' &&
  Array.isArray(hookA.placedModels) &&
  hookA.isSessionActive === false);

console.log(failures === 0 ? 'ALL PASS' : `${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
