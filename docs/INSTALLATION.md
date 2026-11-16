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
installable on devices without ARCore. On such a device,
`checkSupport()` resolves `{ supported: false, ... }` and
`startSession()` fails with a coded error — nothing crashes.

If your app is AR-only and you want ARCore to be **required** (Play
Store filtering to ARCore-capable devices), opt in from your own app's
`AndroidManifest.xml`:

```xml
<uses-feature android:name="android.hardware.camera.ar" android:required="true" />

<application>
    <meta-data
        android:name="com.google.ar.core"
        android:value="required"
        tools:replace="android:value" />
</application>
```

The `tools:replace` attribute (which needs the `tools` namespace
declared on the `<manifest>` element) is the standard manifest-merger
override for a value that comes from a library manifest.
