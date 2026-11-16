<p align="center">
  <img src="https://raw.githubusercontent.com/ShahiCrafts/reticlexr/main/docs/assets/banner.svg" width="100%" alt="reticlexr: a high-level AR SDK. Put real products into your customers' rooms. Surfaces, models and gestures, handled.">
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
`reticlexr` is a high-level AR SDK: point the camera at the floor,
and your GLB product models land on real surfaces with a reticle, plane
visualisation, touch gestures and runtime recolouring handled for you.
Models render in a WebXR + Three.js runtime; a native Capacitor plugin
adds ARCore session management, hit testing and surface events on
Android.

📖 **Full documentation: [reticlexr.vercel.app](https://reticlexr.vercel.app)** — this README is only the front door.

## Install

```bash
npm install reticlexr
npx cap sync
```

> The package ships the `capacitor` metadata key, so `npx cap sync`
> discovers the Android plugin automatically — verified in a clean
> scratch Capacitor app. Details:
> [Capacitor setup](https://reticlexr.vercel.app/docs/getting-started#capacitor-setup).

## Quick start

```js
import { createARView } from 'reticlexr';

const ar = createARView({ overlay: document.querySelector('#ar-overlay') });
await ar.create();                                    // start the AR session
await ar.preloadModels(['/models/sofa.glb']);         // cache the GLB
const placed = await ar.placeModel('/models/sofa.glb'); // place at the reticle
if (!placed.success) console.log('Keep scanning:', placed.reason);
```

WebXR AR needs a **secure context** (HTTPS or `localhost`) and an
ARCore-capable Android phone with Chrome. Full walkthrough:
[Getting started](https://reticlexr.vercel.app/docs/getting-started).

## Features

- **Tap-to-place GLB models** with centre reticle and hit testing
- **Plane detection** with dotted surface visualisation and blob shadows
- **Gestures** — drag to move, pinch to scale, twist to rotate
- **Model preloading & switching** with material carry-over
- **Runtime customisation** — recolour models and swap textures live
- **Screenshots** of the AR view from code
- **React hook** (`useARCore`) plus a framework-agnostic API
- **DOM overlays** — your normal buttons and product UI inside AR
- **Native Android bridge** — ARCore session, hit-test and surface events
  (native model rendering is not implemented yet; models render via WebXR)

## Documentation

| | |
| --- | --- |
| 📖 Docs home | [reticlexr.vercel.app](https://reticlexr.vercel.app) |
| 🚀 Getting started | [getting-started](https://reticlexr.vercel.app/docs/getting-started) |
| 🧩 API reference | [docs/api](https://reticlexr.vercel.app/docs/api) |
| ▶️ Live demo | [reticlexr.vercel.app/demo](https://reticlexr.vercel.app/demo) — open it on your phone |
| 🐞 Known issues | [docs/known-issues](https://reticlexr.vercel.app/docs/known-issues) · audit in [AUDIT.md](https://github.com/ShahiCrafts/reticlexr/blob/main/AUDIT.md) |
| 🗺️ Architecture | [docs/concepts/architecture](https://reticlexr.vercel.app/docs/concepts/architecture) · [ARCHITECTURE.md](https://github.com/ShahiCrafts/reticlexr/blob/main/ARCHITECTURE.md) |
| 📋 Changelog | [docs/changelog](https://reticlexr.vercel.app/docs/changelog) · [CHANGELOG.md](https://github.com/ShahiCrafts/reticlexr/blob/main/CHANGELOG.md) |

<!-- TODO (owner): record a short demo GIF of tap-to-place, pinch and rotate on a real phone and add it here. -->

## Compatibility

- **Browser runtime:** Chrome on an ARCore-capable Android phone, over
  HTTPS. Requires the WebXR `hit-test` feature; `local-floor` is
  requested when available, with `local`/`viewer` fallbacks.
- **Native:** Android minSdk 24, ARCore 1.40, Capacitor 8. The library
  manifest marks AR as required, which merges into host apps.
- **React** ≥ 16.8 (peer). Plain ESM JavaScript with JSDoc; hand-written
  TypeScript declarations ship with the package.
- Tested device/browser versions are not recorded yet — the honest matrix
  lives at [docs/compatibility](https://reticlexr.vercel.app/docs/compatibility).

## Contributing

Issues and PRs are welcome — see [CONTRIBUTING.md](https://github.com/ShahiCrafts/reticlexr/blob/main/CONTRIBUTING.md) or
the [contributing guide](https://reticlexr.vercel.app/docs/contributing).
Please ground bug reports in a device model, Android and Chrome version:
the compatibility matrix is built from exactly those reports.

## License

MIT © Saugat Shahi — see [LICENSE](https://github.com/ShahiCrafts/reticlexr/blob/main/LICENSE).
