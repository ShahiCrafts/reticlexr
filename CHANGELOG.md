# Changelog

All notable changes to this project will be documented in this file.

The project follows [Semantic Versioning](https://semver.org/).

## [1.1.0] - Unreleased

_In progress — audit remediation. This entry is being built up during
the remediation programme and will be completed before release._

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
  `getPlacedModels` and `clearModels` methods. Model rendering and
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

### Added

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
  follows the ownership rule. The Android plugin methods land with
  the native remediation phase; the facade methods reject on
  Android until then.
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
