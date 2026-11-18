<p align="center">
  <img src="docs/assets/banner-light.svg#gh-light-mode-only" width="100%" alt="reticlexr: AR SDK for React & Capacitor">
  <img src="docs/assets/banner-dark.svg#gh-dark-mode-only" width="100%" alt="reticlexr: AR SDK for React & Capacitor">
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/reticlexr"><img src="https://img.shields.io/npm/v/reticlexr?color=cb3837&logo=npm" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/reticlexr"><img src="https://img.shields.io/npm/dm/reticlexr" alt="npm downloads"></a>
  <a href="https://github.com/ShahiCrafts/reticlexr/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-green" alt="license: MIT"></a>
  <img src="https://img.shields.io/badge/platform-WebXR%20%7C%20Android-blue" alt="platforms: WebXR and Android">
  <img src="https://img.shields.io/badge/React-Capacitor-61dafb?logo=react&logoColor=white" alt="React and Capacitor">
  <a href="https://reticlexr.vercel.app"><img src="https://img.shields.io/badge/docs-reticlexr.vercel.app-5740d8" alt="documentation site"></a>
</p>

**Product AR for React + Capacitor in about ten lines of code.**
`reticlexr` is a high-level AR SDK: point the camera at the floor, and
your GLB product models land on real surfaces — tap-to-place with a
centre reticle and hit testing, plane visualisation, touch gestures,
runtime recolouring and screenshots, handled for you. Models render in
a WebXR + Three.js runtime; a native Capacitor plugin adds ARCore
session management, hit testing and surface events on Android (models
render via WebXR — native model rendering is not implemented).

📖 **Full documentation: [reticlexr.vercel.app](https://reticlexr.vercel.app)** —
the getting-started walkthrough, guides, the complete API reference,
compatibility and known issues live there. This README is only the
front door.

## Install

```bash
npm install reticlexr
npx cap sync
```

The package ships the `capacitor` metadata key, so `npx cap sync`
discovers the Android plugin automatically. Then follow
[Getting started](https://reticlexr.vercel.app/docs/getting-started)
for the walkthrough — WebXR AR needs a secure context (HTTPS or
`localhost`) and an ARCore-capable Android phone with Chrome.

## Documentation

| | |
| --- | --- |
| 📖 Docs home | [reticlexr.vercel.app](https://reticlexr.vercel.app) |
| 🚀 Getting started | [getting-started](https://reticlexr.vercel.app/docs/getting-started) |
| 🧩 API reference | [docs/api](https://reticlexr.vercel.app/docs/api) |
| ▶️ Live demo | [reticlexr.vercel.app/demo](https://reticlexr.vercel.app/demo) — open it on your phone |
| 🐞 Known issues | [docs/known-issues](https://reticlexr.vercel.app/docs/known-issues) |
| 🗺️ Architecture | [docs/concepts/architecture](https://reticlexr.vercel.app/docs/concepts/architecture) · [ARCHITECTURE.md](https://github.com/ShahiCrafts/reticlexr/blob/main/ARCHITECTURE.md) |
| 📋 Changelog | [docs/changelog](https://reticlexr.vercel.app/docs/changelog) · [CHANGELOG.md](https://github.com/ShahiCrafts/reticlexr/blob/main/CHANGELOG.md) |

## Compatibility

Requires Chrome on an ARCore-capable Android phone (WebXR `hit-test`);
the native plugin builds for Android minSdk 24 with Capacitor 8, and
React ≥ 16.8 is a peer dependency. No device/browser combination has
been recorded as tested yet — the honest, unverified matrix is at
[docs/compatibility](https://reticlexr.vercel.app/docs/compatibility).

## Contributing

Issues and PRs are welcome — see [CONTRIBUTING.md](https://github.com/ShahiCrafts/reticlexr/blob/main/CONTRIBUTING.md) or
the [contributing guide](https://reticlexr.vercel.app/docs/contributing).

## License

MIT © Saugat Shahi — see [LICENSE](https://github.com/ShahiCrafts/reticlexr/blob/main/LICENSE).
