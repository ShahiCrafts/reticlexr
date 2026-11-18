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
your GLB product models land on real surfaces: tap-to-place with a
centre reticle and hit testing, plane visualisation, touch gestures,
runtime recolouring and screenshots, handled for you. Models render in
a WebXR + Three.js runtime; a native Capacitor plugin adds ARCore
session management, hit testing and surface events on Android (models
render via WebXR; native model rendering is not implemented).

📖 **Full documentation: [reticlexr.vercel.app](https://reticlexr.vercel.app)**.
The getting-started walkthrough, guides, the complete API reference,
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
for the walkthrough. WebXR AR needs a secure context (HTTPS or
`localhost`) and an ARCore-capable Android phone with Chrome.

## Documentation

- 📖 **Docs home**: [reticlexr.vercel.app](https://reticlexr.vercel.app)
- 🚀 **Getting started**: [getting-started](https://reticlexr.vercel.app/docs/getting-started)
- 🧩 **API reference**: [docs/api](https://reticlexr.vercel.app/docs/api)
- ▶️ **Live demo**: [reticlexr.vercel.app/demo](https://reticlexr.vercel.app/demo), open it on your phone
- 🐞 **Known issues**: [docs/known-issues](https://reticlexr.vercel.app/docs/known-issues)
- 🗺️ **Architecture**: [docs/concepts/architecture](https://reticlexr.vercel.app/docs/concepts/architecture) · [ARCHITECTURE.md](https://github.com/ShahiCrafts/reticlexr/blob/main/ARCHITECTURE.md)
- 📋 **Changelog**: [docs/changelog](https://reticlexr.vercel.app/docs/changelog) · [CHANGELOG.md](https://github.com/ShahiCrafts/reticlexr/blob/main/CHANGELOG.md)

## Compatibility

Requires Chrome on an ARCore-capable Android phone (WebXR `hit-test`);
the native plugin builds for Android minSdk 24 with Capacitor 8, and
React ≥ 16.8 is a peer dependency. Tested on device (Redmi Note 9S,
Samsung Galaxy A24). The full matrix is at
[docs/compatibility](https://reticlexr.vercel.app/docs/compatibility).

## FAQ

**What is Reticle XR?**
Reticle XR (`reticlexr` on npm) is a high-level augmented reality SDK
for React and Capacitor. It places GLB/GLTF 3D models on real-world
surfaces using WebXR and ARCore: hit testing, plane detection,
XRAnchor world-locking, touch gestures, runtime recolouring and
screenshots, all behind a small API (`createARView`, `placeModel`,
`switchModel`, `takeScreenshot`, …), so product AR takes about ten
lines of code instead of a hand-rolled WebXR engine.

**Which platforms does reticlexr support?**
Android phones with ARCore, through Chrome WebXR inside a Capacitor
app (or plain WebXR in the browser). Rendering is WebXR + Three.js;
a native Capacitor plugin manages the ARCore session on Android.
iOS is not supported, because WebXR is not available in Safari.

**How is reticlexr different from model-viewer?**
model-viewer is a single-model web component whose WebXR mode places
by camera direction without XRAnchors. reticlexr is a programmable
SDK for apps: multiple models, in-place switching, tap-to-place and
drag with surface-anchored placement, recolouring, DOM overlays,
surface events and a React + Capacitor integration.

**Is reticlexr free?**
Yes. MIT licensed, free for commercial and personal use, with no
per-seat pricing.

**What do I need to run the AR?**
An ARCore-capable Android phone, Chrome, and an HTTPS context (or a
Capacitor build). Development on a desktop browser works for
everything except the immersive AR session itself.

## Contributing

Issues and PRs are welcome. See [CONTRIBUTING.md](https://github.com/ShahiCrafts/reticlexr/blob/main/CONTRIBUTING.md) or
the [contributing guide](https://reticlexr.vercel.app/docs/contributing).

## License

MIT © Saugat Shahi. See [LICENSE](https://github.com/ShahiCrafts/reticlexr/blob/main/LICENSE).
