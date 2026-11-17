# Changelog

All notable changes to this project will be documented in this file.

The project follows [Semantic Versioning](https://semver.org/).

## [1.1.0] - Unreleased

### Package rename

- **The package was renamed from `capacitor-arcore` to `reticlexr`**
  on 2026-11-16, before its first publish. `capacitor-arcore` was
  never published to npm and is deprecated as a name — `reticlexr`
  is the only package name. Install with `npm install reticlexr`.
  The GitHub repository moved from `ShahiCrafts/arcore-react` to
  `ShahiCrafts/reticlexr` (the old URL redirects). Native identifiers
  are unchanged: the Java package `com.capacitor.arcore`, the
  `ARCore*` class names and the Capacitor plugin name `ARCore` name
  Google's ARCore technology, not this package.

### Behavior changes

- **Native Android is explicitly scoped to session + hit-testing
  (NAT-01/NAT-05, Option B).** The native plugin never rendered placed
  models — `placeModel` registered metadata and resolved success, and
  `moveModel` resolved `{success: true}` without moving anything. Both
  now reject with a coded `NOT_IMPLEMENTED` error, as do the native
  `getPlacedModels` and `clearModels` methods — and, by a later owner
  decision, `setTransform`, `setMaterial` and `removeModel`, which
  previously updated a metadata registry that no placement could ever
  enter (the registry class is kept for a future native-rendering
  option). Model rendering and
  placement are provided by the WebXR runtime. Native `hitTest` now
  creates a real ARCore anchor for a successful hit and returns its
  `anchorId`.
- **Native lifecycle is wired (NAT-02/NAT-08, LEAK-05, NAT-10).**
  Activity pause/resume now pause/resume the ARCore session and the
  render loop (previously the camera kept running while the app was
  backgrounded); the render loop restarts reliably for a second
  session; plugin destroy stops and joins the render thread and
  destroys all Filament resources in dependency order; the Filament
  engine is created lazily on first use instead of at plugin load.
- **The Android library manifest no longer forces AR-required onto
  host apps (NAT-12).** `android.hardware.camera.ar` is now
  `required="false"` and the `com.google.ar.core` meta-data is
  `optional`; on devices without ARCore, `checkSupport()` reports
  unsupported and session entry points fail with coded errors. Hosts
  that want AR-required can opt in from their own manifest (see
  docs/INSTALLATION.md).
- **The camera feature is no longer required either (NAT-12
  extension).** `android.hardware.camera` is now `required="false"`
  in the library manifest (it was `required="true"`); the `CAMERA`
  permission is unchanged and is still requested at runtime. Hosts
  that want the camera feature required can opt in with
  `tools:replace` (see docs/INSTALLATION.md). Verified with the
  Android manifest merger against a scratch Capacitor app: the
  merged manifest carries both hardware features as
  `required="false"`, and the documented opt-in flips them to
  `required="true"`.
- **Screenshots now require an explicit opt-in (SEC-04).**
  `lightEstimation: true` no longer also requests the WebXR
  `camera-access` feature. To use `takeScreenshot()`, start the
  session with `enableScreenshots: true` (`ARView.create()` or the
  engine's `startSession()`). Without it, `takeScreenshot()` returns
  `{ success: false, code: 'CAMERA_CAPTURE_UNAVAILABLE' }`. The engine
  logs a one-time console warning explaining the opt-in the first time
  a screenshot fails for this reason.
- **The native event bridge installs lazily (API-02).** Importing
  the package no longer registers twelve native listeners as a side
  effect; the bridge installs on the first `ARCore.on()`
  subscription and is idempotent. No behaviour change for listeners.
- **The package declares ESM and an exports map (PKG-03).**
  `"type": "module"` plus an `exports` map covering `.`,
  `./react`, `./web`, `./ar-view`, `./gestures` and `./package.json`.
  Deep imports outside the map (e.g. `reticlexr/src/web.js`) no
  longer resolve under Node/bundler exports rules — use the
  subpaths. `sideEffects` is declared accurately: only the root
  entry (Capacitor plugin registration) has an import-time effect;
  the hook's shared engine is constructed lazily (API-04).
- **`three` and `@capacitor/core` are peer dependencies (PKG-04).**
  They moved out of `dependencies` (and remain `devDependencies`
  for local development and tests). Host apps now provide the one
  shared copy: a duplicate `three` breaks class identity across
  the GLTF pipeline, and `@capacitor/core` is a singleton bridge by
  design. Required ranges: `@capacitor/core ^8.5.2`,
  `three ^0.180.0`; `react >=16.8.0` is unchanged.
- **One model identifier everywhere (API-01).** `modelId` is now
  the canonical id across the engine, `ARView`, the facade and the
  hook (previously the engine/hook spoke `anchorId` while the
  facade spoke `modelId`, with different `placeModel` shapes per
  layer). `anchorId` remains as a deprecated alias — see
  Deprecations.
- **One coded-error convention (API-05).** Public failures now
  carry stable machine-readable codes (rejecting with `ARError`,
  or resolving result objects with a `code` field) instead of the
  four per-layer conventions 1.0.0 shipped. Error messages are
  unchanged — see Added.

### Added

- **Drag-to-move.** With a model placed, dragging one finger moves
  it across surfaces: the gesture controller's `onDrag` is now bound
  in `enableCustomization`, and engine moves are coalesced through a
  one-slot queue (only the latest point is ever in flight), so a
  fast drag cannot flood the runtime with hit tests. A pass over a
  surface-less spot is silent and the model keeps its last good
  position. `CustomizationOptions` gains an `onDrag` notification
  callback. Regression harness: `drag01`.
- **`framebufferScale` session option (engine + `ARView.create`).**
  Scales the XR render target; fragment work scales with its
  square, so 0.85 renders ~28% fewer fragments — the largest single
  smoothness/battery lever on mid-range phones. Default 1 (no
  change); the live demo runs at 0.85. The camera feed is
  unaffected.

- **GLB animation playback.** Models whose files carry animation
  clips (skeletal or node animation, e.g. Sketchfab exports) now
  play them on loop in the WebXR runtime: each placement gets an
  `AnimationMixer` over its own skeleton-correct clone, stepped
  from the XR frame loop. Static models are unaffected.
- **`reticlexr/react` subpath (API-02).** React applications can
  import `useARCore` from `reticlexr/react`, the supported React
  entry point.
- **Per-instance hook engine (API-04).** `useARCore({ engine })`
  drives the given `ARCoreWeb` instance (fixed at mount), so
  multiple independent AR views can coexist. With no argument the
  hook keeps its historical behaviour — one shared engine for the
  app — except that the shared engine is now constructed lazily on
  first use instead of at module import.
- **Enumerate and clear placed models (API-03).**
  `getPlacedModels()` and `clearModels()` now exist on the engine,
  `ARView`, the `ARCore` facade and the `useARCore` hook. `ARView`
  tracks every model placed through it (previously only the active
  model was reachable and repeat placements became orphans).
  Clearing routes each removal through `removeModel`, so disposal
  follows the ownership rule. On Android the native
  `getPlacedModels`/`clearModels` methods exist and reject with
  `NOT_IMPLEMENTED` (Option B: native places no models), and the
  facade surfaces that code.
- **One coded-error convention (API-05).** Every public failure
  now carries a stable, machine-readable `code`. Async methods
  reject with `ARError` (an `Error` subclass, exported from the
  package root and `reticlexr/web`); result-object APIs
  (`hitTest`, `takeScreenshot`, `ARView.placeModel`) resolve with
  the same `code` beside the human-readable `error`/`reason`.
  Codes include `MODEL_NOT_FOUND`, `MODEL_URL_REQUIRED`,
  `MODEL_LOAD_FAILED`, `NO_SURFACE`, `SESSION_NOT_ACTIVE`,
  `SESSION_START_FAILED` and the pre-existing
  `CAMERA_CAPTURE_UNAVAILABLE` / `INSECURE_CONTEXT`. Error
  *messages* are unchanged, and the facade preserves runtime codes
  (falling back to a per-method `*_FAILED` code). The hook's
  failure results (`{ error }`) now also carry `code`.

### Fixed

- **WebXR engine correctness (BUG-01…BUG-12).** Hook/engine
  transform shapes are normalised at the engine boundary (objects
  no longer produce `NaN` transforms); hook plane counts read the
  engine's numeric counts; `hitTest({x, y})` with non-centre
  coordinates performs a real ray-based hit test; the reticle
  visibility setting is honoured instead of being forced back on;
  tap-to-place errors reach the `onError` handler instead of
  throwing; repeated `startSession` no longer duplicates listeners;
  a failed session start no longer leaks the live XR session; the
  fallback hit test always settles; `switchModel` material
  carry-over matches materials by name, then order, instead of
  flattening multi-material models; `pointercancel` no longer
  counts as a tap; `ARView` transform state commits only after the
  engine accepts a change; explicit-position placement no longer
  inherits the previous hit's rotation.
- **Memory and rendering cost (LEAK-01…04, LEAK-07, PERF-01/02/04/06).**
  Removed and switched models are disposed under a documented
  ownership rule (per-instance clones on remove/switch; shared
  geometry/textures only on cache eviction, `clearModelCache()` or
  `engine.dispose()`); the model cache is LRU-capped
  (`config.modelCacheLimit`, default 20); plane dots render as one
  `InstancedMesh` per plane instead of one mesh per dot; surface
  notifications fire on change at ≤10 Hz; plane pose updates reuse
  a scratch `Matrix4`; engine logging is gated behind
  `config.debug`. (PERF-05 was investigated and deliberately kept:
  the per-pixel screenshot loop is not byte-identical to a
  `drawImage` composite — 622 px / 783 channels differ on the
  reference frame.)
  `engine.dispose()` performs a full teardown and `ARView.destroy()`
  calls it.
- **Native Android correctness (NAT-03/04/06/07/09/11/13, LEAK-06).**
  `checkSupport` returns the real `ArCoreApk.checkAvailability()`
  result (it was hardcoded `true`); session creation receives the
  foreground Activity (a null activity fails with
  `ACTIVITY_UNAVAILABLE` instead of an NPE); hit tests are served
  by the render loop — the sole `Session.update()` caller — and a
  successful hit creates a real ARCore anchor whose id is returned
  (the fictional `anchor_center` is gone); the availability retry
  is bounded (25 attempts ≈ 5 s, then
  `ARCORE_AVAILABILITY_TIMEOUT`) and can never create a session
  after `stopSession`; stopped/subsumed planes are pruned from the
  registry; WebView state capture stores the real background;
  hit-test pixel mapping uses per-call display metrics.
- **Compatibility (COMPAT-01/02/05).** Session creation falls back
  `local-floor` → `local` → `viewer` instead of hard-requiring
  `local-floor`; `checkSupport` reports a distinct
  `INSECURE_CONTEXT` code outside secure contexts; the example
  wires its `BrowserUnsupported` component as the
  `supported === false` fallback.
- **Example bundle (PERF-03).** The example lazy-loads the SDK
  (a `navigator.xr` probe at mount, `import('reticlexr')` on
  Start, `three` split into its own chunk): the initial JS dropped
  from 784.25 kB min / 213.66 kB gzip to a 160.51 / 52.54 kB entry
  chunk.
- **Supply chain and tests (SEC-02, TEST-01/02/03).** Lockfiles
  are committed for the root and the example and CI installs with
  `npm ci`; the stub harnesses are now a Vitest suite (24 files,
  25 tests, 280 assertions) run by `npm test`; the vestigial
  `example/tsconfig.json` is removed; a CI workflow (type-check,
  tests, example build, Gradle `:reticlexr:assembleDebug`) is in
  the repo.
- **Placed models can be moved (device report, 2026-11-17).** The
  gesture layer only ever placed: with a model active, a tap did
  nothing, so a placed model could never be relocated. `ARView`
  gains `moveModel({ x, y })` (normalised screen point; a miss
  resolves `{ success: false, code: 'NO_SURFACE' }` and the model
  stays put), and the tap gesture now moves the active model to the
  tapped surface point, reporting a miss through `onError` exactly
  like a failed placement. Regression harness: `move01`.
- **Demo: model switches no longer transplant textures (device
  report, 2026-11-17).** The live demo switched models with the
  default `preserveMaterial`, which by design carries the outgoing
  model's colour and texture map onto the incoming one — the rhino's
  hide landed on the duck and the astronaut. The demo's models are
  unrelated products, not variants, so the demo now switches with
  `{ preserveMaterial: false }` and resets its colour swatch; each
  model shows its own authored look. The engine contract for both
  modes is pinned by the `switchtex01` harness.
- **Rendering economy (performance pass, 2026-11-17).** The plane
  dot grid is capped at 2,048 instances per plane (stride-sampled
  past the cap, so coverage stays even); animation mixers no longer
  step for hidden models; skinned meshes in placement clones opt
  out of frustum culling (their bind-space bounds go stale as bones
  move, which both cost per-frame bounds work and could cull a
  model at some angles).

- Drag tracking rebuilt (device report, 2026-11-17): the first
  drag ran one promise-based hit test per pointer move, serialised
  behind a queue, so the model trailed the finger and landed where
  it had been. The engine now tracks the drag inside its render
  loop (`beginDragMove` / `updateDragPoint` / `endDragMove`), and
  one final move lands the model exactly on the release point.
- Placement is by base centre: models whose files carry their
  geometry offset from the origin (the demo astronaut sits about
  0.92 m from its origin and 0.28 m below it) now land on the
  tapped point and stand on the surface, instead of appearing
  displaced and sunk.

### Deprecated

- **Importing `useARCore` from the package root.** It keeps working
  throughout 1.x but is deprecated in favour of `reticlexr/react`
  and will be removed in the next major version — while the
  re-export lives in the root entry, that entry cannot drop its
  top-level React import.
- **`anchorId` in favour of `modelId` (API-01).** There is now ONE
  model identifier across all layers and runtimes: `modelId`. The
  WebXR engine, `ARView` and the hook return and accept it
  everywhere; its value is unchanged (it is the engine's anchor
  id). `anchorId` keeps working as a deprecated alias on inputs,
  results and event payloads until the next major version, and
  using it as an input logs a one-time deprecation warning. The
  facade's `placeModel` also accepts the engine's `modelUrl` name
  alongside the native `modelPath` (the facade forwards both), so
  one call shape works on Android and web. The engine's `modelPath`
  option is likewise a deprecated alias for `modelUrl`.

## [1.0.0] - 2026-09-25

### Added
- High-level `createARView()` abstraction.
- WebXR and Android ARCore integration layers.
- Surface detection, dotted plane feedback, and placement reticle.
- Tap-to-place, pinch-to-scale, and two-finger rotation gestures.
- GLB/GLTF loading, model preloading, and in-place model switching.
- Runtime material, color, and texture customization.
- AR screenshot API and React DOM overlay support.
- React/Vite example application with LAN HTTPS development tooling.

> **Correction (1.1.0):** the 1.0.0 line "WebXR and Android ARCore
> integration layers" overstated the native runtime. As shipped,
> the native Android plugin provided session management, hit
> testing and events only — it never rendered a placed model, and
> several methods reported success without doing the work. 1.1.0
> scopes native explicitly (Option B, see Behavior changes above);
> model rendering is and was a WebXR-runtime feature.
