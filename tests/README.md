# Tests

## `harness/` — Phase 1/2 verification stubs

Plain-Node stub harnesses written during the audit remediation
(Phases 1–2) to verify fixes that would otherwise need WebXR hardware:
each script stubs the XR session / DOM just enough to exercise the
real `src/` code and asserts the fixed behaviour. They are the
evidence behind the "tested" marks in `AUDIT-STATUS.md`.

Run any of them with:

```sh
node tests/harness/bug03.mjs
npm run check-types                          # tsc --checkJs over src/
npx tsc -p tests/harness/tsconfig.smoke.json # consumer declaration smoke test
```

Phase 6 (TEST-01) formalises these into the Vitest suite; until then
they are kept runnable but deliberately minimal — no test framework,
no fixtures beyond the inline stubs.
