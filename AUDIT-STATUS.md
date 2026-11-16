# Audit Status — reticlexr remediation

Tracking table for every finding in [AUDIT.md](AUDIT.md) (68 rated
findings plus the 3 TODO items SEC-01, COMPAT-03, COMPAT-06).

- **Status:** open / fixed / wontfix / TODO
- **Verification:** tested (exercised by a run) / code-verified (read
  and syntax-checked only) / device TODO (needs hardware or an
  environment this repo work cannot reach)

| ID | Severity | Status | Commit | Verification |
| --- | --- | --- | --- | --- |
| BUG-01 | high | open | — | — |
| BUG-02 | high | fixed | 0c668b2704df4a7e46b851cd5263bc4e47de24a7 | code-verified |
| BUG-03 | high | open | — | — |
| BUG-04 | medium | fixed | 68076fcd39b36a560773359930e59e8af5c7a9c3 | code-verified |
| BUG-05 | medium | fixed | 102010cc15bd4bbc2f99f98500726b8e156ce4e5 | tested |
| BUG-06 | medium | fixed | 025e415affef388f6fd220089dc406598bb45f95 | code-verified |
| BUG-07 | medium | fixed | 21da2da19e5941cfe518ac05311490339b3136a8 | tested |
| BUG-08 | medium | fixed | f4e3f123a9950a6f15b11763541f095dae3dec08 | tested |
| BUG-09 | medium | open | — | — |
| BUG-10 | low | fixed | 2f513e936d17523f6eb39e9af17259c9006bcc64 | tested |
| BUG-11 | low | fixed | 052cc339bcf90a336ac3010067888d04c5e6e20a | tested |
| BUG-12 | low | fixed | ffc595a7448bdb3f36d6eed6a3a88318ad2149e9 | tested |
| LEAK-01 | high | open | — | — |
| LEAK-02 | high | open | — | — |
| LEAK-03 | medium | open | — | — |
| LEAK-04 | medium | open | — | — |
| LEAK-05 | high | open | — | — |
| LEAK-06 | medium | open | — | — |
| LEAK-07 | low | open | — | — |
| PERF-01 | high | open | — | — |
| PERF-02 | medium | open | — | — |
| PERF-03 | medium | open | — | — |
| PERF-04 | low | open | — | — |
| PERF-05 | low | open | — | — |
| PERF-06 | low | open | — | — |
| NAT-01 | critical | open | — | — |
| NAT-02 | critical | open | — | — |
| NAT-03 | high | open | — | — |
| NAT-04 | high | open | — | — |
| NAT-05 | high | open | — | — |
| NAT-06 | high | open | — | — |
| NAT-07 | high | open | — | — |
| NAT-08 | medium | open | — | — |
| NAT-09 | medium | open | — | — |
| NAT-10 | medium | open | — | — |
| NAT-11 | low | open | — | — |
| NAT-12 | low | open | — | — |
| NAT-13 | low | open | — | — |
| API-01 | high | open | — | — |
| API-02 | high | open | — | — |
| API-03 | medium | open | — | — |
| API-04 | medium | open | — | — |
| API-05 | medium | open | — | — |
| API-06 | medium | open | — | — |
| API-07 | low | open | — | — |
| API-08 | low | open | — | — |
| COMPAT-01 | medium | fixed | 15d15b47be380299f97f1724bccbf855cd691293 | tested |
| COMPAT-02 | medium | fixed | 1d072ba413e3d547613d3e5bcd855682e1931fab | tested |
| COMPAT-03 | TODO | TODO | — | — |
| COMPAT-04 | low | open | — | — |
| COMPAT-05 | low | open | — | — |
| COMPAT-06 | TODO | TODO | — | — |
| SEC-01 | TODO | TODO | — | — |
| SEC-02 | medium | fixed | e4bc492e9bbc575fdf9ac47772d115fcc43160f2 | tested |
| SEC-03 | low | open | — | — |
| SEC-04 | low | fixed | 6d3d0da9af8e897d88382a41905ec08b85e6b845 | tested |
| PKG-01 | high | open | — | — |
| PKG-02 | high | open | — | — |
| PKG-03 | medium | open | 6af682ef21320ce4d0ed5200e6b1e8a990d7c178 | tested (partial) |
| PKG-04 | medium | open | — | — |
| PKG-05 | low | open | — | — |
| TEST-01 | high | open | — | — |
| TEST-02 | medium | open | — | — |
| TEST-03 | low | open | — | — |
| DOC-01 | critical | open | — | — |
| DOC-02 | high | open | — | — |
| DOC-03 | medium | open | — | — |
| DOC-04 | medium | open | — | — |
| DOC-05 | low | open | — | — |
| DOC-06 | low | open | — | — |
| DOC-07 | low | open | — | — |

## Phase 1 notes

- **PKG-03 (partial):** the extensionless `import('./web')` is fixed and
  the lazy web factory was exercised under Node ESM (commit above).
  `type: module` and the `exports` map remain open — Phase 4.
- **BUG-12:** the ARView path already defaulted to identity (verified by
  test before changing anything). The live trap was the engine's
  `rotation = rotation || this.lastHitRotation` fallback: a caller passing
  `rotation: null` silently inherited an unrelated hit's rotation. The
  fallback is removed; omitted/null rotation now always means identity.
- **BUG-06:** repeat `startSession()` calls on the hook now return `true`
  immediately while a session is starting or active, instead of racing a
  second `requestSession()` and registering duplicate listeners.
- **BUG-07:** verification is "tested" via stub harness — a failure after
  `requestSession` (all reference spaces rejected) ends the session and
  clears the session fields. On-device WebXR behaviour remains device
  TODO in the general sense.
- **SEC-04 (behaviour change, demanded by the finding):** `camera-access`
  is no longer implied by `lightEstimation`. Consumers who want
  passthrough screenshots must pass `enableScreenshots: true` to
  `startSession` (engine) or `create()` (ARView); otherwise
  `takeScreenshot()` returns `CAMERA_CAPTURE_UNAVAILABLE`.
