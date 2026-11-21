// Verification harness (iOS support, 1.2.0).
// Stub-based Vitest suite (TEST-01): run with `npm test`.
//
// The iOS native runtime cannot execute in this environment (no
// Swift compiler / Xcode on the Linux CI box), so this harness
// verifies the package-level contract the Swift plugin must satisfy
// for the JS facade to work on iOS:
//   1. package.json declares the iOS plugin for Capacitor
//      (`capacitor.ios.src`) and ships the iOS sources in the npm
//      tarball (`files` covers ios/, Package.swift, the podspec),
//   2. Package.swift and Reticlexr.podspec exist at the repo root,
//   3. the Swift plugin source declares jsName "ARCore" (the name
//      src/index.js registers the plugin under — any other name
//      breaks the facade on iOS) and lists all 11 facade methods
//      as CAPPluginMethods,
//   4. the facade's getPlacedModels unwraps the native bridge's
//      `{models: [...]}` dictionary to the documented array (the
//      Capacitor native bridge cannot resolve a top-level array;
//      the WebXR runtime returns the array directly and must pass
//      through untouched).

import { test, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

test('ios01', async () => {
  const check = (name, cond) => expect(cond, name).toBe(true);

  // ---- 1. package.json wiring ----
  const pkg = JSON.parse(read('package.json'));
  check('package.json: capacitor.ios.src is "ios"', pkg.capacitor?.ios?.src === 'ios');
  check('package.json: capacitor.android still declared', pkg.capacitor?.android?.src === 'android');
  check(
    'package.json: files ships ios/, Package.swift and the podspec',
    Array.isArray(pkg.files) &&
      pkg.files.includes('ios/') &&
      pkg.files.includes('Package.swift') &&
      pkg.files.includes('Reticlexr.podspec')
  );
  check('package.json: version is 1.2.0', pkg.version === '1.2.0');

  // ---- 2. SPM + CocoaPods manifests exist and are shaped right ----
  check('Package.swift exists', fs.existsSync(path.join(root, 'Package.swift')));
  check('Reticlexr.podspec exists', fs.existsSync(path.join(root, 'Reticlexr.podspec')));
  const packageSwift = read('Package.swift');
  check(
    'Package.swift: ReticlexrPlugin target at ios/Sources/ReticlexrPlugin',
    packageSwift.includes('"ReticlexrPlugin"') &&
      packageSwift.includes('ios/Sources/ReticlexrPlugin') &&
      packageSwift.includes('cap-swift-pm')
  );
  const podspec = read('Reticlexr.podspec');
  check(
    'Reticlexr.podspec: iOS sources, Capacitor dependency, ARKit/RealityKit',
    podspec.includes('ios/Sources/ReticlexrPlugin') &&
      podspec.includes("'Capacitor'") &&
      podspec.includes('ARKit') &&
      podspec.includes('RealityKit')
  );

  // ---- 3. Swift plugin contract ----
  const pluginSwift = read('ios/Sources/ReticlexrPlugin/ARCorePlugin.swift');
  check(
    'Swift plugin: jsName is "ARCore" (the facade registration name)',
    pluginSwift.includes('jsName = "ARCore"')
  );
  check(
    'Swift plugin: identifier is "ARCorePlugin" and it is a CAPBridgedPlugin',
    pluginSwift.includes('identifier = "ARCorePlugin"') &&
      pluginSwift.includes('CAPBridgedPlugin')
  );
  const methods = [
    'checkSupport', 'startSession', 'stopSession', 'hitTest', 'placeModel',
    'setTransform', 'setMaterial', 'moveModel', 'removeModel',
    'getPlacedModels', 'clearModels',
  ];
  for (const method of methods) {
    check(
      `Swift plugin: pluginMethods lists ${method} as a promise`,
      pluginSwift.includes(`CAPPluginMethod(name: "${method}", returnType: CAPPluginReturnPromise)`)
    );
    check(
      `Swift plugin: implements @objc ${method}`,
      pluginSwift.includes(`func ${method}(_ call: CAPPluginCall)`)
    );
  }
  check(
    'Swift plugin: USDZ format failure uses the MODEL_FORMAT_UNSUPPORTED code',
    pluginSwift.includes('MODEL_FORMAT_UNSUPPORTED')
  );

  // ---- 4. Facade getPlacedModels unwrap ----
  // Stub the Capacitor native seam the same way nat-notimplemented
  // does: the globals must exist before @capacitor/core is imported.
  const placed = [{ modelId: 'm1', anchorId: 'm1', modelUrl: 'chair.usdz', position: [0, 0, -1], rotation: [0, 0, 0, 1], scale: [1, 1, 1] }];
  globalThis.Capacitor = {
    PluginHeaders: [
      {
        name: 'ARCore',
        methods: [{ name: 'getPlacedModels', rtype: 'promise' }],
      },
    ],
    nativePromise: (pluginName, methodName) => {
      if (pluginName === 'ARCore' && methodName === 'getPlacedModels') {
        // Native (iOS) shape: a dictionary wrapping the list.
        return Promise.resolve({ models: placed });
      }
      return Promise.reject(new Error(`unexpected native call ${pluginName}.${methodName}`));
    },
  };
  const { ARCore } = await import('../../src/index.js');
  const listed = await ARCore.getPlacedModels();
  check(
    'facade: getPlacedModels unwraps the native {models} dictionary to an array',
    Array.isArray(listed) && listed.length === 1 && listed[0].modelId === 'm1'
  );
});
