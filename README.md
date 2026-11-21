<p align="center">
  <img src="docs/assets/banner-light.svg#gh-light-mode-only" width="100%" alt="reticlexr: AR SDK for React & Capacitor">
  <img src="docs/assets/banner-dark.svg#gh-dark-mode-only" width="100%" alt="reticlexr: AR SDK for React & Capacitor">
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/reticlexr"><img src="https://img.shields.io/npm/v/reticlexr?color=cb3837&logo=npm" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/reticlexr"><img src="https://img.shields.io/npm/dm/reticlexr" alt="npm downloads"></a>
  <a href="https://github.com/ShahiCrafts/reticlexr/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-green" alt="license: MIT"></a>
  <img src="https://img.shields.io/badge/platform-WebXR%20%7C%20Android%20%7C%20iOS-blue" alt="platforms: WebXR and Android">
  <img src="https://img.shields.io/badge/React-Capacitor-61dafb?logo=react&logoColor=white" alt="React and Capacitor">
  <a href="https://reticlexr.vercel.app"><img src="https://img.shields.io/badge/docs-reticlexr.vercel.app-5740d8" alt="documentation site"></a>
</p>

**Place 3D products in the real world with React and Capacitor.**

ReticleXR is a high-level augmented reality SDK that makes product visualization on real surfaces straightforward. Load a GLB model, point your camera at a surface, and let users place, interact with, and customize 3D products in their environment.

Built on WebXR and Three.js, with native integration through Capacitor: ARCore session/hit-testing on Android, and full ARKit + RealityKit rendering on iOS.

**[Documentation](https://reticlexr.vercel.app/) · [Live Demo](https://reticlexr.vercel.app/demo) · [API Reference](https://reticlexr.vercel.app/docs/api)**

---

## Installation

Install the package, then synchronize your Capacitor project:

```bash
npm install reticlexr
npx cap sync
```

The package includes Capacitor plugin metadata, allowing the Android and iOS plugins to be discovered automatically during synchronization.

**iOS:** after `npx cap sync`, add the camera usage string to your iOS app's `Info.plist` — AR cannot start without it:

```xml
<key>NSCameraUsageDescription</key>
<string>Used to place products in your space with augmented reality.</string>
```

Then open the app in Xcode (`npx cap open ios`) and run it on a real iPhone/iPad — the iOS Simulator has no ARKit world tracking. iOS models are **USDZ**: pass `usdzPath`/`usdzUrl` to `placeModel`, or ship a `.usdz` sibling next to each GLB (same folder, same name) and iOS will use it automatically.

For complete setup instructions, see the [Getting Started Guide](https://reticlexr.vercel.app/docs/getting-started).

## Requirements

- **React**: ≥ 16.8
- **Capacitor**: 8
- **Android minSdk**: 24
- **iOS**: 15+ (Xcode-built Capacitor app; real ARKit-capable device required)
- **Browser**: Chrome (WebXR path)
- **AR Runtime**: WebXR with `hit-test` (Android/web) · ARKit + RealityKit (iOS)
- **Device**: ARCore-compatible Android device, or ARKit-capable iPhone/iPad
- **Models**: GLB for WebXR/Android · USDZ for iOS
- **Deployment**: HTTPS or localhost

**Tested devices:** Redmi Note 9S and Samsung Galaxy A24.

For detailed platform support and limitations, see the [Compatibility Guide](https://reticlexr.vercel.app/docs/compatibility).

## Architecture

ReticleXR uses a hybrid architecture combining browser-based 3D rendering with native Android AR capabilities.

- **WebXR + Three.js:** Handles the AR rendering pipeline, GLB models, and 3D interactions on Android/web.
- **Native Capacitor Plugin (Android):** Manages ARCore sessions, hit testing, and surface events; model rendering stays with WebXR.
- **Native Capacitor Plugin (iOS):** ARKit sessions, plane detection and hit testing plus real RealityKit model placement (USDZ), with the same JS API and events.

On iOS, 3D models are rendered natively through RealityKit. On Android, native model rendering is not currently implemented.

Learn more in the [Architecture Guide](https://reticlexr.vercel.app/docs/concepts/architecture).

## Live Demo

Experience ReticleXR directly on a supported Android device.

**[Open the ReticleXR Demo](https://reticlexr.vercel.app/demo)**

For the best experience, open the demo in Chrome on an ARCore-compatible Android device. (The web demo is WebXR; iOS support is for Capacitor apps, not Safari.)

## Contributing

Contributions, bug reports, and feature requests are welcome.

- [Report an Issue](https://github.com/ShahiCrafts/reticlexr/issues)
- [Contributing Guidelines](https://github.com/ShahiCrafts/reticlexr/blob/main/CONTRIBUTING.md)

Please review the contributing guidelines before submitting a pull request.

## License

ReticleXR is open-source software licensed under the [MIT License](https://github.com/ShahiCrafts/reticlexr/blob/main/LICENSE).

Copyright © Saugat Shahi.
