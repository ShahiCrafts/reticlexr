<p align="center">
  <img src="docs/assets/banner.svg" width="100%" alt="arcore-react: a high-level AR SDK. Put real products into your customers' rooms. Surfaces, models and gestures, handled.">
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/capacitor-arcore"><img src="https://img.shields.io/npm/v/capacitor-arcore?color=cb3837&logo=npm" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/capacitor-arcore"><img src="https://img.shields.io/npm/dm/capacitor-arcore" alt="npm downloads"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green" alt="license: MIT"></a>
  <img src="https://img.shields.io/badge/platform-WebXR%20%7C%20Android-blue" alt="platforms: WebXR and Android">
  <img src="https://img.shields.io/badge/React-Capacitor-61dafb?logo=react&logoColor=white" alt="React and Capacitor">
  <a href="https://arcore-react.vercel.app"><img src="https://img.shields.io/badge/docs-arcore--react.vercel.app-5740d8" alt="documentation site"></a>
</p>

**Product AR for React + Capacitor in about ten lines of code.**
`capacitor-arcore` is a high-level AR SDK: point the camera at the floor,
and your GLB product models land on real surfaces with a reticle, plane
visualisation, touch gestures and runtime recolouring handled for you.
Models render in a WebXR + Three.js runtime; a native Capacitor plugin
adds ARCore session management, hit testing and surface events on
Android.

📖 **Full documentation: [arcore-react.vercel.app](https://arcore-react.vercel.app)** — this README is only the front door.

## Install

```bash
npm install capacitor-arcore
npx cap sync
```

> ⚠️ v1.0.0's `package.json` has no `capacitor` metadata key, so
> `cap sync` discovery is unverified in a clean app. If the plugin is not
> picked up, include it by hand — see
> [Capacitor setup](https://arcore-react.vercel.app/docs/getting-started#capacitor-setup).

## Quick start

```js
import { createARView } from 'capacitor-arcore';

const ar = createARView({ overlay: document.querySelector('#ar-overlay') });
await ar.create();                                    // start the AR session
await ar.preloadModels(['/models/sofa.glb']);         // cache the GLB
const placed = await ar.placeModel('/models/sofa.glb'); // place at the reticle
if (!placed.success) console.log('Keep scanning:', placed.reason);
```

WebXR AR needs a **secure context** (HTTPS or `localhost`) and an
ARCore-capable Android phone with Chrome. Full walkthrough:
[Getting started](https://arcore-react.vercel.app/docs/getting-started).

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
| 📖 Docs home | [arcore-react.vercel.app](https://arcore-react.vercel.app) |
| 🚀 Getting started | [getting-started](https://arcore-react.vercel.app/docs/getting-started) |
| 🧩 API reference | [docs/api](https://arcore-react.vercel.app/docs/api) |
| ▶️ Live demo | [arcore-react.vercel.app/demo](https://arcore-react.vercel.app/demo) — open it on your phone |
| 🐞 Known issues | [docs/known-issues](https://arcore-react.vercel.app/docs/known-issues) · audit in [AUDIT.md](AUDIT.md) |
| 🗺️ Architecture | [docs/concepts/architecture](https://arcore-react.vercel.app/docs/concepts/architecture) · [ARCHITECTURE.md](ARCHITECTURE.md) |
| 📋 Changelog | [docs/changelog](https://arcore-react.vercel.app/docs/changelog) · [CHANGELOG.md](CHANGELOG.md) |

<!-- TODO (owner): record a short demo GIF of tap-to-place, pinch and rotate on a real phone and add it here. -->

## Compatibility

- **Browser runtime:** Chrome on an ARCore-capable Android phone, over
  HTTPS. Requires the WebXR `hit-test` and `local-floor` features.
- **Native:** Android minSdk 24, ARCore 1.40, Capacitor 8. The library
  manifest marks AR as required, which merges into host apps.
- **React** ≥ 16.8 (peer). Plain ESM JavaScript with JSDoc — no TypeScript
  declarations ship yet.
- Tested device/browser versions are not recorded yet — the honest matrix
  lives at [docs/compatibility](https://arcore-react.vercel.app/docs/compatibility).

## Contributing

Issues and PRs are welcome — see [CONTRIBUTING.md](CONTRIBUTING.md) or
the [contributing guide](https://arcore-react.vercel.app/docs/contributing).
Please ground bug reports in a device model, Android and Chrome version:
the compatibility matrix is built from exactly those reports.

## License

MIT © Saugat Shahi — see [LICENSE](LICENSE).
