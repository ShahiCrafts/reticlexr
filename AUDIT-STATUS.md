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
| LEAK-05 | high | fixed | 65ee322cfce9b8d0ded09685baac925e6d11be4e | code-verified, device TODO |
| LEAK-06 | medium | fixed | 3b31c2c0f6515688d17bb67c0e95835c13ac3947 | code-verified, device TODO |
| LEAK-07 | low | fixed | 40a4126a941775c5d8218d54156c27074f710880 | tested |
| PERF-01 | high | fixed | 430922d9d290e2925e74623209781f5d28241f20 | tested |
| PERF-02 | medium | fixed | c32e836d9e8228fd806da4a438d3f0b031134984 | tested |
| PERF-03 | medium | open | — | — |
| PERF-04 | low | fixed | 3a11a8912f67e32a4bc5047a8e1f55254371d096 | code-verified |
| PERF-05 | low | wontfix | 65a8dd673738ec01903e07c2712de5e877b61dc7 | tested |
| PERF-06 | low | fixed | 24cbb078e083b19ca1d0c56ccf982cae7fd283af | tested |
| NAT-01 | critical | fixed | 71c21ffc83a344352f8c99c17041f5eb7fee83b1 | code-verified, device TODO |
| NAT-02 | critical | fixed | 65ee322cfce9b8d0ded09685baac925e6d11be4e | code-verified, device TODO |
| NAT-03 | high | fixed | 29aadec7283c94f89f57f3f9d3887aa575ec5122 | code-verified, device TODO |
| NAT-04 | high | fixed | 28b4a940da2031ebc129cc1a7fcd95e331d9fb1f | code-verified, device TODO |
| NAT-05 | high | fixed | 71c21ffc83a344352f8c99c17041f5eb7fee83b1 | code-verified, device TODO |
| NAT-06 | high | fixed | 29aadec7283c94f89f57f3f9d3887aa575ec5122 | code-verified, device TODO |
| NAT-07 | high | fixed | 28b4a940da2031ebc129cc1a7fcd95e331d9fb1f | code-verified, device TODO |
| NAT-08 | medium | fixed | 65ee322cfce9b8d0ded09685baac925e6d11be4e | code-verified, device TODO |
| NAT-09 | medium | fixed | 29aadec7283c94f89f57f3f9d3887aa575ec5122 | code-verified, device TODO |
| NAT-10 | medium | fixed | 65ee322cfce9b8d0ded09685baac925e6d11be4e | code-verified, device TODO |
| NAT-11 | low | fixed | 3b31c2c0f6515688d17bb67c0e95835c13ac3947 | code-verified, device TODO |
| NAT-12 | low | fixed | 3b31c2c0f6515688d17bb67c0e95835c13ac3947 | code-verified, device TODO |
| NAT-13 | low | fixed | 28b4a940da2031ebc129cc1a7fcd95e331d9fb1f | code-verified, device TODO |
| API-01 | high | fixed | b1851a701744963e96cd4d758275464f980afe9c | tested |
| API-02 | high | fixed | 8a0b86784f431cf59845d29bfd0ec98491ab1096 | tested |
| API-03 | medium | fixed | e38086976d7fb06ec25246a8f0677e43a21bce24 | tested |
| API-04 | medium | fixed | 4dae82b87b9025b9092a22a919213c9e576e4a2c | tested |
| API-05 | medium | fixed | 0e07e920f89f0332e028f058515dda2d7286c703 | tested |
| API-06 | medium | fixed | 1865dcd5f2176baaba608e353e8cb8c4ad75f368 | tested |
| API-07 | low | fixed | 128b8b92fbcd82af404519606f8f3fb0b0b02003 | code-verified |
| API-08 | low | fixed | 21cd817a2aa68f09db669cebad0baee19c0583d1 | tested |
| COMPAT-01 | medium | fixed | 15d15b47be380299f97f1724bccbf855cd691293 | tested |
| COMPAT-02 | medium | fixed | 1d072ba413e3d547613d3e5bcd855682e1931fab | tested |
| COMPAT-03 | TODO | fixed | 83fe0fc05acdc7fd14d3fb3e8d4ef26ec6599caf | tested (scratch; framework prerender TODO) |
| COMPAT-04 | low | open | — | — |
| COMPAT-05 | low | open | — | — |
| COMPAT-06 | TODO | TODO | — | — |
| SEC-01 | TODO | TODO | — | — |
| SEC-02 | medium | fixed | e4bc492e9bbc575fdf9ac47772d115fcc43160f2 | tested |
| SEC-03 | low | open | — | — |
| SEC-04 | low | fixed | 6d3d0da9af8e897d88382a41905ec08b85e6b845 | tested |
| PKG-01 | high | fixed | ab2cc94b45b074d1514495c656870dc259a68e36 | tested (scratch cap sync; Gradle assemble SDK-TODO) |
| PKG-02 | high | fixed | 1865dcd5f2176baaba608e353e8cb8c4ad75f368 | tested |
| PKG-03 | medium | fixed | bddd4cc2823d3f99e9730883be042f5b9f5bbb90 | tested |
| PKG-04 | medium | fixed | 093f1bf96742d4a95176573e80834fd2a5d7d58f | tested |
| PKG-05 | low | fixed | 713639b8d1ceeadcae532799d740cafd2901418f | code-verified |
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

## Phase 4 notes

- **PKG-01 (commit ab2cc94):** `capacitor: { android: { src: "android" } }`
  added. Scratch verification in a throwaway Capacitor 8.5.2 app
  (`npm create @capacitor/app`-equivalent scaffold in /tmp, package
  installed via `file:` symlink): BEFORE the fix, `npx cap sync android`
  generated a `capacitor.settings.gradle` containing only
  `:capacitor-android` — the plugin was silently skipped. AFTER: sync
  reports "Found 1 Capacitor plugin for android: reticlexr@1.0.0",
  settings include `:reticlexr`, the app module gains
  `implementation project(':reticlexr')`, and `capacitor.plugins.json`
  registers classpath `com.capacitor.arcore.ARCorePlugin`. Remaining
  TODO (needs an Android SDK, absent here): `./gradlew
  :reticlexr:assembleDebug` inside such a scratch app.
- **API-02 (commit 8a0b867):** `src/react.js` + `src/react.d.ts` provide
  the `reticlexr/react` entry. The facade's event bridge is now lazy
  and idempotent: exported `setupEventBridge(plugin, bus)` guarded by a
  `WeakSet`, installed on the first `ARCore.on()`; harness api02 proves
  single delivery after repeated installs and per-plugin independence.
  **Decision flagged for the owner:** the root entry still re-exports
  `useARCore` — removing it in 1.1.0 would be a breaking change with no
  possible alias, so it is kept and marked `@deprecated` (JSDoc +
  index.d.ts) for removal in the next major. Consequence: importing
  the root still pulls React in 1.1.0; `reticlexr/react` is the clean
  entry.
- **PKG-03 (commit bddd4cc):** `"type": "module"` + full exports map
  (`.`, `./react`, `./web`, `./ar-view`, `./gestures`, `./package.json`,
  each `types`/`import`/`default`); `main`/`module` kept for older
  resolvers. Verified against Node's strict resolver in the scratch
  app: every subpath resolves; deep imports outside the map
  (`reticlexr/src/web.js`) are now blocked with
  ERR_PACKAGE_PATH_NOT_EXPORTED — acceptable because the package has
  never been published (no external consumers exist), noted in the
  CHANGELOG. `sideEffects: ["./src/index.js"]` — verified by reading
  the modules: index.js is the only one with an import-time effect
  (`registerPlugin` mutates Capacitor's registry); hooks.js was
  removed from the list by API-04 (its singleton became lazy).
- **PKG-04 (commit 093f1bf):** `three` and `@capacitor/core` moved
  from dependencies to peerDependencies (ranges unchanged) and kept
  as devDependencies; react/react-dom added as devDependencies for
  local hook verification. Justification: a duplicated `three` breaks
  GLTF class identity across app/plugin copies, and `@capacitor/core`
  is a singleton bridge — the host app must own the single copy of
  each. Lockfile regenerated (root entry carries peers + devDeps, no
  `dependencies`).
- **PKG-05 (commit 713639b):** audit-vs-code note — the README's
  `docs/*.md` relative links had already been replaced by docs-site
  URLs in the docs phase; the remaining relative links (banner image,
  LICENSE badge, AUDIT/ARCHITECTURE/CHANGELOG/CONTRIBUTING/LICENSE)
  were converted to absolute GitHub URLs (raw URL for the banner,
  blob/main for files). Zero relative links remain in README.md.
- **API-04 (commit 4dae82b):** the hook's module singleton became a
  lazy `getSharedEngine()`; `useARCore({ engine })` captures the given
  engine at mount (useRef) and closes over it. Existing no-arg callers
  are unchanged. Harness api04 (react-dom/server probes): per-instance
  config isolation, default consumers share exactly one engine.
- **API-01 (commit b1851a7):** `modelId` is canonical across engine,
  ARView, facade, hook and event payloads (value unchanged — the
  engine anchor id). Deprecated aliases, each with a one-time
  `[reticlexr] DEPRECATED:` warning: engine input key `anchorId`,
  engine `placeModel` input key `modelPath`, facade `placeModel`
  option `modelUrl` (accepted; the facade forwards both keys — native
  reads `modelPath`, the engine prefers `modelUrl`, so the facade
  path itself never warns). `anchorId` remains present in results and
  event payloads. Facade place options are a .d.ts union (exactly one
  of modelPath/modelUrl required). Harness api01: 25 assertions
  including the facade flow through the real Capacitor proxy; the
  native-side key translation is code-verified (Phase 5 scope).
- **API-03 (commit e380869):** engine `getPlacedModels()` /
  `clearModels()` (clear goes through the Phase 3 ownership rule —
  harness proves a clone-on-write material is disposed while
  cache-shared geometry is not, and the cache survives). `ARView`
  tracks its own placements in a registry so two views on one engine
  enumerate/clear only their own. Facade + hook expose both. The
  Android plugin has no such methods yet — on Android the facade
  calls reject until Phase 5 adds them (documented in JSDoc, .d.ts,
  CHANGELOG and the API reference).
- **API-05 (commit 0e07e92):** one coded-error convention. `ARError`
  (Error subclass with `.code`) + `codedError()` exported from web.js,
  the package root and `reticlexr/web`; an `ARErrorCode` union type in
  web.d.ts. Every public failure path now carries a code: engine
  throws (SESSION_START_FAILED, MODEL_URL_REQUIRED, NO_SURFACE,
  MODEL_NOT_FOUND, MODEL_LOAD_FAILED), hit-test result objects
  (SESSION_NOT_ACTIVE, SESSION_ENDED, HIT_TEST_TIMEOUT,
  NO_VIEWER_POSE, HIT_TEST_UNAVAILABLE — `error` keeps equalling the
  code, `code` mirrors it), ARView (`code: 'NO_SURFACE'` on the
  placeModel failure result with `reason` kept as a deprecated alias;
  NO_ACTIVE_MODEL; OVERLAY_REQUIRED), hook results, and the facade
  (runtime codes preserved; `*_FAILED` fallbacks; checkSupport gains
  `code`). **All existing error message strings are unchanged.**
  Harness api05: 20 assertions.
- **COMPAT-03 (scratch, no code change needed):** `npm pack` tarball
  installed as a real copy into /tmp/compat03 (files field verified:
  LICENSE/README/android/package.json/src; peers auto-installed).
  A DOM-less Node test imported all five entries with `window`/
  `document` absent before and after, constructed the engine and
  ARView DOM-free, resolved `checkSupport()` DOM-free, and
  server-rendered `useARCore()` (default and `{ engine }`) via
  react-dom/server — 13/13 checks pass. Remaining TODO: a full
  framework prerender (e.g. Next.js) was not run; the known-issues
  page states exactly this.
- **Consistency sweep (commits 83fe0fc + 5fb0638):** website docs updated for
  every Phase 4 change (getting-started peers/types/react-entry,
  api.mdx identifiers + error conventions + new methods + subpaths,
  known-issues fixed markers + roadmap, react-integration and
  colors-and-textures guides), docs/INSTALLATION.md peer wording, and
  ARCHITECTURE.md synced (§1 module map incl. src/react.js, §2
  surfaces, §3.2 session features, §4 React note, §5 package table).
  The sweep also fixed one pre-existing stale row (api.mdx claimed
  hit-test coordinates were ignored — untrue since BUG-03).
  Reviewed and deliberately left: example/src StatusPanel's "Anchor
  ID" label reads the example app's own state field, which no SDK
  payload populates (always rendered 'N/A'); it is app-internal, not
  an SDK surface.
- **Regression:** 23/23 harnesses green (18 prior + api01–api05),
  `npm run check-types` clean, strict consumer smoke (tsc --strict
  against types-smoke.ts) clean, example build passes.
- **Bundle:** example 784.30 kB min / 212.79 kB gzip vs Phase 3's
  782.62 / 213.29 (+0.21% / −0.23% — effectively flat).

## Pre-Phase-5 steps

- **Rename record (commit 9fc128a):** the rename to reticlexr was the
  owner's decision (2026-11-16); `capacitor-arcore` was never
  published to npm (registry 404), so no registry deprecation is
  possible — the name is deprecated in CHANGELOG.md's 1.1.0 "Package
  rename" note instead, and AUDIT.md carries a rename annotation
  under its title (its findings keep the original name; it is a dated
  record). ARCHITECTURE.md's title and its two stale current-state
  references (example dependency, settings.gradle include) now say
  reticlexr. Sweep after the change: `capacitor-arcore` /
  `arcore-react` hits in README.md, docs/, example/, src/, android/
  = 0 (the Java package `com.capacitor.arcore` and `ARCore*` class
  names are Google-tech identifiers, not package-name references,
  and are unchanged).
- **Gradle assemble CI (TEST-02 pulled forward) — BLOCKED.**
  `.github/workflows/ci.yml` was extended locally (triggers: push to
  main, fix/**, docs/** + pull_request; new `gradle-assemble` job:
  setup-node 22, temurin 21, Android SDK, example install + build,
  `npx cap sync android`, `./gradlew :reticlexr:assembleDebug`), but
  the connector push was refused: `failed to create tree: POST
  https://api.github.com/repos/ShahiCrafts/reticlexr/git/trees: 403
  Resource not accessible by integration` — the integration may not
  create/update workflow files. The updated workflow file is kept in
  the working tree, uncommitted; it needs a push through a channel
  with workflow scope (owner's own git push, or a token granted the
  workflow permission). Consequence: **no CI compile signal exists
  for Phase 5**, so every Phase 5 item below is marked
  "code-verified, device TODO" — never "CI-compiled". TEST-02 stays
  open for Phase 6. As a partial static check, the Capacitor APIs
  Phase 5 relies on (`Plugin.handleOnPause/handleOnResume/
  handleOnDestroy` being protected hooks, `PluginCall.reject(String,
  String)`) were verified against the locally installed
  capacitor-android 8.5.2 sources (example/node_modules).

## Phase 5 notes

All Phase 5 verification is **code-verified, device TODO** (see the
CI blockage above). No JS (`src/`) files changed in Phase 5, so the
Phase 4 harness suite (23/23) is unaffected.

- **NAT-06 / NAT-03 / NAT-09 (commit 29aadec):** `checkSupport` now
  resolves the real `ArCoreApk.checkAvailability()` result via
  `ARSessionManager.checkAvailability()` (supported only for
  SUPPORTED_INSTALLED, with an honest reason otherwise; exceptions
  resolve `{supported:false}` — NAT-12 clean failure).
  `createSession` takes the foreground `Activity` from the plugin
  and passes it to `requestInstall` (no more application-Context
  cast); `getActivity() == null` in startSession / setupARRendering /
  stopSession rejects with code `ACTIVITY_UNAVAILABLE` instead of an
  NPE. NAT-09 mechanism: the transient-availability retry is a stored
  `Handler` `Runnable`, capped at 25 attempts (≈5 s), and guarded by
  a **generation counter** — `closeSession()` removes the pending
  callback and increments the generation, and every new
  `createSession()` increments it too; a queued retry whose captured
  generation is stale drops itself, so a session can never be created
  after `stopSession`.
- **NAT-07 / NAT-04 / NAT-13 (commit 28b4a94):** plugin hit tests go
  through a request queue owned by `ARRenderer` and drained by the
  render loop against the frame it just acquired; each call resolves
  on the render thread. `Session.update()` now has exactly one
  caller — the render loop (`acquireLatestFrame` has no other
  callers; verified by search). Check-and-enqueue is under one lock
  with the loop-exit path, and the loop fails all queued requests on
  exit, so no promise can hang. NAT-04: the mapper returns the raw
  `HitResult`; the render loop calls `createAnchor()` on the render
  thread, registers it in `ARAnchorManager`, and `hitTest` returns
  the real `anchorId` (the fictional `anchor_center` is gone).
  NAT-13: the mapper refreshes display metrics from the current
  display at the start of every hit test.
- **NAT-01 / NAT-05 Option B (commit 71c21ff):** native `placeModel`
  and `moveModel` reject with code `NOT_IMPLEMENTED` (they previously
  resolved fictional success), as do the native `getPlacedModels` /
  `clearModels` methods the Phase 4 facade calls. The native scope
  (session + hit-testing only) is documented in docs/API.md and the
  CHANGELOG. Resolved after Phase 5 (owner decision, implemented in
  Phase 6): native `setTransform` / `setMaterial` / `removeModel` —
  which still operated on the ARModelManager metadata registry —
  now reject `NOT_IMPLEMENTED` too; ARModelManager is kept with a
  comment noting Option A would reuse it. Verification for this
  follow-up is "code-verified, device TODO": the CI workflow has
  not yet been pushed by the owner, so no compile verification
  exists yet.
- **NAT-02 / NAT-08 / LEAK-05 / NAT-10 (commit 65ee322):** the plugin
  overrides `handleOnPause` / `handleOnResume` / `handleOnDestroy`
  and forwards to the session manager and renderer. NAT-08: loop stop
  uses a dedicated `stopRequested` flag (reset on start) instead of
  latching `isPaused`, so a second session renders. LEAK-05:
  `ARRenderer.destroy()` stops the loop, **joins the render thread**,
  then destroys in dependency order — camera background (the
  previously caller-less `ARCoreTextureBackground.destroy()`),
  swap chain, view, scene, renderer, camera entity, engine last —
  and `handleOnDestroy` runs it before closing the session. NAT-10:
  the Filament engine is created lazily via
  `ensureFilamentInitialized()` (first surface / session setup);
  `startSession` fails cleanly with code `FILAMENT_UNAVAILABLE`
  instead of deferring a null-engine crash.
- **LEAK-06 / NAT-11 / NAT-12 (commit 3b31c2c):** `updatePlanes`
  prunes planes whose tracking state is STOPPED or that were
  subsumed. `WebViewState.capture` reads the WebView's real
  background (ColorDrawable colour, or the drawable itself by
  reference) and restore puts it back. The library manifest now
  declares `android.hardware.camera.ar` `required="false"` and
  `com.google.ar.core` = `optional`; the AR-required opt-in for host
  apps is documented in docs/INSTALLATION.md. (Noticed, out of
  scope: the manifest still declares `android.hardware.camera`
  `required="true"` — NAT-12 named only the AR feature.)
- **Website follow-ups for Phase 7** (docs-site work is kept off
  this branch): the website's known-issues and API-reference pages
  need the Phase 5 fixed markers and the native
  NOT_IMPLEMENTED / session + hit-test scope wording that root docs
  (docs/API.md, CHANGELOG) already carry.
