<p align="center">
  <img src="docs/assets/banner.svg" width="100%" alt="arcore-react: a high-level AR SDK. Put real products into your customers' rooms. Surfaces, models and gestures, handled.">
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/capacitor-arcore"><img src="https://img.shields.io/npm/v/capacitor-arcore?color=cb3837&logo=npm" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/capacitor-arcore"><img src="https://img.shields.io/npm/dm/capacitor-arcore" alt="npm downloads"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green" alt="license: MIT"></a>
  <img src="https://img.shields.io/badge/platform-WebXR%20%7C%20Android-blue" alt="platforms: WebXR and Android">
  <img src="https://img.shields.io/badge/React-Capacitor-61dafb?logo=react&logoColor=white" alt="React and Capacitor">
</p>

<p align="center">
  <b>Product AR for React + Capacitor in about ten lines of code.</b><br>
  Surface detection, model placement and touch gestures, handled.
</p>

<p align="center">
  <a href="#quick-start">Quick start</a> ·
  <a href="#use-it-in-react">React usage</a> ·
  <a href="#api-at-a-glance">API</a> ·
  <a href="#how-it-works">How it works</a> ·
  <a href="#troubleshooting">Troubleshooting</a> ·
  <a href="#contributing">Contributing</a>
</p>

<!-- TODO: add a short demo GIF or video of tap-to-place, pinch and rotate.
<p align="center"><img src="docs/assets/demo.gif" width="320" alt="Placing a sofa in a room with arcore-react"></p>
-->

---

## Why arcore-react

Showing a product in a customer's room should not mean every app team has to build WebXR sessions, Three.js scenes, GLTF loading, hit testing, plane visualization and multi-touch gesture math from scratch.

**arcore-react** (npm: `capacitor-arcore`) absorbs that work behind a small API, so your app can focus on products and UI.

| You want to... | Without the SDK | With arcore-react |
|---|---|---|
| Start an AR session | Manage WebXR sessions and the render loop | `ar.create()` |
| Show a product | Load GLTF, build the scene, wire hit testing | `ar.placeModel(url)` |
| Let users move it | Write touch math for scale and rotation | Built in |
| Ship on Android | Write a separate native ARCore integration | Same JS API through Capacitor |

## Features

- **Surface detection** with dotted plane feedback and a placement reticle
- **Tap to place** GLB/GLTF models, with preloading and caching for fast product switching
- **Gestures built in:** pinch to scale, two-finger twist to rotate
- **State carries over:** switch models and placement, scale and rotation are kept
- **Runtime styling:** change model colors and textures on the fly
- **AR screenshots:** capture what the user sees
- **React DOM overlays** rendered on top of the immersive view
- **Two runtimes, one API:** WebXR in the browser, native ARCore on Android

## Install

```bash
npm install capacitor-arcore
npx cap sync   # Capacitor apps: registers the native Android plugin
```

## Quick start

```js
import { createARView } from 'capacitor-arcore';

const ar = createARView({
  overlay: document.querySelector('#ar-overlay'),
});

await ar.create({
  showReticle: true,
  showPlaneDots: true,
});

await ar.preloadModels(['/models/sofa.glb', '/models/chair.glb']);

await ar.placeModel('/models/sofa.glb');
```

Your users then interact naturally with the scene: **tap to place, pinch to scale, twist with two fingers to rotate.**

## Use it in React

A product viewer with a model switcher, built on the same API:

```jsx
import { useEffect, useRef, useState } from 'react';
import { createARView } from 'capacitor-arcore';

const MODELS = {
  Sofa: '/models/sofa.glb',
  Chair: '/models/chair.glb',
};

export default function ProductAR() {
  const overlayRef = useRef(null);
  const arRef = useRef(null);
  const [active, setActive] = useState('Sofa');

  async function start() {
    arRef.current = createARView({ overlay: overlayRef.current });
    await arRef.current.create({ showReticle: true, showPlaneDots: true });
    await arRef.current.preloadModels(Object.values(MODELS));
    await arRef.current.placeModel(MODELS[active]);
  }

  async function switchTo(name) {
    setActive(name);
    await arRef.current?.placeModel(MODELS[name]); // placement, scale, rotation carry over
  }

  return (
    <>
      <button onClick={start}>View in your room</button>
      <div id="ar-overlay" ref={overlayRef}>
        {Object.keys(MODELS).map((name) => (
          <button key={name} onClick={() => switchTo(name)}>{name}</button>
        ))}
      </div>
    </>
  );
}
```

> Overlay children are regular React DOM, so your product UI, price tags and "Add to cart" buttons sit directly on top of the AR view.

## API at a glance

| Call | What it does |
|---|---|
| `createARView(options)` | Entry point. Creates an AR view bound to a DOM overlay element. |
| `ar.create({ showReticle, showPlaneDots })` | Starts the AR session with surface feedback. |
| `ar.preloadModels(urls)` | Preloads and caches GLB/GLTF models for fast switching. |
| `ar.placeModel(url)` | Places a model at the reticle; switching keeps placement, scale and rotation. |
| Gestures | Tap to place, pinch to scale, two-finger twist to rotate. |
| Runtime styling | Change model colors and textures; capture AR screenshots. |

Full reference with every option and method: **[docs/API.md](docs/API.md)**.

## How it works

<img src="docs/assets/layers.svg" width="100%" alt="Layer diagram: your React app, the capacitor-arcore SDK, Three.js with WebXR, and the Android ARCore bridge">

In the browser, the SDK drives a Three.js scene over WebXR. On Android, the same JavaScript API talks through Capacitor to a native ARCore plugin (in `android/`). One codebase covers both.

## Compatibility

| Area | Support |
|---|---|
| Browser AR | WebXR-capable browsers (Three.js scene) |
| Native | Android, via the Capacitor ARCore plugin in `android/` |
| Framework | React + Capacitor applications |
| Models | GLB / GLTF |
<!-- TODO: add minimum versions: Capacitor, React, Android API level, tested browsers/devices -->

## Troubleshooting

<details>
<summary><b>AR won't start in the browser</b></summary>

WebXR requires a secure context (HTTPS or `localhost`) and a WebXR-capable browser and device. See [docs/HTTPS_SETUP.md](docs/HTTPS_SETUP.md) for testing on a real phone.
</details>

<details>
<summary><b>Android build can't find the plugin</b></summary>

Run `npx cap sync` after installing, then rebuild the Android project.
</details>

<details>
<summary><b>Model doesn't appear or looks wrong</b></summary>

Check that the file is a valid GLB/GLTF and that the URL is reachable from the device. Preloading the model first makes load errors easier to spot.
</details>

## Documentation

| Guide | Contents |
|---|---|
| [API.md](docs/API.md) | Full API reference |
| [INSTALLATION.md](docs/INSTALLATION.md) | Installation and setup |
| [HTTPS_SETUP.md](docs/HTTPS_SETUP.md) | HTTPS for device testing |
| [PHONE_TESTING.md](docs/PHONE_TESTING.md) | Testing on a physical phone |

A runnable demo lives in [`example/`](example/).

## Contributing

Issues and pull requests are welcome.

- JavaScript API: `src/`
- Native Android plugin: `android/`
- Please test changes against the example app, on a WebXR browser or an ARCore device, before opening a PR.

## License

[MIT](LICENSE) © Saugat Shahi

---

<p align="center">
  Built by <b>Saugat Shahi</b> · <a href="https://github.com/ShahiCrafts">@ShahiCrafts</a><br>
  If this saves you time, a ⭐ helps others find it.
</p>
