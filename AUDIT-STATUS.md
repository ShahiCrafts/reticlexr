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
| BUG-09 | medium | fixed | 82f2f6619c31adcb92cef7c6f9308563f39f7d9d | tested |
| BUG-10 | low | fixed | 2f513e936d17523f6eb39e9af17259c9006bcc64 | tested |
| BUG-11 | low | fixed | 052cc339bcf90a336ac3010067888d04c5e6e20a | tested |
| BUG-12 | low | fixed | ffc595a7448bdb3f36d6eed6a3a88318ad2149e9 | tested |
| LEAK-01 | high | fixed | 40a4126a941775c5d8218d54156c27074f710880 | tested |
| LEAK-02 | high | fixed | 40a4126a941775c5d8218d54156c27074f710880 | tested |
| LEAK-03 | medium | fixed | 40a4126a941775c5d8218d54156c27074f710880 | tested |
| LEAK-04 | medium | fixed | 40a4126a941775c5d8218d54156c27074f710880 | tested |
| LEAK-05 | high | open | — | — |
| LEAK-06 | medium | open | — | — |
| LEAK-07 | low | fixed | 40a4126a941775c5d8218d54156c27074f710880 | tested |
| PERF-01 | high | fixed | 430922d9d290e2925e74623209781f5d28241f20 | tested |
| PERF-02 | medium | fixed | c32e836d9e8228fd806da4a438d3f0b031134984 | tested |
| PERF-03 | medium | open | — | — |
| PERF-04 | low | fixed | 3a11a8912f67e32a4bc5047a8e1f55254371d096 | code-verified |
| PERF-05 | low | wontfix | 65a8dd673738ec01903e07c2712de5e877b61dc7 | tested |
| PERF-06 | low | fixed | 24cbb078e083b19ca1d0c56ccf982cae7fd283af | tested |
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

## Phase 3 notes

- **Ownership rule (LEAK-01/02/03/04/07):** placements now SHARE the
  cached model's geometry, materials and textures (the per-placement
  material clone in `placeModel` is gone). Per-instance variation
  (`setModelColor`, `setModelTexture`, `setModelMaterial`) clones on
  write, so a clone — and any texture applied to it — is owned by that
  placement. `disposeObject(root, skip)` disposes everything under a
  root EXCEPT the engine's shared set (cache resources + the shared
  plane-dot geometry), which is disposed only on cache eviction,
  `clearModelCache()`, or `engine.dispose()`. The rule is written at
  the helper in `src/web.js` and in `src/web.d.ts`. Shadows and rings
  keep their per-model materials and are disposed with the model.
- **Model cache (LEAK-04):** entries carry their collected resource
  set; `config.modelCacheLimit` (default 20, `Infinity`/`0` disables)
  evicts least-recently-used entries but SKIPS any URL with live
  placements (their resources are in use), so the cap can be exceeded
  while everything cached is placed. `setModelTexture` disposes the
  replaced texture unless it is cache-shared or the texture being
  applied (commit c12ab47).
- **engine.dispose() (LEAK-03):** async teardown — ends the session,
  disposes scene contents and the cache, disposes the shared dot
  geometry, `renderer.dispose()` + `forceContextLoss()`, removes the
  canvas, and NULLS renderer/scene/camera/reticle/groups/loader so
  the same instance can `startSession()` again. `ARView.destroy()`
  calls it. Verified by `tests/harness/dispose-cycle.mjs`:
  create → place → destroy → create → place → destroy on ONE engine
  instance, disposal complete and idempotent.
- **Leak proof (owner protocol):** `tests/harness/leak-phase3.mjs` —
  one warm-up cycle per path, then 50 cycles each of place/remove,
  place/switch/remove (with a texture application per cycle) and
  plane add/remove. Headless equivalence: counts are live JS-side
  geometry/material/texture objects not yet disposed — exactly the
  set three.js would hold GPU memory for (materials counted too, so
  stricter than `renderer.info.memory`). Post-warm-up baseline
  {geometries: 3, materials: 4, textures: 2} (two cached models + the
  shared dot geometry) is restored EXACTLY after every path.
  Negative control (`LEAK_NEGATIVE=1`, disposal disabled through the
  ownership mechanism itself): counts balloon to {156, 413, 53} and
  the harness reports the leak — it can catch what it claims to
  prove.
- **PERF-01:** plane dots are ONE `THREE.InstancedMesh` per plane:
  same grid + polygon ray-cast clipping, `count` = actual dots,
  `instanceMatrix.needsUpdate` set, `frustumCulled = false`
  (deliberate: instance bounds are not derived from the base
  geometry; the group is pose-driven per frame). The circle geometry
  is shared engine-wide (one per `dotSize`) and survives plane
  removal per the ownership rule; the per-plane material is disposed
  with the plane. This also removes LEAK-02's root cause.
- **PERF-02:** surface notifications fire on `hasSurface`/`planeType`
  transitions immediately; otherwise at most 10 Hz. Payload objects
  are allocated once and reused (documented: listeners must not
  retain them). Verified by `tests/harness/perf02.mjs` (120 hit
  frames → 20 emissions; payload identity stable; loss/regain
  immediate).
- **PERF-04:** the audit's other cited hot spots were already clean
  on re-read (render-loop pose composition reuses engine fields;
  `setModelRotation`'s temporaries are event-rate). The one real
  per-frame allocation — a `Matrix4` in the pose-only branch of
  plane processing — now uses a module scratch object.
  Code-verified (allocation removal is structural; no behavioural
  surface to assert).
- **PERF-05 — wontfix with evidence:** `tests/harness/perf05.mjs`
  runs the per-pixel loop vs a simulated canvas drawImage composite
  on a KNOWN 64×48 frame (deterministic camera gradient; virtual
  bands: transparent-with-colour, opaque, alpha 128, non-uniform
  alpha incl. 1 and 254). The premultiply round-trip alone changes
  1829 channel values; loop vs drawImage differ on 622 pixels / 783
  channels (max delta 1) — canvas backing-store rounding is not
  byte-identical, so the loop stays. A comment at
  `_composeScreenshot` records the verdict.
- **PERF-06:** `config.debug` (default false) gates all engine
  `console.log` via `debugLog()`; `console.error` on model-load
  failure and the one-time SEC-04 `console.warn` deliberately remain.
  Verified by `tests/harness/perf06.mjs`.
- **BUG-09:** `preserveMaterial` matches materials by NAME first,
  then traversal order, and carries colour + map per material
  (targets cloned on write; ALL preserved maps excluded from the old
  model's disposal). Asserted in `leak-phase3.mjs` (fabric/wood keep
  their own colour and texture across a switch).
- **Consistency sweep (commit db886fd):** README, `docs/`, the
  website content and the example were grepped for every contract
  changed in Phases 1–3. Fixed: unified scale range (gestures guide;
  example slider was [0.25, 3]), `local-floor` optional + fallback
  (README, getting-started, compatibility, architecture, known
  issues, troubleshooting), camera-access tied to
  `enableScreenshots` not light estimation (architecture,
  compatibility), per-coordinate hit testing (webxr-vs-native,
  troubleshooting), switchModel material matching (two guides),
  texture-disposal and plane-count and reticle and hitTest-hang
  troubleshooting entries rewritten, `surfaceDetected` throttling
  (API reference), TypeScript declarations shipping (README), and
  `clearModelCache`/`dispose` added to the API reference. The
  known-issues page now marks every Phase 1–3 item *(fixed in
  1.1.0)*.
- **.d.ts any-audit (commit 36caa44):** `getSession(): any` →
  `XRSession | null`; the facade listener callbacks `(data: any)` →
  `(data: unknown)` (payloads are per-event heterogeneous; `unknown`
  makes no false claim and consumers narrow). No type-position `any`
  remains in `src/*.d.ts`; `check-types` and the strict consumer
  smoke test stay green.
- **Bundle:** example builds clean at 782.62 kB min / 213.29 kB gzip
  vs the Phase 0 baseline 773.55 / 210.74 (+1.17% / +1.21% cumulative;
  Phase 3 adds the disposal/cache/teardown machinery).
- LEAK-05 and LEAK-06 are native (Filament/ARCore) and remain open
  for Phase 5.
