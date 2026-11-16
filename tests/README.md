# Tests

## `harness/` — the Vitest suite (TEST-01)

The stub harnesses written during the audit remediation (Phases
1–6) are the package's automated tests. Each file stubs the XR
session / DOM / native bridge just enough to exercise the real
`src/` code and asserts the fixed behaviour; they are the evidence
behind the "tested" marks in `AUDIT-STATUS.md`.

Since Phase 6 they run under Vitest: each file is a single test
whose body is the original harness, with its local
`check(name, cond)` helper backed by Vitest's `expect` — the
conversion changed the scaffolding only, never an assertion. The
files keep their original names and location (the GitHub connector
used to push this branch cannot delete or rename files), and
`vitest.config.mjs` includes `tests/harness/*.mjs` directly.

Run the suite with:

```sh
npm test                                     # vitest run — the whole suite
npm run check-types                          # tsc --checkJs over src/
npx tsc -p tests/harness/tsconfig.smoke.json # consumer declaration smoke test
```

Two suites deserve a note:

- `leak-phase3` runs the leak protocol twice: once normally (counts
  must return exactly to the post-warm-up baseline) and once as the
  **negative control** — a fresh engine whose resources are all
  registered as cache-shared, disabling disposal through the
  engine's own ownership mechanism. The negative-control test
  asserts the counts DO balloon past baseline: it expects the leak
  signature, proving the protocol can catch a real leak. (Under
  plain Node this was the `LEAK_NEGATIVE=1` mode; it is now an
  always-on test.)
- `nat-notimplemented` stubs the native Android side at Capacitor's
  PluginHeader / `nativePromise` seam and verifies the facade
  surfaces the coded `NOT_IMPLEMENTED` rejection for
  `setTransform` / `setMaterial` / `removeModel`.
