# Audit — capacitor-arcore (arcore-react) v1.0.0

> **Rename note (2026-11-16):** this audit was written when the
> package was named `capacitor-arcore` (repository `arcore-react`).
> The package has since been renamed to **reticlexr** — before its
> first publish; `capacitor-arcore` was never published and is
> deprecated as a name (see CHANGELOG.md). The findings below keep
> the original name: they record the code as it was audited.

> Scope: `src/`, `android/`, `example/` (JS side), `docs/`, `package.json`,
> CI, README/CHANGELOG/CONTRIBUTING. Branch `docs/vercel-site`, head
> `c6241b3`. Library source was **not** modified. Every finding is grounded
> in code read during the audit; line numbers are from that head.
> Items that could not be verified in this environment are marked **TODO**
> rather than asserted.
>
> Severity: **critical** = feature broken or claim false in normal use;
> **high** = broken behaviour, leak, or crash on a common path;
> **medium** = wrong behaviour in edge cases, significant perf/robustness
> cost; **low** = polish, consistency, minor risk.
>
> Counts: **3 critical, 18 high, 26 medium, 21 low** (68 rated findings,
> plus 3 TODO items where verification was impossible in this environment).

---

## 1. Bugs and logic errors

### BUG-01 — high — Hook `placeModel` argument shapes contradict the engine
`src/hooks.js:406` (and its JSDoc) documents `position`, `rotation` and
`scale` as `{x, y, z}` objects and passes them straight to the engine.
`src/web.js` `placeModel` (line 1174) treats them as arrays
(`model.position.set(position[0], …)`). A caller following the hook's own
docs gets `undefined` components → `NaN` transforms → the model never
appears, with no error.
**Fix:** normalise objects→arrays in the hook (or accept both in the
engine) and correct the JSDoc.

### BUG-02 — high — Hook plane counts are always zero (event shape mismatch)
`src/hooks.js:277–286` reads `data.horizontalPlanes?.length`,
`data.verticalPlanes?.length`, `data.planes?.length`. The engine emits
counts as **numbers**: `{type:'planesUpdated', total, horizontal,
vertical}` (`src/web.js:487`). Every field falls back to `0`, so
`useARCore().detectedPlanes` never changes.
**Fix:** read the numeric fields in the hook (one-line change).

### BUG-03 — high — WebXR `hitTest({x, y})` ignores its coordinates
`src/web.js:1050`. The parameters are destructured and never used: the
implementation returns the cached centre-screen hit (viewer-space hit-test
source) or races one animation frame for the same centre hit. Everything
built on it inherits the behaviour — `ARView.placeModel(url, {x, y})` and
the web `moveModel` shim cannot actually target a tap point.
**Fix:** implement ray-based hit testing from camera pose + NDC coords, or
remove `x/y` from the documented contract and state "centre only".

### BUG-04 — medium — Reticle visibility setting is silently overridden
`src/web.js:750` (`startSession` reset), `:1226` (`placeModel`), `:1268`
(`removeModel`) all force `this.config.showReticle = true`. A consumer who
configures `showReticle: false` (via `ARView.create` or `setReticleVisible`)
loses the setting on the next session/placement.
**Fix:** delete the forced resets; track "user preference" separately from
transient state.

### BUG-05 — medium — `enableCustomization` tap handler can throw / reject unhandled
`src/ar-view.js:120` calls `options.modelUrl()` unconditionally — pass a
plain string (the name invites it; only `docs/API.md`'s example shows the
function form) and every tap throws `TypeError`. The same handler starts
`this.placeModel(...)` without `await`/`.catch`, so a model-load failure is
an unhandled promise rejection.
**Fix:** accept `string | (() => string)`; catch placement errors and route
them to `options.onError`/the caller's `onTap` chain.

### BUG-06 — medium — Repeated `startSession` on the hook duplicates listeners and races sessions
`src/hooks.js:207` registers a new frame listener and plane listener on
every call and appends them to `cleanupRef`; nothing removes the previous
pair until `stopSession`. Two `startSession()` calls (easy in React with
double-invoked handlers) also race two `navigator.xr.requestSession()`
calls on the shared engine with no in-flight guard.
**Fix:** guard re-entry (`if starting/active return`), register listeners
once per session, and remove them in `stopSession` per-registration.

### BUG-07 — medium — Failed `startSession` after `requestSession` leaks the live XR session
`src/web.js:665–760`. If `requestReferenceSpace('local-floor')` or
`requestHitTestSource` rejects after the session was created, the `catch`
rethrows but never calls `session.end()`; the session, camera and render
loop state are left live while the caller believes startup failed.
**Fix:** in the catch, `await this.session?.end().catch(() => {})` and null
the session fields before rethrowing.

### BUG-08 — medium — Fallback `hitTest` promise can never settle
`src/web.js:1111`. When there is no cached hit, `hitTest` resolves from a
single `session.requestAnimationFrame` callback. If the session ends first
(user exits AR), the callback never fires and the awaiting caller hangs
forever.
**Fix:** also resolve `{hit:false, error:'SESSION_ENDED'}` from the
session `end` listener, or race a timeout.

### BUG-09 — medium — `switchModel` material preservation flattens multi-material models
`src/web.js:1380`. With `preserveMaterial` (the default), the **first**
material found on the old model has its colour/map copied onto **every**
material of the new model. A two-material product (e.g. fabric + wood legs)
comes back uniformly coloured/textured — contradicting the "state carries
over" promise for anything but single-material models.
**Fix:** match materials by name/index, or document the single-material
limitation and default `preserveMaterial` to colour-only.

### BUG-10 — low — Gesture controller treats `pointercancel` as a completed tap
`src/gestures.js:63,77`. `pointercancel` is routed to the same `up` handler,
so an interrupted touch (system gesture, notification) that happens to be
short and stationary still fires `onTap` and can place a model.
**Fix:** give cancel its own handler that clears state without firing tap.

### BUG-11 — low — `ARView` transform state can diverge from the engine
`src/ar-view.js` `setScale`/`rotateBy` mutate `this.transform` **before**
awaiting the engine call; if the engine throws (anchor gone), the facade's
scale/rotation no longer matches the scene, and subsequent pinch/rotate
operations compound the wrong base value.
**Fix:** commit local state only after the engine call resolves.

### BUG-12 — low — `ARView.placeModel` with an explicit `position` silently reuses the last hit rotation
`src/ar-view.js:44–49`. When `options.position` is supplied without
`rotation`, the engine default becomes `lastHitRotation` from an unrelated
earlier hit instead of identity — models can appear unexpectedly rotated.
**Fix:** default to identity quaternion when no hit was involved.

---

## 2. Memory leaks

### LEAK-01 — high — Removed models are never disposed (WebXR)
`src/web.js:1246` `removeModel` only calls `scene.remove(model)`. The
geometries, the per-instance **cloned materials** (cloned at
`src/web.js:1202`), and any applied textures stay on the GPU. Repeated
place/remove cycles (a product carousel) grow GPU memory until the tab is
killed.
**Fix:** traverse and `dispose()` geometry/materials/textures on removal;
share — don't clone — materials unless a per-instance override exists.

### LEAK-02 — high — Plane-dot visualisations are removed but never disposed
`src/web.js:394, 444, 1023`. Plane meshes get `geometry.dispose()` +
`material.dispose()`; the **dots groups get only `group.remove(...)`**.
Each dot is its own `Mesh` with a `material.clone()` (`src/web.js:338`), so
every plane update leaks one shared geometry reference set and one material
per dot, per plane, per change.
**Fix:** traverse dots groups disposing geometry/materials before removal
(and see PERF-01 — the per-dot mesh design is the root cause).

### LEAK-03 — medium — `stopSession` clears maps without disposing; renderer is immortal
`src/web.js:1004`. Models/shadows/rings are removed from the scene and the
maps cleared, but nothing is disposed, and the `WebGLRenderer`, scene,
camera and GL context are never released (`renderer.dispose()` /
`forceContextLoss()` are never called anywhere). `ARView.destroy()` → start
→ destroy cycles accumulate GPU resources.
**Fix:** dispose placed-model resources in `stopSession`; add a real
`engine.dispose()` used by `ARView.destroy()`.

### LEAK-04 — medium — Model cache is unbounded and textures are never released
`src/web.js:1150` — every URL ever loaded is kept in `modelCache` (full
parsed GLTF) for the life of the page, with no eviction API. Separately,
`setModelTexture` (`src/web.js:1417`) assigns a new texture to materials
without disposing the previous one, so repeated texture customisation leaks
one GPU texture per call.
**Fix:** add `clearModelCache()`/LRU cap; dispose the replaced texture in
`setModelTexture`.

### LEAK-05 — high — Native Filament engine and camera background are never destroyed
`android/.../render/ARRenderer.java` creates the Filament `Engine` in its
constructor; no code path destroys the engine, renderer, scene, view or
camera entity, and `ARCoreTextureBackground.destroy()`
(`render/ARCoreTextureBackground.java:523`) has **zero callers** (verified
by search). `ARCorePlugin` overrides no `handleOnDestroy`. The engine leaks
for the process lifetime and is recreated per plugin load.
**Fix:** implement `handleOnDestroy` → stop loop → destroy background,
swap chain, view/scene/renderer/engine in Filament's required order.

### LEAK-06 — medium — Native plane registry grows without bound
`android/.../surface/ARSurfaceManager.java` `updatePlanes()` only ever
adds to `trackedPlanes`; planes that stop tracking or are subsumed are
never removed, so the map (and stale `Plane` handles) grows for the whole
session.
**Fix:** prune entries whose tracking state is `STOPPED` or that are no
longer in the frame's updated trackables.

### LEAK-07 — low — Shadow planes leak on model switch
`src/web.js:1380` `switchModel` removes the old shadow from the scene
without disposing its `CircleGeometry`/`ShaderMaterial` (same pattern as
LEAK-01, smaller scale).
**Fix:** dispose in the same traversal as the model fix.

---

## 3. Performance

### PERF-01 — high — One mesh + one cloned material per plane dot
`src/web.js:317–352` (`createPlaneDots`). Dots are individual `THREE.Mesh`
objects, each with `dotMaterial.clone()`. At the facade default
`dotSpacing: 0.14`, a 3 m × 3 m floor plane yields ~460 dots = ~460 extra
draw calls, re-created on every plane change. This is the single largest
per-frame cost in the WebXR path.
**Fix:** one `InstancedMesh` (or merged `BufferGeometry`) per plane with a
single shared material.

### PERF-02 — medium — Per-frame allocations and a React re-render per frame
The render loop (`src/web.js` `startRendering`) builds a fresh
`surfaceState` object and fresh listener payloads **every frame** and calls
every frame listener; `useARCore` turns each `surfaceDetected` payload into
`setSurfaceState` (`src/hooks.js:216`), i.e. a React render at display
refresh rate for the whole session.
**Fix:** throttle surface-state notifications (e.g. only on change or
≤10 Hz), reuse payload objects, and document that `onFrame` is hot.

### PERF-03 — medium — Example bundle is a single 774 kB chunk; no code-splitting
Measured in this audit (scratch copy, Vite 5.4.14 production build):
`index-*.js` = **773.55 kB minified / 210.74 kB gzip**, CSS 9.59 kB; Vite
warns the chunk exceeds 500 kB. Three.js is imported wholesale
(`import * as THREE`) and the AR code is in the entry chunk, so even the
non-AR landing UI pays the full cost.
**Fix:** lazy-`import()` the AR module behind the "Start AR" interaction;
manual chunks for three.

### PERF-04 — low — Plane pose updates allocate a `Matrix4` per plane per change
`src/web.js` `processDetectedPlanes` "pose-only" branch allocates
`new THREE.Matrix4()` per plane. Minor next to PERF-01/02 but free to fix
with a scratch matrix.

### PERF-05 — low — Screenshot composition is a per-pixel JS loop
`src/web.js` `_composeScreenshot` iterates `width × height` pixels in JS
(~2M iterations at 1080p) on the main thread, per capture. Acceptable for
an explicit user action; expect a visible hitch. A GPU/canvas
`drawImage` composite would avoid it.

### PERF-06 — low — Production `console.log` in hot paths
The render loop and plane processing log to console (throttled but
unconditional), and `loadModel` logs every progress chunk. Strip or gate
behind a `debug` config flag.

---

## 4. Native Android

### NAT-01 — critical — Native `placeModel` never renders a model
`android/.../model/ARModelManager.java` is a metadata registry: it stores
id/path/scale/rotation/colour in a `HashMap` and returns an id. Its class
doc says GLB loading is "future integration with gltfio". Verified by
search: **no** `gltfio` `AssetLoader`, `RenderableManager` model creation,
or scene attachment exists anywhere in the plugin (the only
`RenderableManager` use is the camera-background quad). The JS call
resolves `{modelId, anchorId}` and emits `modelPlaced` for a model that is
not in the scene and can never be seen.
**Fix (choose one):** implement gltfio loading + renderable attachment, or
explicitly scope the native plugin as session/hit-test only and correct
every public claim (see DOC-01).

### NAT-02 — critical — Activity pause/resume is never wired to the AR session
`ARCorePlugin.java` overrides no Capacitor lifecycle hooks (`handleOnPause`,
`handleOnResume`, `handleOnDestroy` — verified absent). Consequently
`ARSessionManager.pauseSession()/resumeSession()` and
`ARRenderer.onActivityPaused()/onActivityResumed()` have **no callers**
(verified by search). ARCore requires `Session.pause()` when the activity
pauses; as shipped, the camera and render loop keep running while the app
is backgrounded, and resume behaviour is undefined.
**Fix:** override the three hooks and forward to session manager + renderer.

### NAT-03 — high — `requestInstall` is called with an application Context cast to `Activity`
`ARSessionManager.java:89–91` does
`ArCoreApk.getInstance().requestInstall((android.app.Activity) context, …)`,
but the manager is constructed with the plugin's `getContext()`
(`ARCorePlugin.java:81`), which is the **application** context, not an
Activity → `ClassCastException` whenever the install path is taken, caught
by the generic handler and surfaced as `SESSION_CREATE_FAILED`.
**Fix:** pass `getActivity()` from the plugin into `createSession` (or store
an Activity reference) and use it for `requestInstall`.

### NAT-04 — high — Native anchors are fictional; `hitId` is accepted and ignored
`ARCorePlugin.java:374` hardcodes `String anchorId = "anchor_center"` for
every placement; the documented `hitId` parameter is read and never used;
`ARAnchorManager.registerAnchor()` has **no callers** (verified), so no
real ARCore `Anchor` is ever created from a hit result. All models share
one id, transforms/moves cannot target a real anchor pose, and anchors are
never detached because none exist.
**Fix:** create the anchor from the `HitResult` in `hitTest`/`placeModel`,
register it, and return its real id.

### NAT-05 — high — Native `moveModel` reports success without moving anything
`ARCorePlugin.java:516`. The method hit-tests, then resolves
`{success:true, position}` and emits `modelMoved`; the in-code comment
lists the four steps a real implementation needs, none of which are done.
The model's stored pose never changes.
**Fix:** implement via NAT-04 anchors, or reject with
`NOT_IMPLEMENTED` instead of resolving success.

### NAT-06 — high — Native `checkSupport` is hardcoded to `true`
`ARCorePlugin.java:143–150` resolves `{supported:true, reason:"ARCore
supported"}` unconditionally — it never calls
`ArCoreApk.checkAvailability()` (which `ARSessionManager` does use later).
Consumers gating UI on `ARCore.checkSupport()` will offer AR on
unsupported devices and fail later at `startSession`.
**Fix:** delegate to the same availability check used at session creation.

### NAT-07 — high — `Session.update()` is driven from two threads
`ARSessionManager.acquireLatestFrame()` (the sole `Session.update()` call)
is invoked by the render loop **and** directly by `ARCorePlugin.hitTest`
(`ARCorePlugin.java:287`) and `moveModel`, which run on the Capacitor
bridge thread. ARCore frames are a single-consumer, once-per-frame
resource; a bridge-thread `update()` steals/desynchronises the frame the
renderer is using and can throw `CameraNotAvailableException` (which
`acquireLatestFrame` converts to a `RuntimeException`).
**Fix:** cache the latest frame in the render loop (with its timestamp)
and serve plugin hit tests from that snapshot; never call `update()`
outside the loop.

### NAT-08 — medium — The native render loop can never restart after a stop
`ARRenderer.java:282` `stopRenderLoop()` sets `isPaused = true`, and
`onSessionClosed()` calls it. The only place `isPaused` is cleared is
`onActivityResumed()` (`:184`) — which nothing calls (NAT-02).
`startRenderLoopIfReady()` (`:264`) requires `!isPaused`, so a second
`startSession` in the same app run produces a session with no rendering.
**Fix:** reset `isPaused` in `onSessionReady()`/`onSessionClosed()`
appropriately and wire NAT-02.

### NAT-09 — medium — Transient-availability retry is an unbounded loop
`ARSessionManager.java:77–81`: when availability `isTransient()`,
`createSession` re-posts itself every 200 ms with no attempt cap and no
cancellation token; `stopSession` cannot stop a pending retry, which can
later create a session the user already cancelled.
**Fix:** cap retries (e.g. 25 ≈ 5 s), store the `Handler`/`Runnable`, and
cancel in `closeSession()`.

### NAT-10 — medium — Filament engine is created at plugin load; failure leaves a poisoned renderer
`ARCorePlugin.load()` constructs `ARRenderer`, whose constructor runs
`Engine.create()`. If that throws, the exception is only logged and
`filamentEngine` stays null; `setupARRendering` later passes
`renderer.getFilamentEngine()` (null) into `ARModelManager`, deferring the
crash. AR also pays engine startup cost in apps that never open AR.
**Fix:** lazy-init the renderer on first `startSession`; fail the call
cleanly if the engine is unavailable.

### NAT-11 — low — WebView "state capture" doesn't capture the background
`ARViewManager.java` `WebViewState.capture()` hardcodes
`backgroundColor = Color.TRANSPARENT` instead of reading the WebView's
actual background, so `restoreWebView()` forces a transparent background
on hosts whose WebView was opaque.
**Fix:** capture the background drawable/colour where possible, or document
the transparent-restore behaviour as a host requirement.

### NAT-12 — low — Library manifest forces AR-required onto every host app
`android/src/main/AndroidManifest.xml` declares
`uses-feature android.hardware.camera.ar` with `required="true"` and
meta-data `com.google.ar.core = "required"`. Merged into a consumer app,
this makes the **host app** uninstallable on non-AR devices and
AR-mandatory in store listings — far beyond what a library should impose.
**Fix:** ship `required="false"` (and document how hosts that want
AR-required can opt in).

### NAT-13 — low — Hit-test pixel mapping uses display metrics captured once at load
`ARCoordinateMapper.initialize()` snapshots `DisplayMetrics` during plugin
`load()` (`ARCorePlugin.java:96`). Rotation is handled by ARCore's own
display-rotation machinery, but foldables/multi-window/resolution changes
leave the mapper with stale dimensions.
**Fix:** refresh metrics on surface change or per hit test from the
current display.

---

## 5. API design

### API-01 — high — Two model-identity systems and two `placeModel` shapes in one package
The native facade uses `modelId` + `{modelPath}`; the WebXR engine uses
`anchorId` + `{modelUrl}`; `ARView` returns `modelId` that is actually the
anchor id. `ARCoreWeb` carries a shim layer to paper over it. Consumers
must know which runtime they are on to call the "same" API — the opposite
of the package's one-API promise.
**Fix:** pick one identifier name and one option shape; keep the shim as a
deprecated alias.

### API-02 — high — Importing the package requires React and runs side effects
`src/index.js` re-exports `hooks.js`, which imports `react` at module top
level. `react` is only a **peer** dependency, so a non-React Capacitor app
(or plain JS consumer) cannot even `import 'capacitor-arcore'` without
React installed. Separately, `setupEventBridge()` executes at import time
(`src/index.js:260`), registering 12 native listeners as a side effect —
hostile to SSR, tests and tree-shaking (`sideEffects` is not declared).
**Fix:** move the hook to a `capacitor-arcore/react` subpath export; make
the bridge setup lazy/idempotent; add an `exports` map with
`sideEffects: false` where safe.

### API-03 — medium — No way to enumerate or clear placed models at the facade level
`ARView` tracks exactly one active model: `removeModel()` removes only
that one, there is no `getPlacedModels()`/`clearModels()`, and models
placed via repeated `placeModel()` calls (see DOC-02) become unreachable
orphans that can never be removed through the facade. The `ARCore` native
facade likewise has no clear-all.
**Fix:** track placed anchors in `ARView`, expose list + `clearModels()`.

### API-04 — medium — `useARCore` shares one module-level engine across all components
`src/hooks.js:41`: `const arCore = new ARCoreWeb()`. Every hook consumer
shares one session and one scene; when any one consumer unmounts, its
cleanup stops the session for all of them.
**Fix:** create the engine per hook instance (ref) or document and enforce
a single-consumer rule with a provider component.

### API-05 — medium — Four different error conventions
Native facade: throws wrapped `Error`s. Engine `hitTest`: resolves
`{hit:false, error}`. `ARView.placeModel`: resolves
`{success:false, reason}`. Hook: sets `error` state and returns `{error}`.
Native plugin `hitTest`: resolves with an `error` field, while other
plugin methods reject. Only screenshots use error `code`s. Consumers cannot
write one error-handling path.
**Fix:** adopt one convention (reject with coded errors is the Capacitor
norm) and document it.

### API-06 — medium — No types, and several JSDoc contracts are wrong
There is no `types` entry and no `.d.ts` in the repo (verified); the
library is plain JS with JSDoc that already disagrees with the code in
places (BUG-01, BUG-02's sibling docs in `hooks.js` `hitTest`/`placeModel`
describe `{x,y,z}` object results the engine never returns). TypeScript
consumers — the Capacitor/React mainstream — get no checking at all.
**Fix:** add hand-written `.d.ts` (small surface) or convert `src/` to TS;
add a CI step that type-checks the JSDoc (`tsc --checkJs`) to stop drift.

### API-07 — low — Undocumented engine events; facade event list doesn't match either runtime
The engine emits `modelSwitched` and `sessionEnded` frame events (the
example depends on `sessionEnded`), neither documented; the native
facade's documented list (index.js) includes events the web implementation
of the same plugin name never emits through `ARCore.on` (e.g.
`surfaceUpdated` exists only natively). Event documentation should be per
runtime until the surfaces are unified (API-01).

### API-08 — low — Scale limits differ silently across layers
`ARView.setScale` clamps to [0.1, 5] (`src/ar-view.js`); the engine accepts
any scale; native `ARModelManager.setTransform` clamps to [0.25, 3]. The
same gesture produces different results per runtime/layer, undocumented.
**Fix:** one documented clamp, applied in one place.

---

## 6. Compatibility and robustness

### COMPAT-01 — medium — `local-floor` is a hard requirement with no fallback
`src/web.js:686`: `requiredFeatures: ['local-floor', 'hit-test']`, and the
reference space is then requested as `'local-floor'` unguarded. Devices/
browsers that support immersive-AR + hit-test but not `local-floor` fail
session creation entirely instead of degrading to `'local'`/`'viewer'`.
**Fix:** try `local-floor`, fall back to `local`, then `viewer`, and move
`local-floor` to optional features.

### COMPAT-02 — medium — No secure-context signal in support detection
`checkSupport` (web.js:103 and hooks) reports only "immersive-ar not
supported" on insecure origins, sending developers down the wrong debug
path; the HTTPS requirement is real (README/docs cover it) but the API
never distinguishes it. `window.isSecureContext` is checked only by the
example UI, not the library.
**Fix:** return a distinct `reason`/`code` when `!window.isSecureContext`.

### COMPAT-03 — TODO — SSR safety is unverified
`src/hooks.js:41` constructs an `ARCoreWeb` at module scope and
`src/index.js:260` touches the Capacitor bridge at import time. Neither
obviously touches `window`/`document` at import (the engine constructor
only builds a `THREE.TextureLoader`), but no SSR framework render was
exercised in this audit.
**TODO:** verify `import { createARView } from 'capacitor-arcore'` and a
`useARCore` page under Next.js SSR/prerender before claiming SSR safety in
docs; guard module-scope construction if it breaks.

### COMPAT-04 — low — React StrictMode double-mount creates throwaway engines
Under StrictMode dev double-effects, the example's pattern (construct
`ARView` in an effect, destroy in cleanup) builds two `ARCoreWeb`
instances and two Three.js renderers; only the second survives, and the
first is never GPU-disposed (LEAK-03). Production is unaffected; dev
machines pay double renderer startup.
**Fix:** document the pattern as dev-only noise once LEAK-03 is fixed, or
share one engine per overlay element.

### COMPAT-05 — low — The example's unsupported-browser component is dead code
`example/src/components/BrowserUnsupported.jsx` is never imported
(verified); `ARPlayground` shows one line of small text instead. The
library itself provides no unsupported-device UI or message contract
beyond `checkSupport().reason`.
**Fix:** wire the component into the example (it's the demo's job to model
the fallback) — no library change needed.

### COMPAT-06 — TODO — Compatibility matrix values are unverified
Nothing in the repo records tested browsers, Chrome versions, Android
versions or devices. `package.json`/README state no minimums beyond
Android `minSdk 24` (build.gradle) and the ARCore dependency itself.
**TODO:** fill the docs compatibility matrix from real device testing;
until then it must ship as TODO, not as implied support.

---

## 7. Security and supply chain

### SEC-01 — TODO — `npm audit` could not be executed in this environment
`npm audit` was attempted for both the root package and `example/` in a
scratch copy; the managed registry proxy rejects the audit endpoint
(`403 policy_denied` on `/-/npm/v1/security/audits/quick`), so **no
vulnerability counts can be honestly reported here**.
**TODO (run where registry audit is reachable):**
`npm audit` in repo root and in `example/`, and record counts by severity
in this file.

### SEC-02 — medium — No lockfile anywhere; CI installs floating ranges
Neither root nor `example/` commits a `package-lock.json` (verified), and
CI runs `npm install` (not `npm ci`). Every install resolves fresh —
non-reproducible builds and silent supply-chain drift for a package whose
whole dependency tree is two direct deps plus transitive trees of `three`
and `@capacitor/core`.
**Fix:** commit lockfiles; use `npm ci` in CI.

### SEC-03 — low — Model and texture URLs are loaded with no validation
`GLTFLoader.load(modelUrl)` and `TextureLoader.loadAsync(textureUrl)`
accept any URL the app passes — expected for an SDK, but nothing in the
docs warns that URLs must be app-controlled, that GLB parsing of untrusted
files happens in the page's origin, or that cross-origin models need CORS.
**Fix:** one docs paragraph + an optional `validateModelUrl` hook is
enough at this layer.

### SEC-04 — low — `lightEstimation: true` silently also requests raw camera access
`src/web.js` `startSession`: enabling `lightEstimation` adds both
`light-estimation` **and** `camera-access` to the session's optional
features (the latter exists to power screenshots). Users who enable light
estimation get a materially larger permission surface than the option
name implies, undocumented anywhere.
**Fix:** gate `camera-access` behind its own option (e.g.
`enableScreenshots`) and document it.

---

## 8. Packaging

### PKG-01 — high — No `capacitor` section in package.json; consumer `cap sync` discovery is not backed by metadata
`package.json` contains no `"capacitor": { "android": { "src": "android" } }`
pointer (verified absent). The example works only because
`example/android/settings.gradle` hand-includes the plugin
(`project(':capacitor-arcore').projectDir = new File(rootDir,
'../../android')`) — i.e. the documented consumer flow in the README
(`npm install capacitor-arcore` + `npx cap sync`) was never exercised by
the repo's own example.
**Fix:** add the `capacitor` key, then verify a clean scratch Capacitor
app end-to-end (TODO until run).

### PKG-02 — high — No type declarations ship with the package
No `types` field, no `.d.ts` (see API-06). For a React/Capacitor library
this is a first-order packaging gap.
**Fix:** ship declarations (hand-written is fine at this surface size).

### PKG-03 — medium — ESM sources in a package that doesn't declare ESM
Sources use `import`/`export` throughout, but `package.json` has no
`"type": "module"` and no `exports` map; `main` and `module` both point at
raw `src/index.js`. Bundlers cope; Node's own ESM loader resolves `.js` by
package type and will treat the entry as CommonJS. Compounding it,
`src/index.js:36` uses an **extensionless** dynamic import
(`import('./web')`) where every other import in the codebase carries
`.js` — strict ESM resolvers reject it.
**Fix:** add `type: module` + an `exports` map; fix the import to
`./web.js`.

### PKG-04 — medium — `three` and `@capacitor/core` are hard dependencies, not peers
Capacitor plugin convention (and duplicate-avoidance) puts
`@capacitor/core` in `peerDependencies`; `three` as a hard dep means apps
that also use three can end up with two copies — wasted bundle and a
class-identity hazard across the GLTF pipeline. The example itself
declares `three` separately and relies on resolution luck (see
`docs/INSTALLATION.md`'s preinstall workaround).
**Fix:** move both to `peerDependencies` (keep dev-deps for local work)
and document required ranges.

### PKG-05 — low — npm page will ship a README whose relative doc links don't resolve
`files` is `["android/", "src/"]`, so `docs/` isn't in the tarball; the
README's links to `docs/API.md` etc. work on GitHub but not from the npm
package page.
**Fix:** use absolute GitHub URLs for doc links in the README, or include
`docs/` in `files`.

---

## 9. Tests and CI

### TEST-01 — high — There are no automated tests for the library at all
Verified: no test files under `src/`; `android/src/` contains only `main`
(no `test/` or `androidTest/` source sets) despite JUnit/Espresso
dependencies being declared in `android/build.gradle`; the only test
classes in the repo are the Capacitor template stubs in the example app
(`ExampleUnitTest`, `ExampleInstrumentedTest`), which test nothing about
this package. Gesture math, coordinate mapping, transform clamps and event
shapes are all eminently unit-testable and currently unverified.
**Fix:** start with `gestures.js` and `ARCoordinateMapper`-equivalent JS
logic under Vitest/Jest in CI.

### TEST-02 — medium — CI validates syntax and the example build only
`.github/workflows/ci.yml`: `node --check` on the five source files +
example `npm install` + `vite build`. No tests (TEST-01), no lint, no
type check, no Android/Gradle compile of the plugin (so Java errors —
including API drift against ARCore 1.40 / Filament 1.52 — are invisible),
no audit step, and it triggers only on `main`.
**Fix:** add a Gradle `:capacitor-arcore:assembleDebug` job (in the
example's Android project), a test job once tests exist, and run on the
docs branch too during development.

### TEST-03 — low — Vestigial TypeScript config in the example
`example/tsconfig.json` declares strict TS with declarations over
`src/**/*`, but the example is entirely JSX and nothing runs `tsc`. It
implies a type-safety net that doesn't exist.
**Fix:** delete it or wire `tsc --noEmit` into the example build.

---

## 10. Documentation vs reality (cross-check)

### DOC-01 — critical — README presents the native Android runtime as feature-complete; it cannot display a model
README: "Two runtimes, one API", "Ship on Android — Write a separate
native ARCore integration → Same JS API through Capacitor", feature list
including tap-to-place and runtime styling without runtime qualification;
CHANGELOG 1.0.0 likewise lists "WebXR and Android ARCore integration
layers" as shipped. Against NAT-01/NAT-05/NAT-06: on Android today the
session, hit test and events exist, but **models are never rendered,
moveModel is a no-op, and checkSupport always says yes**.
**Fix:** qualify every Android claim in README/CHANGELOG until NAT-01 is
implemented, or implement it.

### DOC-02 — high — README says `placeModel` switching "keeps placement, scale and rotation" — it doesn't
README API table (`ar.placeModel(url)` — "switching keeps placement,
scale and rotation") and the React example's `switchTo()` (which calls
`placeModel` with the comment "placement, scale, rotation carry over").
`ARView.placeModel` always performs a fresh centre hit test, creates a
**new** anchor/model, and never removes the previous one (which then
leaks, LEAK-01, and becomes unreachable, API-03). Only `switchModel()`
preserves placement/transform.
**Fix:** correct the table and the example to use `switchModel`.

### DOC-03 — medium — `docs/API.md` documents only the facade, and only part of it
Missing entirely: the `ARCore` native facade, `useARCore`, the gesture
controller options/payloads, engine-level methods (`setModelMaterial`,
shadow config, plane visualisation, `onFrame`/`onPlanes`, `getSurface`),
error shapes, and the screenshot failure codes. Developers must read
source for most of the real surface (ARCHITECTURE.md §2 is the verified
inventory to build from).

### DOC-04 — medium — `docs/INSTALLATION.md` doesn't install the library
It documents running the **example** (`cd example && npm install`), not
adding the package to a consumer Capacitor app — the exact flow PKG-01
shows is unverified. Consumer installation guidance exists only as three
lines in the README.

### DOC-05 — low — Screenshot capability is stated without its browser caveat
README lists "AR screenshots: capture what the user sees" as a feature.
`takeScreenshot` returns `CAMERA_CAPTURE_UNAVAILABLE` on any browser
without WebXR camera access (the code handles this gracefully; the README
doesn't mention it).
**Fix:** one-line caveat in README + API docs.

### DOC-06 — low — Example ships a plugin config key the plugin never reads
`example/capacitor.config.json` sets `plugins.ARCore.startOnLoad: false`.
No code in `ARCorePlugin` reads plugin configuration at all, so the key
implies a feature that doesn't exist.
**Fix:** remove the key or implement config reading.

### DOC-07 — low — README compatibility table has no versions, and the repo knows it
The Compatibility section lists platforms with no minimum versions (the
file itself carries a TODO comment for Capacitor/React/Android/browser
minimums). Until COMPAT-06 is resolved this table should be labelled as
unverified rather than presented as a support matrix.

---

## Prioritized roadmap

### Quick wins (hours, low risk)
1. **BUG-02** — hook reads numeric plane counts (one line).
2. **BUG-04** — delete the three forced `showReticle = true` resets.
3. **DOC-02** — README table + React example: `switchModel`, not
   `placeModel`, for switching.
4. **NAT-06** — native `checkSupport` delegates to `ArCoreApk.checkAvailability`.
5. **NAT-03** — pass the Activity (not app Context) to `requestInstall`.
6. **NAT-02 + NAT-08** — wire `handleOnPause/Resume/Destroy`; reset
   `isPaused` on session ready/closed so the loop can restart.
7. **PKG-03 (partial)** — fix `import('./web')` → `import('./web.js')`.
8. **PKG-01** — add the `capacitor` section to package.json; scratch-app
   verification stays TODO until run.
9. **LEAK-02** — dispose dots on removal (traverse once).
10. **SEC-02** — commit lockfiles; CI switches to `npm ci`.
11. **BUG-10** — separate pointercancel handler.
12. **DOC-05/DOC-06** — screenshot caveat line; delete the dead config key.
13. **COMPAT-02** — distinct insecure-context reason in `checkSupport`.

### Medium efforts (days)
14. **BUG-01 + API-06 + PKG-02** — one pass over the hook/engine contract:
    normalise transform shapes, then hand-write `.d.ts` for the real
    surface and add `tsc --checkJs` to CI to keep JSDoc honest.
15. **BUG-03** — decide the hit-test contract (implement NDC ray hit test
    or document centre-only) and make `ARView`/`moveModel` match it.
16. **LEAK-01/03/04/07** — a single `disposeObject` helper used by
    remove/switch/stop paths, a cache eviction API, and an
    `engine.dispose()`.
17. **PERF-01** — plane dots via `InstancedMesh` (also fixes LEAK-02's
    root cause).
18. **NAT-07** — serve plugin hit tests from the render loop's latest
    frame snapshot; `Session.update()` only on the render thread.
19. **NAT-09 + NAT-10** — bounded availability retry with cancellation;
    lazy Filament init with clean failure.
20. **TEST-01/02** — first unit tests (gestures, hook event mapping) +
    a Gradle assemble job in CI.
21. **API-02** — `capacitor-arcore/react` subpath export; lazy event
    bridge; `exports` map.

### Larger refactors (weeks / decisions first)
22. **NAT-01 decision** — implement real gltfio model rendering natively,
    **or** formally scope native to session+hit-test and strip the claims
    (DOC-01). Everything else in the native track is secondary to this.
23. **NAT-04** — real anchor lifecycle (create from hit results, register,
    detach) once 22 lands.
24. **API-01 + API-05** — unify identifiers (`modelId` everywhere),
    option shapes and one coded-error convention across runtimes, with a
    deprecation shim release.
25. **API-04** — per-instance hook engine (or a provider) instead of the
    module singleton.
26. **PERF-03** — code-split the AR stack behind dynamic import in the
    example and document the pattern for consumers.
27. **TypeScript migration** of `src/` (after 14) so the docs' API
    reference can be generated (TypeDoc) instead of hand-maintained.

---

## Appendix — verification notes

- **Bundle size (PERF-03)** was measured, not estimated: the repo was
  copied to a scratch directory, dependencies installed, and
  `npm run build` run in `example/` (Vite 5.4.14): one JS chunk,
  773.55 kB minified / 210.74 kB gzip.
- **`npm audit` (SEC-01)** was attempted in the same scratch copy for root
  and example; the registry proxy in this environment rejects the audit
  endpoint with `403 policy_denied`. No counts are reported because none
  could be obtained.
- **Native findings are code-verified.** No Android device or emulator was
  available in this environment, so runtime behaviour (e.g. the exact
  failure mode of NAT-03's cast, NAT-08's restart behaviour) is asserted
  from the code paths, and on-device confirmation remains **TODO**.
- **TODO list:** SEC-01 audit counts; COMPAT-03 SSR verification;
  COMPAT-06 compatibility matrix values; PKG-01 clean-consumer-app
  `cap sync` verification; resolved (installed) dependency versions —
  no lockfile exists to quote.
