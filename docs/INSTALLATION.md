# Install

From `example` run:

```bash
npm install
npm run dev:https
```

`example`'s preinstall installs the parent package's dependencies first. This is required because Vite follows the local `file:..` package to its real source path (`../src/web.js`), so Three.js must be resolvable from the plugin root as well as declared by the test app. (`three` and `@capacitor/core` are peer dependencies of the plugin since 1.1.0; the root keeps them as devDependencies for exactly this local resolution.)
