// PERF-06 verification: engine logging is silent unless
// config.debug is enabled. Vitest suite (TEST-01): run with `npm test`.

import { test, expect } from 'vitest';

test('perf06', async () => {
const { ARCoreWeb } = await import('../../src/web.js');

const check = (name, cond) => expect(cond, name).toBe(true);

const engine = new ARCoreWeb();
check('debug defaults to off', engine.config.debug === false);
check('modelCacheLimit defaults to 20', engine.config.modelCacheLimit === 20);

let logged = 0;
const origLog = console.log;
console.log = () => { logged++; };
let silentWhenOff;
let audibleWhenOn;
try {
  engine.debugLog('[ARCore] should be silent');
  engine.setReticleVisible(true); // has a debugLog call site
  silentWhenOff = logged === 0;
  engine.setConfig({ debug: true });
  engine.debugLog('[ARCore] should be audible');
  audibleWhenOn = logged === 1;
} finally {
  console.log = origLog;
}
check('no console output while debug is off', silentWhenOff);
check('console output flows while debug is on', audibleWhenOn);
});
