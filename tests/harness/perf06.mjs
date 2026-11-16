// PERF-06 verification: engine logging is silent unless
// config.debug is enabled. Runs under plain Node:
// `node tests/harness/perf06.mjs`.
const { ARCoreWeb } = await import('../../src/web.js');

let failures = 0;
const check = (name, cond) => {
  console.log(cond ? 'PASS' : 'FAIL', name);
  if (!cond) failures++;
};

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

console.log(failures === 0 ? 'ALL PASS' : `${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
