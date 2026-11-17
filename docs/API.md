# API reference

This page documents the package's full public surface, verified
against the shipped type declarations (`src/*.d.ts`, which
`npm run check-types` keeps honest against the implementation).
There are four layers; most application code needs only the first.

| Layer | Entry point | Use it for |
| --- | --- | --- |
| `ARView` | `reticlexr` (root) or `reticlexr/ar-view` | The high-level API: session, placement, gestures, customisation |
| `useARCore` | `reticlexr/react` | The same engine mirrored into React state |
| `ARCoreWeb` (engine) | `reticlexr/web` | Advanced control: config, materials, shadows, listeners |
| `ARCore` (facade) | `reticlexr` (root, default export) | The Capacitor plugin facade — routes to the WebXR engine on web, the native plugin on Android |
| Gesture controller | `reticlexr` (root) or `reticlexr/gestures` | Standalone Pointer Events gestures for a DOM overlay |

## ARView

Application code should use `createARView()` instead of coordinating
WebXR, Three.js, hit tests and gestures itself.

```js
import { createARView } from 'reticlexr';

const ar = createARView({ overlay: document.querySelector('#ar-overlay') });
await ar.create({ showReticle: true, showPlaneDots: true, enableScreenshots: true });
await ar.preloadModels(['/models/sofa.glb', '/models/chair.glb']);

ar.enableCustomization({ modelUrl: () => '/models/sofa.glb' });
await ar.placeModel('/models/sofa.glb');       // center hit-test + anchor
await ar.switchModel('/models/chair.glb');     // preserves placement/scale/rotation
ar.addTextures({ oak: '/textures/oak.jpg' });
await ar.applyTexture('oak');
await ar.setColor('#68705b');
const shot = await ar.takeScreenshot();
```

`createARView(options?)` / `new ARView(options?)` accept
`{ engine?, overlay? }` — a custom `ARCoreWeb` instance and the DOM
overlay element for the session.

| Method | Notes |
| --- | --- |
| `checkSupport()` | → `{ supported, reason, code? }` |
| `create(options?)` | Starts the session. Options: `overlay?`, `showReticle`, `showPlaneDots`, `dotSpacing`, `dotSize`, `showShadow`, `planeDetection`, `lightEstimation`, `enableScreenshots` (see Screenshots) |
| `destroy()` | Tears down gestures and the engine (`engine.dispose()`) |
| `onFrame(cb)` / `onPlanes(cb)` | Subscribe to engine frame / plane events; return an unsubscribe function |
| `getSurface()` | `{ hasSurface, position, rotation, planeType, confidence }` |
| `getPlanes()` | `[{ orientation, polygon }]` for detected planes |
| `setReticleVisible(v)` / `setSurfaceDotsVisible(v)` | Visibility toggles |
| `preloadModels(urls)` | Loads each URL into the engine cache |
| `placeModel(modelUrl, options?)` | Hit-tests (centre, or `x`/`y`, or an explicit `position`) and places. Resolves `{ success, modelId?, code?, reason? }` — `reason` is a deprecated alias of `code` |
| `switchModel(modelUrl, { preserveMaterial? } = {})` | Swaps the active model **in place** — placement, scale and rotation carry over. Use this, not `placeModel`, for product switching |
| `moveModel({ x, y } = {})` | Moves the active model to the surface under a normalised screen point (default centre). Keeps its scale; a miss resolves `{ success: false, code: 'NO_SURFACE' }` and the model stays put |
| `removeModel()` | Removes the active model |
| `getPlacedModels()` | Models placed through this view: `[{ modelId, modelUrl, position, rotation, scale }]` |
| `clearModels()` | Removes every model placed through this view |
| `setScale(n)` | Uniform scale, clamped to **[0.1, 5]** |
| `rotateBy(radians)` | Accumulates a Y rotation on the active model |
| `setColor(hex)` | Recolours the active model |
| `addTextures({ name: url })` | Registers named texture URLs; returns `this` |
| `applyTexture(nameOrUrl, { materialName? } = {})` | Applies a registered or direct texture URL |
| `enableCustomization(options)` | Wires tap-to-place / pinch / twist gestures on the overlay (throws without one); returns a cleanup function. Options: `{ modelUrl: string \| () => string, onTap?, onScale?, onRotate?, onError? }` |
| `takeScreenshot(options?)` | See Screenshots below |

Public fields: `engine`, `overlay`, `activeModelId`,
`activeModelUrl`, `placedModelUrls` (Map), `transform`
(`{ scale, rotationY }`), `textures` (Map).

### Functional helpers

For codebases that prefer functions, the package also exports
`takeScreenshot(view)`, `enableCustomization(view)`,
`addTextures(view)`, `switchModel(view)` and `placeModel(view)` —
the same operations, view-first.

### Surface feedback

`showReticle` keeps the center placement reticle visible whenever a
hit-test surface exists, including after a model has been placed.
`showPlaneDots` draws a sparse dotted visualization over WebXR
planes. Plane meshes remain disabled by default to reduce GPU cost.

### Gestures

`enableCustomization()` provides tap-to-place, pinch-to-scale and
two-finger twist-to-rotate. UI elements marked `data-ui="true"` are
ignored by the gesture layer. For standalone use, the gesture
controller is exported directly:

```js
import { createARGestureController } from 'reticlexr';

const gestures = createARGestureController({
  element,                 // required — the factory throws without it
  onTap,                   // ({ x, y }) — pixels
  onDrag,                  // ({ dx, dy, x, y })
  onPinch,                 // ({ factor, center }) — factor is incremental
  onRotate,                // ({ delta, center }) — delta in radians
  tapMaxDuration = 260,    // ms
  tapMaxDistance = 12,     // px
  preventDefault = true,
  ignoreSelector = '[data-ui]',
});
gestures.destroy();
```

## useARCore (React)

```jsx
import { useARCore } from 'reticlexr/react';

function ARViewComponent() {
  const ar = useARCore();              // shared engine (lazy, one per app)
  // const ar = useARCore({ engine }); // or a dedicated ARCoreWeb instance
  // …
}
```

> Importing `useARCore` from the package **root** still works but
> is **deprecated** — use `reticlexr/react` (see Deprecated
> aliases). The root entry cannot drop its React import while the
> re-export lives there.

**State:** `isSupported` (`boolean | null` while checking),
`isSessionActive`, `placedModels` (`[{ modelId, modelUrl, position,
rotation, scale }]`), `error` (`string | null`), `detectedPlanes`
(`{ horizontal, vertical, total }` — counts are numbers),
`surfaceState`.

**Methods:** `startSession(options?) → Promise<boolean>`,
`stopSession()`, `hitTest(x, y)` (normalised [0, 1], origin
top-left — not pixels), `placeModel(modelUrl, position?, rotation?,
scale?)`, `removeModel(modelId)`, `getPlacedModels()`,
`clearModels()`, `transformModel(modelId, transforms)`,
`setModelColor(modelId, color)`, `setModelMaterial(modelId,
{ metalness?, roughness?, opacity? })`, `setConfig` / `getConfig`,
`setShadowConfig` / `getShadowConfig`, `setShadowVisible(modelId,
v)`, `getDetectedPlanes()`, `setReticleVisible(v)`,
`setPlaneVisualization(v)`, `clearError()`, `getRenderer()` /
`getScene()` / `getCamera()`, `takeScreenshot(options?)`.

Transform inputs are normalised at the engine boundary: positions
accept `[x, y, z]` or `{x, y, z}`; rotations accept a quaternion
array/object or Euler **radians**; scales accept a number,
`[x, y, z]` or `{x, y, z}`, clamped to [0.1, 5] per axis. With no
`{ engine }` option, all hook consumers share one lazily-created
engine — one consumer stopping the session stops it for all;
pass a dedicated `new ARCoreWeb()` (from `reticlexr/web`) per view
for isolation.

## ARCoreWeb (engine)

`import { ARCoreWeb } from 'reticlexr/web'` — the WebXR runtime
class. `ARView` wraps one instance; advanced consumers can drive it
directly (the hook does).

- **Configuration:** `setConfig(partial)` / `getConfig()` over
  `ARConfig` (`showReticle`, `showPlanes`, `showPlaneDots`,
  `showShadow`, `showBaseRing`, reticle/plane colours,
  `shadowOpacity`, `shadowSize`, `dotSize`, `dotSpacing`, `debug`
  — gates engine logging, `modelCacheLimit` — LRU cap on the model
  cache, default 20).
- **Session:** `checkSupport()`, `startSession({ planeDetection?,
  lightEstimation?, enableScreenshots?, domOverlay? })`,
  `stopSession()`, `dispose()` (full teardown; the instance can be
  started again), `getSession()`.
- **Hit testing & surface:** `hitTest({ x?, y? })` (centre by
  default; non-centre coordinates perform a ray-based hit test),
  `hitTestAtPoint(x, y)`, `getSurfaceState()`,
  `getSurfaceDetectionState()`, `getDetectedPlanes()`,
  `setReticleVisible(v)`.
- **Models:** `loadModel(url)`, `placeModel({ modelUrl, position?,
  rotation?, scale? }) → { modelId }`, `removeModel({ modelId })`,
  `getPlacedModels()`, `clearModels()`, `transformModel({
  modelId, position?, rotation?, scale? })`,
  `switchModel({ modelId, modelUrl, preserveMaterial? })` (material
  carry-over matches by material name, then traversal order),
  `clearModelCache()`.
- **Appearance:** `setModelColor({ modelId, color })`,
  `setModelMaterial({ modelId, metalness?, roughness?,
  opacity? })`, `setModelTexture({ modelId, textureUrl,
  materialName? })`, `setShadowVisible(modelId, v)`,
  `setShadowConfig(partial)` / `getShadowConfig()`,
  `setPlaneVisualization(v)` / `isPlaneVisualizationEnabled()`.
- **Facade shims:** `setTransform` / `setMaterial` / `moveModel`
  accept the facade's option shapes (a plain `{x, y, z}` rotation
  in `setTransform` is Euler **degrees**, the native convention;
  quaternion shapes pass through).
- **Events & accessors:** `addFrameListener(cb)` /
  `addPlaneListener(cb)` (return unsubscribe functions),
  `getAnchors()`, `getRenderer()`, `getScene()`, `getCamera()`.

## ARCore facade

The default export routes each call to the active runtime — the
WebXR engine in a browser/WebView, the native plugin on Android.

| Method | Signature | Returns |
| --- | --- | --- |
| `checkSupport()` | | `{ supported, reason, code? }` |
| `startSession(options?)` | `{ planeDetection?, lightEstimation? }` | `{ success }` |
| `stopSession()` | | `void` |
| `hitTest({ x, y })` | normalised [0, 1] | `{ hit, position?, rotation?, planeType?, error? }` |
| `placeModel(options)` | `{ modelPath }` or `{ modelUrl }` (both forwarded), `hitId?` | `{ modelId }` |
| `setTransform({ modelId, rotation?, scale? })` | rotation is Euler **degrees** | `void` |
| `setMaterial({ modelId, color })` | | `void` |
| `moveModel({ modelId, x, y })` | | hit-test result |
| `removeModel({ modelId })` | | `void` |
| `getPlacedModels()` | | `[{ modelId, modelUrl, position, rotation, scale }]` |
| `clearModels()` | | `void` |
| `on(eventType, callback)` | facade events (below) | unsubscribe function |
| `addListener(eventType, callback)` | direct Capacitor listener | `Promise<PluginListenerHandle>` |

### Native Android runtime scope

The facade talks to two runtimes. The **WebXR runtime** is the full
runtime: it renders and places models. The **native Android
runtime** is deliberately scoped to **session management and
hit-testing only** (audit NAT-01, Option B):

| Native method | Status |
| --- | --- |
| `checkSupport` | Implemented — real `ArCoreApk.checkAvailability()` result |
| `startSession` / `stopSession` | Implemented |
| `hitTest` | Implemented — served by the render loop; a successful hit creates a real ARCore anchor and returns its `anchorId` |
| `placeModel` | **Not implemented** — rejects with code `NOT_IMPLEMENTED` (no native model rendering) |
| `moveModel` | **Not implemented** — rejects with code `NOT_IMPLEMENTED` |
| `setTransform` | **Not implemented** — rejects with code `NOT_IMPLEMENTED` |
| `setMaterial` | **Not implemented** — rejects with code `NOT_IMPLEMENTED` |
| `removeModel` | **Not implemented** — rejects with code `NOT_IMPLEMENTED` |
| `getPlacedModels` | **Not implemented** — rejects with code `NOT_IMPLEMENTED` |
| `clearModels` | **Not implemented** — rejects with code `NOT_IMPLEMENTED` |

On Android, use the WebXR runtime (the default in a Capacitor
WebView) for model placement; the native methods above fail
honestly instead of reporting success for work that never happened.

## Events (per runtime)

Events are **per runtime** — the two sets are different and travel
over different channels.

**Facade events** (`ARCore.on(...)`, native plugin set; the bridge
installs lazily on the first subscription): `sessionStarted`,
`trackingChanged`, `surfaceDetected`, `surfaceLost`,
`surfaceUpdated`, `sessionStopped`, `modelPlaced`, `modelRemoved`,
`modelTransformed`, `modelMaterialChanged`, `modelMoved`, `error`.
Of these, `surfaceUpdated`, `trackingChanged`, `sessionStarted`,
`sessionStopped`, `modelMaterialChanged` and `modelMoved` are
native-only.

**Engine events** (WebXR runtime, via `addFrameListener` /
`ARView.onFrame`): `surfaceDetected`, `surfaceLost`, `modelPlaced`,
`modelRemoved`, `modelTransformed`, `modelColorChanged`,
`modelSwitched`, `sessionEnded` — payloads carry `modelId` (with
`anchorId` as its deprecated alias). Plane listeners
(`addPlaneListener` / `ARView.onPlanes`) receive `planeAdded` and
`planesUpdated` (`{ total, horizontal, vertical }` — numbers, not
arrays).

## Screenshots

`takeScreenshot(options?)` exists on the engine, `ARView` and the
hook; options are `{ format?: 'png' | 'jpeg', quality?, width?,
height?, includeReticle? }`. It resolves
`{ success: true, dataUrl, width, height, timestamp,
includesCamera }` or `{ success: false, code?, error }`.

**Caveat (DOC-05):** capturing the camera feed needs the WebXR
`camera-access` feature, which is **opt-in**: pass
`enableScreenshots: true` when starting the session
(`ARView.create()` / `startSession()`). It is *not* implied by
`lightEstimation`. Without it — or on a browser that doesn't
expose camera frames at all — `takeScreenshot()` resolves
`{ success: false, code: 'CAMERA_CAPTURE_UNAVAILABLE' }` while AR
keeps running.

## Errors

One convention across the package (API-05): async methods reject
with an **`ARError`** — an `Error` subclass with a stable,
machine-readable `code`, exported from the package root and from
`reticlexr/web` (along with the `codedError(code, message)`
factory). Result-object APIs (`hitTest`, `takeScreenshot`,
`ARView.placeModel`) resolve with the same `code` on their failure
results instead of rejecting. Error *messages* are human-readable
and may change; **codes are the contract**:

`SESSION_START_FAILED`, `SESSION_NOT_ACTIVE`, `SESSION_ENDED`,
`HIT_TEST_FAILED`, `HIT_TEST_TIMEOUT`, `HIT_TEST_UNAVAILABLE`,
`NO_VIEWER_POSE`, `MODEL_NOT_FOUND`, `MODEL_URL_REQUIRED`,
`MODEL_LOAD_FAILED`, `NO_SURFACE`, `NO_ACTIVE_MODEL`,
`OVERLAY_REQUIRED`, `CAMERA_CAPTURE_UNAVAILABLE`, `CAPTURE_BUSY`,
`INSECURE_CONTEXT` — plus runtime codes surfaced unchanged by the
facade (e.g. the native `NOT_IMPLEMENTED` and
`ACTIVITY_UNAVAILABLE`), with a per-method `*_FAILED` fallback when
a runtime provides no code.

## Model and texture URLs (SEC-03)

Model and texture URLs are loaded **as given** — the engine passes
them to three.js `GLTFLoader` / `TextureLoader` and the package
performs no validation or allow-listing (there is no URL
validation hook in the package today). Treat them as trusted,
app-controlled input:

- **Only load models/textures from sources you control or trust.**
  A GLB is parsed in your page's origin by the GLTF pipeline; an
  untrusted file is untrusted content, with the parser's attack
  surface to match. Never feed user-supplied or third-party URLs
  to `placeModel`/`loadModel`/`setModelTexture` without your own
  validation and hosting decisions.
- **Cross-origin URLs need CORS.** A model or texture served from
  another origin must send `Access-Control-Allow-Origin` (and be
  served over HTTPS in a secure context) or the load fails;
  textures additionally need CORS for WebGL use. Same-origin or
  bundled assets avoid the issue entirely.

## Deprecated aliases

All aliases keep working throughout 1.x, log a one-time
deprecation warning where noted, and are removed in the next major
version.

| Deprecated | Replacement | Notes |
| --- | --- | --- |
| `anchorId` (inputs, results, event payloads) | `modelId` | The same string (API-01); one-time warning when used as an input |
| `modelPath` (engine `placeModel` option) | `modelUrl` | The facade accepts both names and forwards both |
| `reason` (`ARView` place result) | `code` | The same string |
| `useARCore` from the package root | `useARCore` from `reticlexr/react` | Root re-export kept for 1.x (API-02) |
