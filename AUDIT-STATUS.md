# Audit Status — reticlexr remediation

Tracking table for every finding in [AUDIT.md](AUDIT.md) (68 rated
findings plus the 3 TODO items SEC-01, COMPAT-03, COMPAT-06).

- **Status:** open / fixed / wontfix / TODO
- **Verification:** tested (exercised by a run) / code-verified (read
  and syntax-checked only) / device TODO (needs hardware or an
  environment this repo work cannot reach)

| ID | Severity | Status | Commit | Verification |
| --- | --- | --- | --- | --- |
| BUG-01 | high | fixed | 7dbe91b795bf2bab272471450811e618a7cdb70f | tested |
| BUG-02 | high | fixed | 0c668b2704df4a7e46b851cd5263bc4e47de24a7 | code-verified |
| BUG-03 | high | fixed | 09cfffa9b2129053d36f49dbb5c227c4e53f22ee | tested |
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
| API-06 | medium | fixed | 1865dcd5f2176baaba608e353e8cb8c4ad75f368 | tested |
| API-07 | low | fixed | 128b8b92fbcd82af404519606f8f3fb0b0b02003 | code-verified |
| API-08 | low | fixed | 21cd817a2aa68f09db669cebad0baee19c0583d1 | tested |
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
| PKG-02 | high | fixed | 1865dcd5f2176baaba608e353e8cb8c4ad75f368 | tested |
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
- **BUG-12 (corrected mechanism):** `rotation: null` (falsy) inherited
  the previous hit's quaternion via the engine's `lastHitRotation`
  fallback (`rotation = rotation || this.lastHitRotation` in
  `placeModel`). The audit's stated mechanism was imprecise — the
  ARView path already defaulted to identity; the trap was in the
  engine. The fix removes the fallback, so falsy rotation now always
  means identity.
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

## Phase 2 notes

- **BUG-01:** normalisation lives in the engine (`normalizeVector3` /
  `normalizeQuaternion` / `normalizeScale` in `src/web.js`), so the
  hook, ARView and the facade shims all inherit it. Rotation shapes:
  quaternion array/object pass through; `{x, y, z}` objects are Euler
  RADIANS (the hook's documented form). The facade `setTransform`
  shim keeps its own documented convention — a plain `{x, y, z}` there
  is Euler DEGREES — and converts before delegating, so the two never
  mix. Verified by `tests/harness/bug01.mjs` (32 assertions).
- **BUG-03:** implemented, not contract-reduced. Non-centre points run
  `hitTestAtPoint`: viewer pose + `rayFromScreenPoint` (NDC unproject
  through the inverse projection matrix, rotated by the viewer
  orientation) → `session.requestHitTestSource({space, offsetRay})` →
  next frame's results. The one-off source is cancelled on EVERY
  settle path (consumed, no-hit, error, 1s timeout, session end —
  including a session ending while the source is being created).
  Centre (0.5, 0.5) keeps the cached viewer-ray fast path, so
  `ARView.placeModel`/`moveModel` defaults are unchanged. Verified by
  `tests/harness/bug03.mjs` (38 assertions: centre ray == forward
  axis, four corners symmetric at (±1,±1,−1)/√3 for fov 90 aspect 1,
  aspect/FOV ratios, yaw/pitch poses, all cancel paths). On-device
  ray accuracy remains device TODO in the general sense.
- **API-08:** the range [0.1, 5] is defined once (`SCALE_MIN` /
  `SCALE_MAX` in `src/web.js`), enforced by the engine in
  `placeModel`/`transformModel`; `ARView.setScale` and Android
  `ARModelManager.setTransform` (was [0.25, 3]) use the same range.
  JS verified by `tests/harness/api08.mjs`; the Android one-liner is
  code-verified only (no Java toolchain in this environment).
- **API-06 / PKG-02:** hand-written declarations in `src/*.d.ts`,
  `"types": "src/index.d.ts"` in package.json, `typescript` as a
  devDependency, and `npm run check-types` (`tsc --noEmit --checkJs`,
  tsconfig at repo root; `types-check/webxr.d.ts` holds check-only
  ambient WebXR declarations and is not shipped). The check initially
  flagged 49 JSDoc/type errors; fixing them also surfaced two real
  contract bugs: ARView destructured an `event` field from the
  gesture tap payload that gestures never sends (removed), and the
  hook's screenshot error access did not narrow the result union
  (now `success === false`). A strict-mode consumer smoke test
  (`tests/harness/types-smoke.ts`, incl. @ts-expect-error negatives)
  compiles clean against the declarations.
- **SEC-04 follow-through (commit 74020ac):** `CAMERA_CAPTURE_UNAVAILABLE`
  failures now carry the `enableScreenshots: true` hint in the error
  message and a one-time-per-instance console.warn (both producer
  paths: missing XRWebGLBinding, and session without a camera grant —
  the latter now also returns the code). Samples updated where
  screenshots are actually taken/discussed: the example app (its
  screenshot button would have failed on every session since Phase 1),
  `docs/API.md`, the website screenshots guide (its warning text
  still described the pre-SEC-04 behaviour), troubleshooting and the
  API reference. CHANGELOG: the 1.1.0 entry is opened with a
  "Behavior changes" section listing SEC-04; Phase 7 completes it.
- **TEST-01 prep (commit 4623e73):** the Phase 1/2 stub harnesses are
  committed under `tests/harness/` (all 13 run green against current
  code) with `tests/README.md`; Phase 6 formalises them into Vitest.
- **Bundle:** example builds clean at 777.99 kB min / 211.23 kB gzip
  vs the Phase 0 baseline 773.55 / 210.74 (+0.57% / +0.23% — the
  normalisers, ray hit test and clamp).
