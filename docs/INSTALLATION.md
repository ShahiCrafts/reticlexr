# Install

From `example` run:

```bash
npm install
npm run dev:https
```

`example`'s preinstall installs the parent package's dependencies first. This is required because Vite follows the local `file:..` package to its real source path (`../src/web.js`), so Three.js must be resolvable from the plugin root as well as declared by the test app. (`three` and `@capacitor/core` are peer dependencies of the plugin since 1.1.0; the root keeps them as devDependencies for exactly this local resolution.)

## ARCore requirement (Android)

The plugin ships with ARCore **optional**: its Android manifest declares
`android.hardware.camera.ar` with `required="false"` and the
`com.google.ar.core` meta-data as `optional`, so your app stays
installable on devices without ARCore. The plain
`android.hardware.camera` feature is likewise declared
`required="false"` — the `CAMERA` permission is still declared (and
requested at runtime when AR is used), but Play does not filter out
camera-less devices for an app that merely bundles the library. On a
device without ARCore, `checkSupport()` resolves
`{ supported: false, ... }` and `startSession()` fails with a coded
error — nothing crashes.

If your app is AR-only and you want ARCore to be **required** (Play
Store filtering to ARCore-capable devices), opt in from your own app's
`AndroidManifest.xml`:

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
declared on the `<manifest>` element) are the standard manifest-merger
overrides for values that come from a library manifest:
`android:required` on the two feature declarations, `android:value`
on the meta-data. This opt-in is verified against the Android
manifest merger: merging a host manifest that carries it over this
library produces both features as `required="true"` and the
meta-data as `required`.
