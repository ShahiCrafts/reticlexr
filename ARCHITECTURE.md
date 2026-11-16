# Architecture — capacitor-arcore (arcore-react)

> Generated from a full read of the repository at branch `docs/vercel-site`
> (head `c6241b3`). Every signature, default and version below was verified
> against source; file:line references point at the evidence. Anything that
> could not be verified is marked **TODO**.

The package is a Capacitor plugin with **two independent AR runtimes behind
three JS API layers**:

1. **WebXR runtime** (`src/web.js`) — Three.js scene over WebXR. This is the
   only runtime that actually renders in a browser, and it is also what the
   Capacitor web view falls back to on the web platform.
2. **Native Android runtime** (`android/`) — Capacitor bridge to ARCore +
   Filament. Reached only through the `ARCore` facade in `src/index.js`.
3. **High-level facade** (`src/ar-view.js`, `src/hooks.js`, `src/gestures.js`)
   — `ARView`/`createARView`, the `useARCore` React hook and the gesture
   controller. These sit on top of the WebXR runtime only; they never call the
   native plugin.

There is **no TypeScript and no build step**: `package.json` `main` and
`module` both point at the raw ESM source `src/index.js`, there is no root
`tsconfig.json`, no bundler config, and no `.d.ts` anywhere in the repo.

---

## 1. Module map

### JavaScript (`src/`, ~95.7 KB total, plain ESM)

| File | Size | Responsibility |
|---|---|---|
| `src/index.js` | 12,704 B | Package entry. Registers the Capacitor plugin as `ARCore` (`registerPlugin('ARCore', …)`), exposes the native facade object `ARCore` (session/hit-test/model methods + local event bus `on()`), bridges native events into that bus **lazily** — `setupEventBridge()` runs on the first `ARCore.on()` call and is idempotent (a `WeakSet` of bridged plugins) — and re-exports `useARCore` (deprecated at the root), `ARError`/`codedError`, `createARGestureController`, and the `ar-view.js` API. |
| `src/web.js` | 54,261 B | `ARCoreWeb extends WebPlugin` — the entire WebXR runtime: Three.js renderer/scene setup, XR session lifecycle, hit-test source, plane detection + dot/mesh visualisation, placement reticle, GLB loading/caching, model anchors/transforms/materials/textures, screenshots via `XRWebGLBinding.getCameraImage`, shadow blob planes. |
| `src/ar-view.js` | 9,822 B | `ARView` class + `createARView()` factory + functional helpers. A framework-agnostic facade over one `ARCoreWeb` instance: single "active model" state plus a per-view registry of every placement (backing `getPlacedModels()`/`clearModels()`), transform state (`{scale, rotationY}`), texture registry, gesture wiring via `enableCustomization()`. |
| `src/react.js` | 626 B | The `reticlexr/react` subpath entry: re-exports `useARCore` (and its option types) so React consumers don't pull the facade/engine graph through the package root. |
| `src/hooks.js` | 27,713 B | `useARCore(options?)` React hook. Wraps a caller-supplied `options.engine` (fixed at mount) or a **lazily constructed shared default** engine, and mirrors engine events into React state (support, session, placed models, planes, per-frame surface state, errors). |
| `src/gestures.js` | 3,255 B | `createARGestureController()` — framework-agnostic Pointer Events controller: 1-finger tap/drag, 2-finger pinch + twist, with `data-ui` ignore zones. Returns `{ destroy() }`. |

### Android (`android/src/main/java/com/capacitor/arcore/`, 2,363 lines of Java)

| Class | Responsibility |
|---|---|
| `ARCorePlugin.java` (672 lines) | Capacitor facade: `@CapacitorPlugin(name = "ARCore")` with a `camera` permission alias. Owns the managers, validates call params, delegates, converts results to `JSObject`, forwards native events via `notifyListeners(..., true)`. Plugin methods: `checkSupport`, `startSession`, `stopSession`, `hitTest`, `placeModel`, `setTransform`, `setMaterial`, `moveModel`, `removeModel` — exactly the set the JS facade calls. |
| `session/ARSessionManager.java` | Sole owner of the ARCore `Session`: availability check (`ArCoreApk.checkAvailability`), `requestInstall`, `Config` (plane finding, light estimation, `LATEST_CAMERA_IMAGE`, auto focus), `acquireLatestFrame()` = the single `Session.update()` call site, pause/resume/close. |
| `render/ARRenderer.java` | Filament pipeline + the single native frame loop on a dedicated `ARRenderThread`: acquire frame → tracking state → planes → camera matrices → camera background → Filament render. Implements `ARNativeView.ARViewRenderer` (SurfaceHolder callbacks, SwapChain lifecycle). |
| `render/ARCoreTextureBackground.java` | Fullscreen quad that displays the ARCore camera texture (`GL_TEXTURE_EXTERNAL_OES`) via a pre-compiled Filament material (`res/raw/camera.filamat`), with per-frame UV transform updates for display rotation. Has a `destroy()` that releases Filament resources. |
| `surface/ARSurfaceManager.java` | Tracks planes from `frame.getUpdatedTrackables(Plane.class)`, maintains `SurfaceState {hasSurface, planeType, planeCount}` and fires detected/lost/updated callbacks. |
| `interaction/ARCoordinateMapper.java` | Converts normalised [0,1] screen coords → display pixels (cached `DisplayMetrics`) → `frame.hitTest()`; returns `HitTestResult {position[3], rotation[4], planeType, pixelX, pixelY}`. |
| `model/ARModelManager.java` | Model **metadata registry only** (`model_N` ids, anchor id, path, scale, rotation, colour in a `HashMap`). Class doc states GLB loading via gltfio is "future integration" — it never creates Filament renderables. |
| `anchor/ARAnchorManager.java` | Registry of real ARCore `Anchor` objects (`anchor_N` ids) with detach-on-remove. **No caller ever registers an anchor** (see AUDIT NAT-04). |
| `events/AREventEmitter.java` | Thread-safe (`CopyOnWriteArrayList`) in-process event bus from managers to the plugin. |
| `view/ARViewManager.java` | Inserts `ARNativeView` at index 0 of the activity content `FrameLayout` (behind the WebView), makes the WebView transparent during AR, restores its state afterwards. |
| `view/ARNativeView.java` | `SurfaceView` forwarding `SurfaceHolder` callbacks to `ARRenderer`. |

### Example app (`example/`)

Vite + React 18 playground. `src/components/ARPlayground.jsx` is the only
component that uses the SDK (via `createARView`); `ARControls`, `ModelControls`,
`StatusPanel`, `EventLog` are presentational and unused by it, and
`BrowserUnsupported.jsx` is never imported anywhere. `example/android/` is a
full Capacitor Android project whose `settings.gradle` includes the plugin by
hand (`project(':capacitor-arcore').projectDir = new File(rootDir,
'../../android')`). Ships three placeholder GLBs (sofa 832 B, table 2,484 B,
chair 3,096 B — valid glTF binary, minimal geometry).

---

## 2. Public API surface (verified)

### 2.1 Package exports — `src/index.js`

Default export `ARCore`, plus named exports:

```js
export { ARCore }                       // default export too
export { useARCore }                    // from hooks.js — DEPRECATED at the root;
                                        // canonical entry: reticlexr/react
export { ARError, codedError }          // from web.js (the coded-error convention)
export { setupEventBridge }             // lazy, idempotent native-event bridge
export { createARGestureController }    // from gestures.js
export { ARView, createARView, takeScreenshot, enableCustomization,
         addTextures, switchModel, placeModel }   // from ar-view.js
```

Subpath entries (package `exports` map): `reticlexr/react` (the hook),
`reticlexr/web` (`ARCoreWeb` + `ARError`/`codedError`), `reticlexr/ar-view`,
`reticlexr/gestures`, `reticlexr/package.json`.

### 2.2 Native facade `ARCore` (index.js:46–225)

All methods delegate to the Capacitor plugin registered as `'ARCore'`
(web platform → `ARCoreWeb`). Errors reject with an `Error` carrying a
stable `code` — the runtime error's own code when present, otherwise a
per-method `*_FAILED` fallback; the message keeps the
`'Failed to …: '` prefix. `checkSupport` resolves
`{supported:false, reason, code?}` instead of rejecting.

| Method | Signature | Returns |
|---|---|---|
| `startSession` | `(options?: { planeDetection?: boolean = true, lightEstimation?: boolean = true })` | `Promise<{success: boolean}>` |
| `stopSession` | `()` | `Promise<void>` |
| `hitTest` | `(options: { x: number [0,1], y: number [0,1] })` | `Promise<Object>` — native shape: `{hit, position?, rotation?, planeType?, error?}` |
| `placeModel` | `(options: { modelPath: string, hitId?: string })` — `modelUrl` accepted as an alias for `modelPath`; the facade forwards **both** keys (native reads `modelPath`, the web engine prefers `modelUrl`) | `Promise<{modelId: string, anchorId: string}>` |
| `getPlacedModels` | `()` | `Promise<Array>` — web: the engine's list; Android: plugin method lands in the native phase |
| `clearModels` | `()` | `Promise<void>` — same Android caveat |
| `setTransform` | `(options: { modelId: string, rotation?: {x,y,z} degrees, scale?: number })` | `Promise<void>` |
| `setMaterial` | `(options: { modelId: string, color: string /* hex */ })` | `Promise<void>` |
| `moveModel` | `(options: { modelId: string, x: number, y: number })` | `Promise<Object>` |
| `removeModel` | `(options: { modelId: string })` | `Promise<void>` |
| `checkSupport` | `()` | `Promise<{supported: boolean, reason: string, code?: string}>` |
| `on` | `(eventType: string, callback: (data) => void)` | unsubscribe `() => void` |
| `addListener` | `(eventType, callback)` | Capacitor plugin listener handle (marked `@internal`) |

Event types wired by the event bridge (installed lazily on the first
`ARCore.on()` call, idempotently):
`sessionStarted`, `trackingChanged`, `surfaceDetected`, `surfaceLost`,
`surfaceUpdated`, `sessionStopped`, `modelPlaced`, `modelRemoved`,
`modelTransformed`, `modelMaterialChanged`, `modelMoved`, `error`.

> Events are **per runtime** (API-07): the list above is the native
> plugin's set. The WebXR engine never emits through `ARCore.on`; it
> emits its own set via frame/plane listeners (§2.4) — including
> web-only `modelColorChanged`, `modelSwitched`, `sessionEnded`,
> `planeAdded`, `planesUpdated` — while `surfaceUpdated`,
> `trackingChanged`, `sessionStarted`, `sessionStopped`,
> `modelMaterialChanged`, `modelMoved` are native-only.

> Identifiers are unified on **`modelId`** (API-01): the value is the
> engine's anchor id, unchanged. The engine still accepts `anchorId` as
> a deprecated alias (one-time warning) and includes it in results and
> event payloads. `ARCoreWeb`'s compatibility shims
> (`setTransform`/`setMaterial`/`moveModel` in web.js) resolve either
> key silently and forward `modelId`.

### 2.3 `ARView` / `createARView` (ar-view.js)

`new ARView(options?)` / `createARView(options?)` → `ARView`.
Constructor options: `{ engine?: ARCoreWeb (default: new instance),
overlay?: HTMLElement }`.

| Member | Signature / behaviour |
|---|---|
| `checkSupport()` | → `engine.checkSupport()` |
| `create(options?)` | `options: { overlay?, showReticle = true, showPlanes (forced false), showPlaneDots = true, dotSpacing = 0.14, dotSize = 0.014, showShadow = true, planeDetection = true, lightEstimation = true }` → session result `{success, hasOverlay, planeDetection}` |
| `destroy()` | Destroys gestures, `await engine.stopSession()` |
| `onFrame(cb)` / `onPlanes(cb)` | Subscribe to engine frame/plane listeners; return unsubscribe |
| `getSurface()` | Engine surface state `{hasSurface, position, rotation, planeType, confidence}` |
| `getPlanes()` | `[{orientation, polygon: [{x,y,z}]}]` |
| `setReticleVisible(v)` / `setSurfaceDotsVisible(v)` | Visibility toggles |
| `preloadModels(urls)` | `Promise.all` of `engine.loadModel(url)` (populates the model cache) |
| `placeModel(modelUrl, options?)` | `options: { position?, rotation?, x = 0.5, y = 0.5, scale? }`. Hit-tests centre (or `x,y`) unless `position` given. Returns `{success:true, modelId, anchorId, …}` or `{success:false, code:'NO_SURFACE', reason:'NO_SURFACE'}` (`reason` = deprecated alias of `code`). Sets `activeModelId`/`activeModelUrl` and registers the placement. |
| `getPlacedModels()` / `clearModels()` | This view's placements (engine list filtered to the view's registry) / remove them all through the ownership-rule disposal path |
| `switchModel(modelUrl, options?)` | `options: { preserveMaterial = true }`. Falls back to `placeModel` when nothing is placed. Preserves placement/transform. |
| `removeModel()` | Removes the active model; clears active id/url. No-op if none. |
| `setScale(scale)` | Clamped to **[0.1, 5]** — the one scale range shared by every layer/runtime (`SCALE_MIN`/`SCALE_MAX` in web.js, enforced by the engine in `placeModel`/`transformModel`; Android `ARModelManager` uses the same range) (API-08), applied as uniform `[s,s,s]` |
| `rotateBy(radians)` | Accumulates `transform.rotationY`, applies Y-quaternion |
| `setColor(color)` | Engine `setModelColor` on the active model |
| `addTextures({name: url})` | Registers named texture URLs; returns `this` (chainable) |
| `applyTexture(nameOrUrl, options?)` | `options: { materialName? }`. Throws a coded error (`NO_ACTIVE_MODEL`) if no model placed. |
| `enableCustomization(options?)` | Requires an overlay (throws otherwise). `options: { modelUrl: () => string, onTap?, onScale?, onRotate? }` — note `modelUrl` is **invoked as a function** (ar-view.js:120). Returns a cleanup function. |
| `takeScreenshot(options?)` | Delegates to engine (see 2.4) |
| Public fields | `activeModelId`, `activeModelUrl`, `transform {scale: 1, rotationY: 0}`, `textures: Map` |

Functional helpers (same names, view-first): `takeScreenshot(view, options)`,
`enableCustomization(view, options)`, `addTextures(view, textures)`,
`switchModel(view, modelUrl, options)`, `placeModel(view, modelUrl, options)`.

### 2.4 `ARCoreWeb` engine (web.js) — public methods used by the layers above

Session/config: `setConfig(partial)` / `getConfig()`, `checkSupport()`,
`startSession({planeDetection = true, lightEstimation = true, domOverlay = null})`,
`stopSession()`, `getSession()`, `getRenderer()`, `getScene()`, `getCamera()`,
`getAnchors()`.

Default `config` (web.js:80–97): `showReticle: true`, `showPlanes: false`,
`showPlaneDots: true`, `showShadow: true`, `showBaseRing: false`,
`reticleColor: 0x00ff88`, `reticleColorVertical: 0xff6b6b`,
`planeColorHorizontal: 0x00ff88`, `planeColorVertical: 0xff6b6b`,
`shadowOpacity: 0.4`, `shadowSize: 1.2`, `dotSize: 0.02`, `dotSpacing: 0.1`.

Models: `loadModel(url)` → cached `gltf.scene.clone()`;
`placeModel({modelUrl, position?, rotation = [0,0,0,1], scale = [1,1,1]})` → `{modelId, anchorId}`
(`modelPath` is a deprecated alias for `modelUrl`; transform inputs are
normalised at the engine boundary — position accepts `[x,y,z]` or
`{x,y,z}`, rotation a quaternion array/object or Euler-radians `{x,y,z}`,
scale a number, `[x,y,z]` or `{x,y,z}` — BUG-01);
`removeModel({modelId})`; `transformModel({modelId, position?, rotation?, scale?})`;
`switchModel({modelId, modelUrl, preserveMaterial = true})`;
`setModelColor({modelId, color})`;
`setModelMaterial({modelId, metalness?, roughness?, opacity?})`;
`setModelTexture({modelId, textureUrl, materialName?})`
(all accept `{anchorId}` as a deprecated alias for `{modelId}`);
`getPlacedModels()` / `clearModels()`;
facade shims `setTransform(options)`, `setMaterial(options)`, `moveModel(options)`.
Failures reject with coded `ARError`s (`MODEL_URL_REQUIRED`,
`MODEL_NOT_FOUND`, `MODEL_LOAD_FAILED`, `NO_SURFACE`, …); error messages
are unchanged from v1.0.0.

Queries/events: `hitTest({x, y})` → `{hit, position?, rotation?, planeType?}`
(the centre point uses the cached viewer-ray hit; any other point runs a
ray hit test — an `offsetRay` built from the camera pose + NDC point via
`requestHitTestSource`, the one-off source cancelled on every settle path —
BUG-03); `getSurfaceState()`,
`getSurfaceDetectionState()`, `getDetectedPlanes()`,
`addFrameListener(cb)` / `addPlaneListener(cb)` (both return unsubscribe),
`setReticleVisible(v)`, `setPlaneVisualization(v)` / `isPlaneVisualizationEnabled()`,
`setShadowVisible(modelId, v)`, `setShadowConfig({enabled?, opacity?, size?})` /
`getShadowConfig()`.

Screenshot: `takeScreenshot({format?: 'png'|'jpeg' = 'png', quality = 0.92,
width?, height?, includeReticle?})` →
`{success, dataUrl, width, height, timestamp, includesCamera}` or
`{success:false, code?: 'CAMERA_CAPTURE_UNAVAILABLE'|'CAPTURE_BUSY', error}`.

Frame-listener event payloads emitted by the engine: `surfaceDetected`
(every frame with a hit), `surfaceLost`, `modelPlaced`, `modelRemoved`,
`modelTransformed`, `modelColorChanged`, `modelSwitched`, `sessionEnded`,
plus plane-listener payloads `planeAdded`, `planesUpdated`
(`{type, total, horizontal, vertical}` — counts as **numbers**).

### 2.5 `useARCore(options?)` hook (hooks.js; entry `reticlexr/react`)

`options.engine` selects an instance-scoped engine (captured once at
mount); with no options, all consumers share one lazily constructed
default engine. Returns state: `isSupported: boolean|null`,
`isSessionActive: boolean`,
`placedModels: Array<{modelId, anchorId, modelUrl, position, rotation, scale}>`
(`anchorId` = deprecated alias of `modelId`),
`error: string|null`, `detectedPlanes: {horizontal, vertical, total}`,
`surfaceState: {hasSurface, position, rotation, planeType, confidence}`.

Methods (all `useCallback`): `startSession(options)` → `Promise<boolean>`
(options passed straight to the engine, e.g. `{domOverlay}`),
`stopSession()`, `hitTest(x, y)`, `placeModel(modelUrl, position, rotation, scale)`,
`removeModel(modelId)`, `getPlacedModels()`, `clearModels()`,
`transformModel(modelId, transforms)`,
`setModelColor(modelId, color)`, `setModelMaterial(modelId, properties)`,
`setConfig/getConfig`, `setShadowConfig/getShadowConfig`,
`setShadowVisible(modelId, v)`, `getDetectedPlanes()`, `setReticleVisible(v)`,
`setPlaneVisualization(v)`, `clearError()`, `getRenderer/getScene/getCamera`,
`takeScreenshot(options)`.

### 2.6 Gestures (gestures.js)

```js
createARGestureController({
  element,                       // required, throws if missing
  onTap, onDrag, onPinch, onRotate,
  tapMaxDuration = 260,          // ms
  tapMaxDistance = 12,           // px
  preventDefault = true,
  ignoreSelector = '[data-ui]',
}) → { destroy() }
```

Payloads: `onTap({x, y})` (the raw pointerup event point object is passed —
it is the `point(e)` result `{x, y}`), `onDrag({dx, dy, x, y})`,
`onPinch({factor, center})` (factor is **incremental**, relative to the
previous move event), `onRotate({delta, center})` (delta in radians,
incremental, wrapped to ±π).

### 2.7 Native plugin methods (ARCorePlugin.java)

`@CapacitorPlugin(name = "ARCore")`, permission alias `camera`
(`android.permission.CAMERA`). Methods and JS-visible behaviour are listed in
2.2; native specifics: `startSession` requests the camera permission first
(`@PermissionCallback handleCameraPermission`), `hitTest` resolves (never
rejects) with `{hit:false, error}` on failure, `placeModel` ignores the
documented `hitId` and always uses anchor id `"anchor_center"`
(ARCorePlugin.java:374).

---

## 3. Data flow

### 3.1 JS → Capacitor bridge → native ARCore (Android app, `ARCore` facade)

```
App JS ── ARCore.startSession() (index.js)
  └─ Capacitor bridge ──► ARCorePlugin.startSession (UI thread)
       ├─ camera permission check / request
       └─ ARSessionManager.createSession(planeDetection, lightEstimation)
            ├─ ArCoreApk.checkAvailability / requestInstall
            ├─ new Session(context); configure(Config)
            └─ callback.onSessionReady ─► ARCorePlugin.setupARRendering
                 ├─ ARModelManager(engine, scene)   [first session only]
                 ├─ ARRenderer.onSessionReady()     ─┐ render loop starts
                 └─ ARViewManager.setupARView()      │ when surface also ready
                      (ARNativeView behind WebView, WebView → transparent)
Render loop (ARRenderThread): ARRenderer.renderLoop()
  ARSessionManager.acquireLatestFrame()  (= Session.update(), synchronized)
  → tracking state → ARSurfaceManager.updatePlanes(frame)
  → camera view/projection matrices → ARCoreTextureBackground.updateFromFrame
  → Filament beginFrame/render/endFrame
Events (native → JS): managers → AREventEmitter → plugin notifyListeners
  → Capacitor → ARCoreNative.addListener (index.js bridge) → ARCore.on() subs
Hit test: JS hitTest({x,y}) → plugin → sessionManager.acquireLatestFrame()
  → ARCoordinateMapper.screenToWorldHitTest (pixels → frame.hitTest)
```

### 3.2 JS → Three.js → WebXR (browser and all high-level APIs)

```
App ── createARView({overlay}) ──► ARView ──► ARCoreWeb (web.js)
ARView.create() ─► engine.setConfig() + engine.startSession({domOverlay})
  initThreeJS() (once): WebGLRenderer (antialias, alpha, pixelRatio ≤ 1.5,
    ACES tone mapping), Scene, PerspectiveCamera(70°, 0.01–100),
    4 lights, GLTFLoader, plane groups, reticle
  navigator.xr.requestSession('immersive-ar', {
    requiredFeatures: ['hit-test'],
    optionalFeatures: ['plane-detection'?, 'light-estimation'?,
                       'camera-access'? (only with enableScreenshots), 'local-floor'?, 'dom-overlay'?] })
  renderer.xr.setSession(); reference spaces 'local-floor' + 'viewer';
  hitTestSource from viewer space
Render loop: renderer.setAnimationLoop((t, frame) => …)
  every 8th frame: processDetectedPlanes(frame) (XRPlane polygons → meshes/dots)
  per frame: viewer hit test → reticle pose + surfaceState + frameListeners
  updateModelPositions(frame) (anchor map → model/shadow transforms)
  renderer.render(scene, camera); pending screenshot capture if queued
Models: GLTFLoader.load(url) → modelCache (full gltf) → scene.clone() per
  placement → materials cloned per instance → blob shadow plane per anchor
Gestures: DOM Pointer Events on overlay ─► ARView callbacks ─► engine
  transformModel / placeModel
```

---

## 4. Lifecycle

### WebXR path
- **Create:** `ARView.create()` → `engine.startSession()`. Three.js objects
  are created once (`initThreeJS` guarded by `if (!this.renderer)`) and
  **reused across sessions**; the renderer canvas is (re)inserted before the
  overlay element or appended to `document.body`.
- **Session end (user/system):** the XR `end` event fires engine listeners
  (`sessionEnded` to frame listeners), stops the animation loop and nulls
  session/hit-test/reference-space fields — but does **not** remove models
  or the canvas (that only happens in `stopSession()`).
- **Teardown:** `ARView.destroy()` → gesture destroy + `engine.stopSession()`:
  stops rendering, removes models/shadows/rings from the scene and clears
  the maps, disposes plane **meshes** (dots are removed but not disposed —
  AUDIT LEAK-02), hides the reticle, `await session.end()`, clears anchors,
  removes the canvas from the DOM. The renderer/scene/camera themselves are
  never disposed.
- **React:** `useARCore` checks support on mount; on unmount it calls
  `engine.stopSession()` if its `sessionRef` is set and runs listener
  cleanups. Consumers of the shared default engine still stop each
  other's session on unmount; `useARCore({ engine })` consumers are
  instance-scoped and unaffected (API-04).
  The example's `ARPlayground` instead creates one `ARView` per mount and
  destroys it in the effect cleanup.

### Native path
- **Create:** plugin `load()` constructs all managers once (Filament engine
  created in the `ARRenderer` constructor). `startSession` → permission →
  session → view attach (see 3.1).
- **Pause/resume:** `ARSessionManager.pauseSession()/resumeSession()` and
  `ARRenderer.onActivityPaused()/onActivityResumed()` exist but **nothing
  calls them** — the plugin overrides no Capacitor lifecycle hooks
  (AUDIT NAT-02).
- **Teardown:** `stopSession` (UI thread): clear models/anchors →
  `renderer.onSessionClosed()` → `viewManager.removeARView()` (restores
  WebView state) → `sessionManager.closeSession()`. The Filament engine,
  renderer, scene and `ARCoreTextureBackground` are never destroyed
  (AUDIT LEAK-05).

---

## 5. Dependencies and build tooling (exact, from package.json)

A root `package-lock.json` is committed (SEC-02), so the library's own
install is reproducible; the example resolves from its own ranges.

### Library (`package.json`, name `reticlexr`, version `1.0.0`)

| Kind | Package | Version |
|---|---|---|
| peerDependency | `@capacitor/core` | `^8.5.2` |
| peerDependency | `three` | `^0.180.0` |
| peerDependency | `react` | `>=16.8.0` |
| devDependency | `@capacitor/core`, `three`, `react`, `react-dom` | for local development + hook verification |
| dependencies | — | **none** (peers only — the host app owns the single copies) |
| scripts | — | `check-types` (`tsc --checkJs` over the JSDoc); `test` → `node --test` |
| entry | `main` / `module` | both `src/index.js`; `type: module`; `exports` map with `types` per entry; `sideEffects: ["./src/index.js"]` |
| `capacitor` | | `{ "android": { "src": "android" } }` — Capacitor discovers the Android plugin (verified via scratch `cap sync`) |
| `files` | | `["android/", "src/"]` |

### Android (`android/build.gradle`)

| Item | Version |
|---|---|
| ARCore (`com.google.ar:core`) | `1.40.0` |
| Filament (`filament-android`, `gltfio-android`) | `1.52.0` |
| AndroidX AppCompat | `1.6.1` (default; overridable from root project) |
| compileSdk / targetSdk / minSdk | 36 / 36 / 24 (defaults; overridable) |
| Java source/target | 21 |
| JUnit / AndroidX JUnit / Espresso (declared, unused — no test sources) | 4.13.2 / 1.1.5 / 3.5.1 |

### Example (`example/package.json`)

`@capacitor/android 8.5.2`, `@capacitor/app 8.1.1`, `@capacitor/core 8.5.2`,
`@capacitor/cli 8.5.2` (dev), `react ^18.2.0`, `react-dom ^18.2.0`,
`three ^0.180.0`, `vite 5.4.14`, `@vitejs/plugin-react 4.3.4`,
`capacitor-arcore: file:..`. Its `preinstall` script installs the parent
package's dependencies first (required because Vite resolves the plugin's
real source path).

### CI (`.github/workflows/ci.yml`)

On push/PR to `main`, Node 22: `npm install` (root) → `node --check` on the
five `src/*.js` files → example `npm install --ignore-scripts` →
example `npm run build`. No tests, no lint, no Android build.

### Measured bundle (this audit, in a scratch copy)

Example production build (Vite 5.4.14): a single JS chunk of
**773.55 kB minified / 210.74 kB gzip**, CSS 9.59 kB — Vite warns the chunk
exceeds 500 kB; there is no code-splitting. Library source itself is
95,691 B unminified across 5 files, of which `web.js` is 54,261 B.
