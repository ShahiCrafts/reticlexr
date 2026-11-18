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

**Place 3D products in the real world with React and Capacitor.**

ReticleXR is a high-level augmented reality SDK that makes product visualization on real surfaces straightforward. Load a GLB model, point your camera at a surface, and let users place, interact with, and customize 3D products in their environment.

Built on WebXR and Three.js, with native Android ARCore integration through Capacitor.

**[Documentation](https://reticlexr.vercel.app/) · [Live Demo](https://reticlexr.vercel.app/demo) · [API Reference](https://reticlexr.vercel.app/docs/api)**

---

## Features

- **Surface Detection**: Detect real-world surfaces using WebXR hit testing.
- **Tap-to-Place**: Position 3D models using a centre reticle.
- **Plane Visualization**: Visualize detected surfaces before placing objects.
- **Touch Interactions**: Rotate, scale, and move placed models using gestures.
- **Runtime Customization**: Recolour and customize 3D models without reloading them.
- **Screenshots**: Capture AR scenes directly from the experience.
- **React Integration**: A high-level API designed for React applications.
- **Native Android Integration**: Capacitor plugin for ARCore session management, hit testing, and surface events.

## Installation

Install the package:

```bash
npm install reticlexr
```

Synchronize your Capacitor project:

```bash
npx cap sync
```

The package includes Capacitor plugin metadata, allowing the Android plugin to be discovered automatically during synchronization.

For complete setup instructions, see the [Getting Started Guide](https://reticlexr.vercel.app/docs/getting-started).

## Requirements

- **React**: ≥ 16.8
- **Capacitor**: 8
- **Android minSdk**: 24
- **Browser**: Chrome
- **AR Runtime**: WebXR with `hit-test`
- **Device**: ARCore-compatible Android device
- **Deployment**: HTTPS or localhost

**Tested devices:** Redmi Note 9S and Samsung Galaxy A24.

For detailed platform support and limitations, see the [Compatibility Guide](https://reticlexr.vercel.app/docs/compatibility).

## Architecture

ReticleXR uses a hybrid architecture combining browser-based 3D rendering with native Android AR capabilities.

- **WebXR + Three.js:** Handles the AR rendering pipeline, GLB models, and 3D interactions.
- **Native Capacitor Plugin:** Manages Android ARCore sessions, hit testing, and surface events.

3D models are rendered through the WebXR runtime. Native model rendering is not currently implemented.

Learn more in the [Architecture Guide](https://reticlexr.vercel.app/docs/concepts/architecture).

## Live Demo

Experience ReticleXR directly on a supported Android device.

**[Open the ReticleXR Demo](https://reticlexr.vercel.app/demo)**

For the best experience, open the demo in Chrome on an ARCore-compatible Android device.

## Contributing

Contributions, bug reports, and feature requests are welcome.

- [Report an Issue](https://github.com/ShahiCrafts/reticlexr/issues)
- [Contributing Guidelines](https://github.com/ShahiCrafts/reticlexr/blob/main/CONTRIBUTING.md)

Please review the contributing guidelines before submitting a pull request.

## License

ReticleXR is open-source software licensed under the [MIT License](https://github.com/ShahiCrafts/reticlexr/blob/main/LICENSE).

Copyright © Saugat Shahi.
