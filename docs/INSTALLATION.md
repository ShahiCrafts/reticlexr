# Install reticlexr in your Capacitor app

This guide adds the library to **your own** Capacitor app. (To run
the bundled example app instead, see the last section.)

## 1. Install the package

```bash
npm install reticlexr
```

Peer dependencies your app provides: `@capacitor/core` ^8.5.2
(any Capacitor 8 app already has it), `three` ^0.180.0, and —
only if you use the `useARCore` hook — `react` >= 16.8. npm
installs missing peers automatically; with pnpm/yarn, add `three`
(and `react`) explicitly if your app doesn't already carry them.

> **Migrating from the old name?** This package was renamed from
> `capacitor-arcore` to `reticlexr` before its first publish.
> `capacitor-arcore` was **never published to npm**, so there is
> nothing to migrate from the registry: if a pre-release snapshot
> left `"capacitor-arcore"` in your `package.json`, replace it
> with `"reticlexr"` and reinstall.

## 2. Sync Capacitor

```bash
npx cap sync
```

The package ships its `capacitor` metadata key, so `cap sync`
discovers the Android plugin automatically: it registers the
`ARCore` plugin in the generated `capacitor.plugins.json` and adds
the `:reticlexr` project (pointing at `node_modules/reticlexr/android`)
to the Android build — no manual `settings.gradle` edit is needed.
This flow is verified in a clean scratch Capacitor app.

## 3. Android manifest behaviour

The plugin ships with ARCore **optional**: its Android manifest
declares `android.hardware.camera.ar` with `required="false"` and
the `com.google.ar.core` meta-data as `optional`, so your app
stays installable on devices without ARCore. The plain
`android.hardware.camera` feature is likewise declared
`required="false"`. On a device without ARCore, `checkSupport()`
resolves `{ supported: false, ... }` and `startSession()` fails
with a coded error — nothing crashes.

If your app is AR-only and you want ARCore to be **required**
(Play Store filtering to ARCore-capable devices), opt in from
your own app's `AndroidManifest.xml`:

```xml
<uses-feature android:name="android.hardware.camera.ar" android:required="true" tools:replace="android:required" />
<uses-feature android:name="android.hardware.camera" android:required="true" tools:replace="android:required" />

<application>
    <meta-data
        android:name="com.google.ar.core"
        android:value="required"
        tools:replace="android:value" />
</application>
```

The `tools:replace` attributes (which need the `tools` namespace
declared on the `<manifest>` element) are the standard
manifest-merger overrides for values that come from a library
manifest: `android:required` on the two feature declarations,
`android:value` on the meta-data. This opt-in is verified against
the Android manifest merger: merging a host manifest that carries
it over this library produces both features as `required="true"`
and the meta-data as `required`.

## 4. Permissions

The library manifest declares the `CAMERA` permission
(`android.permission.CAMERA`); it merges into your app and is
requested at runtime when AR is used. There is nothing to add by
hand. The WebXR runtime in a browser/WebView relies on the
browser's own camera permission prompt — no extra Android
permission is involved.

## 5. HTTPS (secure context)

WebXR AR only runs in a **secure context**: serve your app over
HTTPS in production (Capacitor's production WebView scheme is
HTTPS by default). `localhost` counts as secure for desktop
development. Testing on a physical phone over your LAN needs a
real certificate — see [HTTPS_SETUP.md](HTTPS_SETUP.md) and
[PHONE_TESTING.md](PHONE_TESTING.md). Outside a secure context,
`checkSupport()` reports `supported: false` with code
`INSECURE_CONTEXT`.

## Running the bundled example

From `example`:

```bash
npm install
npm run dev:https
```

`example`'s preinstall installs the parent package's dependencies
first. This is required because Vite follows the local `file:..`
package to its real source path (`../src/web.js`), so Three.js
must be resolvable from the plugin root as well as declared by
the test app. (`three` and `@capacitor/core` are peer
dependencies of the plugin since 1.1.0; the root keeps them as
devDependencies for exactly this local resolution.)
