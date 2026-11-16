# Changelog

All notable changes to this project will be documented in this file.

The project follows [Semantic Versioning](https://semver.org/).

## [1.1.0] - Unreleased

_In progress — audit remediation. This entry is being built up during
the remediation programme and will be completed before release._

### Behavior changes

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

### Added

- **`reticlexr/react` subpath (API-02).** React applications can
  import `useARCore` from `reticlexr/react`, the supported React
  entry point.

### Deprecated

- **Importing `useARCore` from the package root.** It keeps working
  throughout 1.x but is deprecated in favour of `reticlexr/react`
  and will be removed in the next major version — while the
  re-export lives in the root entry, that entry cannot drop its
  top-level React import.

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
