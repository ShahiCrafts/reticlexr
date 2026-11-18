// Ambient WebXR declarations for the type check only (`npm run
// check-types`). TypeScript's DOM lib does not ship the WebXR Device
// API and this package does not depend on @types/webxr, so the few
// platform globals src/web.js touches are declared here, minimally.
// This file is NOT part of the published package (package.json "files"
// covers src/ and android/ only) and the shipped declarations in src/
// never reference these names in public signatures.
interface Navigator {
  xr?: any;
}
declare const XRFrame: any;
declare const XRWebGLBinding: any;
declare const XRRay: any;
declare const XRRigidTransform: any;
