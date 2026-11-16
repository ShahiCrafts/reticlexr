/**
 * ARCore Web Implementation
 *
 * Features:
 * - Surface/plane detection with dot grid visualization
 * - Placement reticle indicator
 * - Vertical AND horizontal plane detection using WebXR Plane Detection API
 * - 3D model placement with realistic shadows
 * - Model manipulation (move, rotate, scale, color)
 */

import { WebPlugin } from "@capacitor/core";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

// ============================================================
// Transform input normalisation (BUG-01)
// ============================================================
// The layers above the engine describe transforms as {x, y, z} objects
// (that is what the React hook's documentation always promised), while
// the engine's scene code consumes plain arrays. Accept both shapes at
// the engine boundary so no caller can produce NaN transforms by
// following the docs. These helpers are pure and exported for testing.

function finiteOr(value, fallback) {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Normalise a 3D vector to a plain [x, y, z] array.
 * Accepts [x, y, z] or {x, y, z}; anything else yields `fallback`.
 *
 * @param {number[]|{x:number,y:number,z:number}|*} value
 * @param {number[]|undefined} [fallback]
 * @returns {number[]|undefined}
 */
export function normalizeVector3(value, fallback = undefined) {
  if (Array.isArray(value)) {
    if (value.length < 3) return fallback;
    return [finiteOr(value[0], 0), finiteOr(value[1], 0), finiteOr(value[2], 0)];
  }
  if (value && typeof value === "object") {
    return [finiteOr(value.x, 0), finiteOr(value.y, 0), finiteOr(value.z, 0)];
  }
  return fallback;
}

/**
 * Normalise a rotation to a quaternion array [x, y, z, w].
 * Accepts a quaternion array [x, y, z, w], a quaternion object
 * {x, y, z, w}, or an Euler rotation {x, y, z} / [x, y, z] in RADIANS
 * (the form the React hook documents). Anything else yields `fallback`.
 *
 * @param {number[]|Object|*} value
 * @param {number[]|undefined} [fallback]
 * @returns {number[]|undefined}
 */
export function normalizeQuaternion(value, fallback = undefined) {
  if (Array.isArray(value)) {
    if (value.length === 4) {
      return [
        finiteOr(value[0], 0),
        finiteOr(value[1], 0),
        finiteOr(value[2], 0),
        finiteOr(value[3], 1),
      ];
    }
    if (value.length === 3) {
      return new THREE.Quaternion()
        .setFromEuler(
          new THREE.Euler(finiteOr(value[0], 0), finiteOr(value[1], 0), finiteOr(value[2], 0))
        )
        .toArray();
    }
    return fallback;
  }
  if (value && typeof value === "object") {
    if ("w" in value) {
      return [
        finiteOr(value.x, 0),
        finiteOr(value.y, 0),
        finiteOr(value.z, 0),
        finiteOr(value.w, 1),
      ];
    }
    if ("x" in value || "y" in value || "z" in value) {
      return new THREE.Quaternion()
        .setFromEuler(
          new THREE.Euler(finiteOr(value.x, 0), finiteOr(value.y, 0), finiteOr(value.z, 0))
        )
        .toArray();
    }
  }
  return fallback;
}

/**
 * Normalise a scale to a plain [x, y, z] array.
 * Accepts a uniform number, [x, y, z], a single-element [s], or
 * {x, y, z}; anything else yields `fallback`.
 *
 * @param {number|number[]|{x:number,y:number,z:number}|*} value
 * @param {number[]|undefined} [fallback]
 * @returns {number[]|undefined}
 */
export function normalizeScale(value, fallback = undefined) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? [value, value, value] : fallback;
  }
  if (Array.isArray(value)) {
    if (value.length === 1) {
      const s = finiteOr(value[0], NaN);
      return Number.isFinite(s) ? [s, s, s] : fallback;
    }
    if (value.length >= 3) {
      return [finiteOr(value[0], 1), finiteOr(value[1], 1), finiteOr(value[2], 1)];
    }
    return fallback;
  }
  if (value && typeof value === "object") {
    return [finiteOr(value.x, 1), finiteOr(value.y, 1), finiteOr(value.z, 1)];
  }
  return fallback;
}

// ============================================================
// Ray hit-test geometry (BUG-03)
// ============================================================

/**
 * Build a hit-test ray for a normalised screen point from the viewer
 * (camera) pose. Pure math — exported for testing.
 *
 * The screen point (x, y) is in [0, 1] with (0, 0) at the TOP-LEFT of
 * the AR view. It is converted to NDC, unprojected through the view's
 * inverse projection matrix to a direction in view space (camera looks
 * down -Z, +Y up), then rotated into the pose's space by the viewer
 * orientation. For a multi-view (stereo) pose the caller passes the
 * first view's projection matrix — the standard choice for a tap on
 * the DOM overlay, which is what screen points refer to here.
 *
 * @param {{position:{x:number,y:number,z:number}, orientation:{x:number,y:number,z:number,w:number}}} viewerTransform -
 *   The viewer pose transform (XRPose.transform of the viewer pose)
 * @param {Float32Array|number[]} projectionMatrix - Column-major 4x4
 *   projection matrix of the view (XRView.projectionMatrix)
 * @param {number} x - Normalised screen X [0, 1]
 * @param {number} y - Normalised screen Y [0, 1]
 * @returns {{origin:{x:number,y:number,z:number}, direction:{x:number,y:number,z:number}}}
 *   Ray in the same space as the viewer pose
 */
export function rayFromScreenPoint(viewerTransform, projectionMatrix, x, y) {
  const ndc = new THREE.Vector3(x * 2 - 1, 1 - y * 2, -1);
  const inverseProjection = new THREE.Matrix4()
    .fromArray(projectionMatrix)
    .invert();
  // Unproject the near-plane NDC point into view space. The camera sits
  // at the view-space origin, so the unprojected point IS the direction.
  const direction = ndc.applyMatrix4(inverseProjection).normalize();
  const orientation = new THREE.Quaternion(
    viewerTransform.orientation.x,
    viewerTransform.orientation.y,
    viewerTransform.orientation.z,
    viewerTransform.orientation.w
  );
  direction.applyQuaternion(orientation);
  return {
    origin: {
      x: viewerTransform.position.x,
      y: viewerTransform.position.y,
      z: viewerTransform.position.z,
    },
    direction: { x: direction.x, y: direction.y, z: direction.z },
  };
}

// ============================================================
// Scale limits (API-08)
// ============================================================
// One documented scale range across every layer and runtime. The
// engine is the single enforcement point on the web: placeModel and
// transformModel clamp every scale they apply. ARView's setScale and
// the Android runtime (ARModelManager.setTransform) use the same
// range, so a pinch gesture behaves identically everywhere.
export const SCALE_MIN = 0.1;
export const SCALE_MAX = 5;

/**
 * Clamp a normalised [x, y, z] scale into [SCALE_MIN, SCALE_MAX]
 * per axis.
 *
 * @param {number[]} scale
 * @returns {number[]}
 */
export function clampScale(scale) {
  return scale.map((v) => Math.min(SCALE_MAX, Math.max(SCALE_MIN, v)));
}

// Scratch matrix for per-frame pose application (PERF-04): plane pose
// updates run inside the render loop's plane pass and must not
// allocate a Matrix4 per plane per change. Only used for immediate
// copy-into-target work, never retained.
const _scratchMatrix4 = new THREE.Matrix4();

// ============================================================
// Resource ownership and disposal (LEAK-01/02/03/04/07)
// ============================================================
// OWNERSHIP RULE — two resource lifetimes, kept strictly apart:
//
//   * CACHE-OWNED (shared): geometries, materials and textures of a
//     loaded GLTF belong to the model cache. Every placement of that
//     model SHARES them (Object3D.clone shares them by reference), so
//     they are disposed ONLY when the cache entry goes away — LRU
//     eviction, clearModelCache(), or engine.dispose().
//   * PER-INSTANCE: materials cloned on write for one placement (see
//     _ownMaterial), textures applied to one placement, shadow planes,
//     plane visualisations, the reticle. These are disposed as soon as
//     their owner goes away (removeModel, switchModel, plane removal,
//     stopSession).
//
// disposeObject() enforces the split: callers pass the cache-owned
// registry as `skip`, so scene teardown can never free a resource the
// cache still owns. Disposal in three.js only releases GPU memory —
// CPU-side data survives — so a resource rendered again after
// disposal is transparently re-uploaded; disposal is never a
// correctness hazard for a resource that turns out to still be
// referenced, only a potential re-upload cost.

/**
 * Invoke `cb` for a material and every texture it references (any
 * texture-valued property, plus ShaderMaterial uniform textures).
 *
 * @param {THREE.Material} material
 * @param {(resource: Object) => void} cb
 */
function eachMaterialResource(material, cb) {
  cb(material);
  for (const value of Object.values(material)) {
    if (value && value.isTexture) cb(value);
  }
  const uniforms = /** @type {*} */ (material).uniforms;
  if (uniforms) {
    for (const uniform of Object.values(uniforms)) {
      if (uniform && uniform.value && uniform.value.isTexture) cb(uniform.value);
    }
  }
}

/**
 * Collect every GPU resource (geometry, materials, textures) in an
 * Object3D subtree into a Set. Exported for tests.
 *
 * @param {THREE.Object3D} root
 * @returns {Set<Object>}
 */
export function collectResources(root) {
  const resources = new Set();
  if (!root || typeof root.traverse !== "function") return resources;
  root.traverse((child) => {
    if (child.geometry) resources.add(child.geometry);
    const materials = Array.isArray(child.material)
      ? child.material
      : child.material
        ? [child.material]
        : [];
    for (const material of materials) {
      eachMaterialResource(material, (r) => resources.add(r));
    }
  });
  return resources;
}

/**
 * Dispose the GPU resources of an Object3D subtree: geometries,
 * materials and their textures, plus InstancedMesh instance buffers.
 * Resources in `skip` (the cache-owned registry) are left alone —
 * see the OWNERSHIP RULE above. Exported for tests.
 *
 * @param {THREE.Object3D} root
 * @param {Set<Object>} [skip]
 */
export function disposeObject(root, skip = null) {
  if (!root || typeof root.traverse !== "function") return;
  const seen = new Set();
  const disposeResource = (resource) => {
    if (!resource || typeof resource.dispose !== "function") return;
    if (seen.has(resource)) return;
    seen.add(resource);
    if (skip && skip.has(resource)) return;
    resource.dispose();
  };
  root.traverse((child) => {
    if (child.isInstancedMesh) child.dispose();
    if (child.geometry) disposeResource(child.geometry);
    const materials = Array.isArray(child.material)
      ? child.material
      : child.material
        ? [child.material]
        : [];
    for (const material of materials) {
      eachMaterialResource(material, disposeResource);
    }
  });
}

export class ARCoreWeb extends WebPlugin {
  constructor() {
    super();
    // WebXR session state
    this.session = null;
    this.referenceSpace = null;
    this.viewerSpace = null;
    this.hitTestSource = null;
    this.xrGlBinding = null;
    this.pendingScreenshot = null;
    this._screenshotHintWarned = false;

    // Model management
    this.anchors = new Map();
    this.loadedModels = new Map();
    // url -> { gltf, resources } — `resources` is the entry's
    // cache-owned resource set (OWNERSHIP RULE above)
    this.modelCache = new Map();
    // Registry of every cache-owned geometry/material/texture,
    // passed as the skip set to disposeObject so scene teardown
    // never frees shared resources early
    this._sharedResources = new Set();
    this.modelShadows = new Map();
    this.modelBaseRings = new Map();
    // Engine-shared plane-dot geometry (PERF-01): one CircleGeometry
    // reused by every plane's InstancedMesh; disposed only by
    // engine.dispose(), per the ownership rule
    this._dotGeometry = null;
    this._dotGeometrySize = null;

    // Plane visualization - using WebXR Plane Detection API
    this.detectedPlanes = new Map(); // Map<XRPlane, { mesh, dots, orientation }>
    this.planesMeshGroup = null;
    this.planeDotsGroup = null;

    // Event listeners
    this.planeListeners = [];
    this.frameListeners = [];

    // Three.js components
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.gltfLoader = null;
    this.textureLoader = new THREE.TextureLoader();

    // Surface reticle (placement indicator)
    this.reticle = null;
    this.reticleVisible = false;
    this.lastHitPosition = null;
    this.lastHitRotation = null;
    this.lastPlaneType = null;
    this.lastDetectedPlane = null; // Store reference to XRPlane from detectedPlanes

    // Surface detection state (for React hook)
    this.surfaceState = {
      hasSurface: false,
      position: null,
      rotation: null,
      planeType: null,
      confidence: 0,
    };

    // Surface notification throttling (PERF-02): frame listeners are
    // notified on CHANGE — a hasSurface transition or a plane-type
    // change fires immediately — and otherwise at most every 100 ms
    // (10 Hz), so consumers like the React hook are not re-rendered
    // per frame. Payloads are single reused objects, mutated before
    // each emission; listeners must read them synchronously and must
    // not retain them.
    this._surfaceDetectedPayload = {
      type: "surfaceDetected",
      hasSurface: true,
      position: null,
      rotation: null,
      planeType: null,
      confidence: 1,
    };
    this._surfaceLostPayload = { type: "surfaceLost", hasSurface: false };
    this._lastSurfaceNotify = { hasSurface: null, planeType: null, time: -Infinity };

    // Configuration
    this.config = {
      showReticle: true,
      showPlanes: false, // Keep expensive plane meshes off by default
      showPlaneDots: true, // Lightweight dotted surface feedback; meshes remain disabled
      showShadow: true,
      showBaseRing: false,
      reticleColor: 0x00ff88, // Green for horizontal
      reticleColorVertical: 0xff6b6b, // Red for vertical
      planeColorHorizontal: 0x00ff88,
      planeColorVertical: 0xff6b6b,
      shadowOpacity: 0.4,
      shadowSize: 1.2,
      dotSize: 0.02,
      dotSpacing: 0.1,
      // Diagnostic logging is opt-in (PERF-06): the render loop and
      // plane processing run per frame and must stay silent in
      // production.
      debug: false,
      // Model cache cap (LEAK-04): at most this many loaded GLTFs are
      // kept, least-recently-used first; entries with live placements
      // are never evicted. Set to Infinity (or 0) to disable the cap.
      modelCacheLimit: 20,
    };

    // Render loop state
    this.isRendering = false;
    this.modelPlaced = false;

    // Plane detection feature availability
    this.planeDetectionSupported = false;
  }

  /**
   * Configure AR visual features
   */
  setConfig(options = {}) {
    this.config = { ...this.config, ...options };
  }

  getConfig() {
    return { ...this.config };
  }

  /**
   * Engine diagnostic log (PERF-06). Every engine `console.log` goes
   * through here and is silent unless `config.debug` is enabled —
   * several call sites are on per-frame hot paths.
   *
   * @param {...*} args
   */
  debugLog(...args) {
    if (this.config.debug) console.log(...args);
  }

  async checkSupport() {
    // WebXR is only exposed in secure contexts. Report that distinctly —
    // on an insecure origin navigator.xr is simply absent, and the generic
    // "not available" reason sends developers down the wrong path
    // (COMPAT-02).
    if (typeof window !== "undefined" && !window.isSecureContext) {
      return {
        supported: false,
        reason: "WebXR requires a secure context (HTTPS or localhost)",
        code: "INSECURE_CONTEXT",
      };
    }

    if (typeof navigator === "undefined" || !navigator.xr) {
      return { supported: false, reason: "WebXR not available" };
    }

    try {
      const supported = await navigator.xr.isSessionSupported("immersive-ar");
      return {
        supported,
        reason: supported ? "WebXR AR supported" : "immersive-ar not supported",
      };
    } catch (error) {
      return {
        supported: false,
        reason: error.message || "Unknown error checking AR support",
      };
    }
  }

  /**
   * Create the placement reticle
   */
  createReticle() {
    const reticleGroup = new THREE.Group();
    reticleGroup.name = "ar-reticle";

    // Outer ring
    const ringGeometry = new THREE.RingGeometry(0.1, 0.12, 32);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: this.config.reticleColor,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = -Math.PI / 2;
    ring.name = "outer-ring";
    reticleGroup.add(ring);

    // Inner ring
    const innerRingGeometry = new THREE.RingGeometry(0.05, 0.06, 32);
    const innerRingMaterial = new THREE.MeshBasicMaterial({
      color: this.config.reticleColor,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const innerRing = new THREE.Mesh(innerRingGeometry, innerRingMaterial);
    innerRing.rotation.x = -Math.PI / 2;
    innerRing.name = "inner-ring";
    reticleGroup.add(innerRing);

    // Center dot
    const dotGeometry = new THREE.CircleGeometry(0.02, 16);
    const dotMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 1,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const centerDot = new THREE.Mesh(dotGeometry, dotMaterial);
    centerDot.rotation.x = -Math.PI / 2;
    centerDot.position.y = 0.001;
    centerDot.name = "center-dot";
    reticleGroup.add(centerDot);

    // Crosshair lines
    const lineLength = 0.04;
    const lineOffset = 0.07;
    const lineMaterial = new THREE.LineBasicMaterial({
      color: this.config.reticleColor,
      transparent: true,
      opacity: 0.8,
    });

    const directions = [
      [[0, 0.001, -lineOffset], [0, 0.001, -lineOffset - lineLength]],
      [[0, 0.001, lineOffset], [0, 0.001, lineOffset + lineLength]],
      [[-lineOffset, 0.001, 0], [-lineOffset - lineLength, 0.001, 0]],
      [[lineOffset, 0.001, 0], [lineOffset + lineLength, 0.001, 0]],
    ];

    directions.forEach(([start, end]) => {
      const geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(...start),
        new THREE.Vector3(...end),
      ]);
      const line = new THREE.Line(geometry, lineMaterial.clone());
      line.name = "crosshair";
      reticleGroup.add(line);
    });

    // Pulsing outer ring for animation
    const pulseGeometry = new THREE.RingGeometry(0.14, 0.15, 32);
    const pulseMaterial = new THREE.MeshBasicMaterial({
      color: this.config.reticleColor,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const pulseRing = new THREE.Mesh(pulseGeometry, pulseMaterial);
    pulseRing.rotation.x = -Math.PI / 2;
    pulseRing.name = "pulse-ring";
    reticleGroup.add(pulseRing);

    reticleGroup.visible = false;
    return reticleGroup;
  }

  /**
   * Update reticle color based on plane type
   */
  updateReticleColor(planeType) {
    if (!this.reticle) return;

    const color = planeType === "vertical"
      ? this.config.reticleColorVertical
      : this.config.reticleColor;

    this.reticle.traverse((child) => {
      if (child.material && child.name !== "center-dot") {
        child.material.color.setHex(color);
      }
    });
  }

  /**
   * Animate reticle pulse
   */
  animateReticle(timestamp) {
    if (!this.reticle || !this.reticle.visible) return;

    const pulseRing = this.reticle.getObjectByName("pulse-ring");
    if (pulseRing) {
      const scale = 1 + Math.sin(timestamp * 0.005) * 0.15;
      pulseRing.scale.set(scale, scale, 1);
      pulseRing.material.opacity = 0.4 - Math.sin(timestamp * 0.005) * 0.2;
    }
  }

  /**
   * Create a mesh visualization for a detected plane using XRPlane.polygon
   */
  createPlaneMesh(plane, pose, orientation) {
    const polygon = plane.polygon;
    if (!polygon || polygon.length < 3) return null;

    const color = orientation === "vertical"
      ? this.config.planeColorVertical
      : this.config.planeColorHorizontal;

    // Create geometry from polygon vertices
    const vertices = [];
    const indices = [];

    // XRPlane.polygon vertices are in the plane's local coordinate system
    // Y is always 0 for these points
    for (let i = 0; i < polygon.length; i++) {
      vertices.push(polygon[i].x, polygon[i].y, polygon[i].z);
    }

    // Create triangles using fan triangulation (works for convex polygons)
    for (let i = 1; i < polygon.length - 1; i++) {
      indices.push(0, i, i + 1);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    const material = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.matrixAutoUpdate = false;

    // Apply the plane's pose
    if (pose) {
      const matrix = new THREE.Matrix4();
      matrix.fromArray(pose.transform.matrix);
      mesh.matrix.copy(matrix);
    }

    return mesh;
  }

  /**
   * Create dots grid on a detected plane
   */
  createPlaneDots(plane, pose, orientation) {
    const polygon = plane.polygon;
    if (!polygon || polygon.length < 3) return null;

    const color = orientation === "vertical"
      ? this.config.planeColorVertical
      : this.config.planeColorHorizontal;

    // Calculate bounding box of polygon
    let minX = Infinity, maxX = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;

    for (const point of polygon) {
      minX = Math.min(minX, point.x);
      maxX = Math.max(maxX, point.x);
      minZ = Math.min(minZ, point.z);
      maxZ = Math.max(maxZ, point.z);
    }

    // Create dots within the bounding box
    const dotsGroup = new THREE.Group();
    const dotGeometry = new THREE.CircleGeometry(this.config.dotSize, 8);
    const dotMaterial = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    const spacing = this.config.dotSpacing;

    for (let x = minX; x <= maxX; x += spacing) {
      for (let z = minZ; z <= maxZ; z += spacing) {
        // Check if point is inside polygon (simple ray casting)
        if (this.isPointInPolygon(x, z, polygon)) {
          const dot = new THREE.Mesh(dotGeometry, dotMaterial.clone());
          dot.position.set(x, 0.001, z); // Slightly above plane
          dot.rotation.x = -Math.PI / 2;
          dotsGroup.add(dot);
        }
      }
    }

    dotsGroup.matrixAutoUpdate = false;

    // Apply the plane's pose
    if (pose) {
      const matrix = new THREE.Matrix4();
      matrix.fromArray(pose.transform.matrix);
      dotsGroup.matrix.copy(matrix);
    }

    return dotsGroup;
  }

  /**
   * Check if a point is inside a polygon using ray casting algorithm
   */
  isPointInPolygon(x, z, polygon) {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x, zi = polygon[i].z;
      const xj = polygon[j].x, zj = polygon[j].z;

      if (((zi > z) !== (zj > z)) && (x < (xj - xi) * (z - zi) / (zj - zi) + xi)) {
        inside = !inside;
      }
    }
    return inside;
  }

  /**
   * Process detected planes from WebXR frame
   */
  processDetectedPlanes(frame) {
    if (!frame.detectedPlanes) {
      return;
    }

    const currentPlanes = frame.detectedPlanes;

    // Remove planes that are no longer detected
    for (const [xrPlane, planeData] of this.detectedPlanes) {
      if (!currentPlanes.has(xrPlane)) {
        // Remove mesh and dots from scene, disposing them (LEAK-02;
        // the shared dot geometry survives via the skip set)
        if (planeData.mesh) {
          this.planesMeshGroup.remove(planeData.mesh);
          disposeObject(planeData.mesh, this._sharedResources);
        }
        if (planeData.dots) {
          this.planeDotsGroup.remove(planeData.dots);
          disposeObject(planeData.dots, this._sharedResources);
        }
        this.detectedPlanes.delete(xrPlane);
        this.debugLog(`[ARCore] Plane removed: ${planeData.orientation}`);
      }
    }

    // Add or update planes
    for (const plane of currentPlanes) {
      const pose = frame.getPose(plane.planeSpace, this.referenceSpace);
      if (!pose) continue;

      const orientation = plane.orientation || "horizontal";

      if (!this.detectedPlanes.has(plane)) {
        // New plane detected
        this.debugLog(`[ARCore] New plane detected: ${orientation}, polygon points: ${plane.polygon?.length || 0}`);

        const mesh = this.config.showPlanes ? this.createPlaneMesh(plane, pose, orientation) : null;
        const dots = this.config.showPlaneDots ? this.createPlaneDots(plane, pose, orientation) : null;

        if (mesh) {
          this.planesMeshGroup.add(mesh);
        }
        if (dots) {
          this.planeDotsGroup.add(dots);
        }

        this.detectedPlanes.set(plane, { mesh, dots, orientation, lastChangedTime: plane.lastChangedTime });

        // Notify listeners
        this.planeListeners.forEach(cb => cb({
          type: "planeAdded",
          orientation,
          polygon: plane.polygon,
        }));
      } else {
        // Update existing plane if changed
        const planeData = this.detectedPlanes.get(plane);

        if (plane.lastChangedTime !== planeData.lastChangedTime) {
          this.debugLog(`[ARCore] Plane updated: ${orientation}`);

          // Remove old visualization (disposing it — LEAK-02)
          if (planeData.mesh) {
            this.planesMeshGroup.remove(planeData.mesh);
            disposeObject(planeData.mesh, this._sharedResources);
          }
          if (planeData.dots) {
            this.planeDotsGroup.remove(planeData.dots);
            disposeObject(planeData.dots, this._sharedResources);
          }

          // Create new visualization
          const mesh = this.config.showPlanes ? this.createPlaneMesh(plane, pose, orientation) : null;
          const dots = this.config.showPlaneDots ? this.createPlaneDots(plane, pose, orientation) : null;

          if (mesh) {
            this.planesMeshGroup.add(mesh);
          }
          if (dots) {
            this.planeDotsGroup.add(dots);
          }

          planeData.mesh = mesh;
          planeData.dots = dots;
          planeData.lastChangedTime = plane.lastChangedTime;
        } else {
          // Just update the pose (scratch matrix — PERF-04)
          if (planeData.mesh) {
            _scratchMatrix4.fromArray(pose.transform.matrix);
            planeData.mesh.matrix.copy(_scratchMatrix4);
          }
          if (planeData.dots) {
            _scratchMatrix4.fromArray(pose.transform.matrix);
            planeData.dots.matrix.copy(_scratchMatrix4);
          }
        }
      }
    }

    // Update plane counts for listeners
    let horizontalCount = 0;
    let verticalCount = 0;
    for (const [, data] of this.detectedPlanes) {
      if (data.orientation === "horizontal") horizontalCount++;
      else if (data.orientation === "vertical") verticalCount++;
    }

    if (this.detectedPlanes.size > 0) {
      this.planeListeners.forEach(cb => cb({
        type: "planesUpdated",
        total: this.detectedPlanes.size,
        horizontal: horizontalCount,
        vertical: verticalCount,
      }));
    }
  }

  /**
   * Find plane at hit test position - uses detectedPlanes API
   */
  findPlaneAtPosition(hitPosition, frame) {
    if (!frame.detectedPlanes || !this.referenceSpace) {
      return null;
    }

    // Find the closest plane to the hit position
    let closestPlane = null;
    let closestDistance = Infinity;

    for (const plane of frame.detectedPlanes) {
      const pose = frame.getPose(plane.planeSpace, this.referenceSpace);
      if (!pose) continue;

      // Calculate distance from hit position to plane center
      const planePos = pose.transform.position;
      const dx = hitPosition[0] - planePos.x;
      const dy = hitPosition[1] - planePos.y;
      const dz = hitPosition[2] - planePos.z;
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (distance < closestDistance && distance < 1.0) { // Within 1 meter
        closestDistance = distance;
        closestPlane = plane;
      }
    }

    return closestPlane;
  }

  /**
   * Create soft blurred shadow plane for a model
   */
  createShadowPlane(size = 1) {
    // Make shadow larger for more blur area
    const shadowSize = size * this.config.shadowSize * 1.5;
    const shadowGeometry = new THREE.CircleGeometry(shadowSize, 64);

    const shadowMaterial = new THREE.ShaderMaterial({
      uniforms: {
        opacity: { value: this.config.shadowOpacity },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float opacity;
        varying vec2 vUv;
        void main() {
          vec2 center = vec2(0.5, 0.5);
          float dist = distance(vUv, center) * 2.0;

          // Multi-step falloff for softer, more blurred shadow
          float innerShadow = 1.0 - smoothstep(0.0, 0.3, dist);  // Dark center
          float midShadow = 1.0 - smoothstep(0.2, 0.6, dist);    // Mid falloff
          float outerShadow = 1.0 - smoothstep(0.4, 1.0, dist);  // Soft outer edge

          // Blend the layers for natural blur effect
          float alpha = opacity * (innerShadow * 0.5 + midShadow * 0.3 + outerShadow * 0.2);

          gl_FragColor = vec4(0.0, 0.0, 0.0, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    const shadow = new THREE.Mesh(shadowGeometry, shadowMaterial);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.001;
    shadow.name = "model-shadow";

    return shadow;
  }

  /**
   * Calculate the footprint (base size) of a model.
   *
   * @param {THREE.Object3D} model - The model to measure
   * @returns {number} Approximate radius of the model's base
   */
  getModelFootprint(model) {
    const box = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    box.getSize(size);
    // Use the larger of width or depth for shadow radius
    return Math.max(size.x, size.z) / 2;
  }

  initThreeJS() {
    // Create WebGL renderer with transparency for AR
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true, // Transparent background (shows camera)
      preserveDrawingBuffer: false, // Avoid a large mobile GPU/memory penalty
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.xr.enabled = true; // Enable WebXR mode

    // Tone mapping prevents washed-out look and adds depth
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    // Position canvas behind the DOM overlay
    this.renderer.domElement.style.position = "fixed";
    this.renderer.domElement.style.top = "0";
    this.renderer.domElement.style.left = "0";
    this.renderer.domElement.style.width = "100%";
    this.renderer.domElement.style.height = "100%";
    this.renderer.domElement.style.zIndex = "0";

    // Create scene to hold all 3D objects
    this.scene = new THREE.Scene();

    // Create camera (WebXR will replace this with its tracked camera)
    this.camera = new THREE.PerspectiveCamera(
      70, // Field of view
      window.innerWidth / window.innerHeight, // Aspect ratio
      0.01, // Near clipping plane (1cm)
      100 // Far clipping plane (100m)
    );

    // Ambient light - reduced to allow directional light to create contrast
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambientLight);

    // Hemisphere light - adds natural sky/ground color variation for depth
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.4);
    hemiLight.position.set(0, 20, 0);
    this.scene.add(hemiLight);

    // Main directional light - creates shadows and highlights for 3D depth
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(5, 10, 7);
    directionalLight.castShadow = false; // Blob shadows are cheaper and more stable on mobile AR
    this.scene.add(directionalLight);

    // Fill light from opposite side - prevents harsh shadows, adds realism
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
    fillLight.position.set(-5, 5, -5);
    this.scene.add(fillLight);

    this.gltfLoader = new GLTFLoader();

    // Create planes visualization groups
    this.planesMeshGroup = new THREE.Group();
    this.planesMeshGroup.name = "detected-planes-mesh";
    this.scene.add(this.planesMeshGroup);

    this.planeDotsGroup = new THREE.Group();
    this.planeDotsGroup.name = "detected-planes-dots";
    this.scene.add(this.planeDotsGroup);

    // Create reticle
    this.reticle = this.createReticle();
    this.scene.add(this.reticle);
    this.debugLog("[ARCore] Three.js initialized, reticle created");

    return this.renderer;
  }

  async startSession(options = {}) {
    const {
      planeDetection = true,
      lightEstimation = true,
      // Screenshots need raw camera access, which is a materially larger
      // permission than the rest of the session. It is opt-in via
      // enableScreenshots and is NOT implied by lightEstimation (SEC-04).
      // Without it, takeScreenshot() returns CAMERA_CAPTURE_UNAVAILABLE.
      enableScreenshots = false,
      domOverlay = null,
    } = options;

    if (!this.renderer) {
      this.initThreeJS();
    }

    if (domOverlay && domOverlay.parentElement) {
      domOverlay.parentElement.insertBefore(
        this.renderer.domElement,
        domOverlay
      );
    } else {
      document.body.appendChild(this.renderer.domElement);
    }

    const sessionOptions = {
      requiredFeatures: ["hit-test"],
      // local-floor is optional: devices/browsers without floor-level
      // tracking degrade to local/viewer reference spaces (COMPAT-01)
      optionalFeatures: ["local-floor"],
    };

    // Add plane-detection as optional feature
    if (planeDetection) {
      sessionOptions.optionalFeatures.push("plane-detection");
    }

    if (lightEstimation) {
      // Light estimation only — it must not silently widen the permission
      // surface with raw camera access (SEC-04)
      sessionOptions.optionalFeatures.push("light-estimation");
    }

    if (enableScreenshots) {
      // Raw camera access lets takeScreenshot() capture the real-world
      // passthrough instead of only Three.js' transparent WebGL layer. It
      // is optional so AR still starts on browsers that do not implement
      // the module.
      sessionOptions.optionalFeatures.push("camera-access");
    }

    if (domOverlay) {
      sessionOptions.domOverlay = { root: domOverlay };
      sessionOptions.optionalFeatures.push("dom-overlay");
    }

    try {
      this.session = await navigator.xr.requestSession(
        "immersive-ar",
        sessionOptions
      );
      await this.renderer.xr.setSession(this.session);

      try {
        const gl = this.renderer.getContext();
        if (typeof XRWebGLBinding !== "undefined") {
          this.xrGlBinding = new XRWebGLBinding(this.session, gl);
        }
      } catch (_) {
        this.xrGlBinding = null;
      }

      // Reference space fallback chain matching the optional local-floor
      // feature above: local-floor, then local, then viewer (COMPAT-01)
      for (const spaceType of ["local-floor", "local", "viewer"]) {
        try {
          this.referenceSpace = await this.session.requestReferenceSpace(spaceType);
          break;
        } catch (_) {
          // Space not granted — try the next, less capable one
        }
      }
      if (!this.referenceSpace) {
        throw new Error("No reference space available (local-floor, local, viewer all rejected)");
      }
      this.viewerSpace = await this.session.requestReferenceSpace("viewer");

      // Request hit test source for instant positioning
      this.hitTestSource = await this.session.requestHitTestSource({
        space: this.viewerSpace,
      });

      // Check if plane detection is supported
      this.planeDetectionSupported = typeof XRFrame !== 'undefined' && 'detectedPlanes' in XRFrame.prototype;
      this.debugLog(`[ARCore] Plane detection API supported: ${this.planeDetectionSupported}`);

      this.session.addEventListener("end", () => {
        this.frameListeners.forEach((cb) => cb({ type: "sessionEnded" }));
        this.stopRendering();
        this.session = null;
        this.hitTestSource = null;
        this.referenceSpace = null;
        this.viewerSpace = null;
      });

      // Reset transient state (config.showReticle is the user preference
      // and must survive session restarts — BUG-04)
      this.modelPlaced = false;
      this.reticleVisible = false;

      this.debugLog("[ARCore] Session started - showReticle:", this.config.showReticle, "planeDetection:", this.planeDetectionSupported);

      this.startRendering();

      return { success: true, hasOverlay: !!domOverlay, planeDetection: this.planeDetectionSupported };
    } catch (error) {
      // If requestSession succeeded but a later step (reference space,
      // hit-test source) failed, end the live session — otherwise it keeps
      // running while the caller believes startup failed (BUG-07).
      if (this.session) {
        await this.session.end().catch(() => {});
        this.session = null;
        this.hitTestSource = null;
        this.referenceSpace = null;
        this.viewerSpace = null;
      }
      throw new Error(
        `Failed to start AR session: ${error.message || "Unknown error"}`
      );
    }
  }

  startRendering() {
    if (this.isRendering) return;
    this.isRendering = true;

    let frameCount = 0;
    let lastLoggedPlaneType = null;

    this.renderer.setAnimationLoop((timestamp, frame) => {
      if (!frame) return;

      frameCount++;

      // Process detected planes using the WebXR Plane Detection API
      if (this.planeDetectionSupported && (this.detectedPlanes.size === 0 || frameCount % 8 === 0)) {
        try {
          this.processDetectedPlanes(frame);
        } catch (e) {
          if (frameCount === 1) {
            this.debugLog("[ARCore] Plane detection not available in this frame:", e.message);
          }
        }
      }

      // Hit testing for reticle positioning
      if (this.hitTestSource && this.referenceSpace) {
        const hitTestResults = frame.getHitTestResults(this.hitTestSource);

        if (hitTestResults.length > 0) {
          const hit = hitTestResults[0];
          const pose = hit.getPose(this.referenceSpace);

          if (pose) {
            // Store hit position
            this.lastHitPosition = [
              pose.transform.position.x,
              pose.transform.position.y,
              pose.transform.position.z,
            ];
            this.lastHitRotation = [
              pose.transform.orientation.x,
              pose.transform.orientation.y,
              pose.transform.orientation.z,
              pose.transform.orientation.w,
            ];

            // Try to find the plane at this position using detectedPlanes API
            let planeType = "horizontal"; // Default

            // Hit-test success is the authoritative fast path. Plane polygon
            // classification is comparatively expensive, so do it periodically
            // instead of blocking every XR frame.
            if (this.planeDetectionSupported && frame.detectedPlanes && frameCount % 8 === 0) {
              const plane = this.findPlaneAtPosition(this.lastHitPosition, frame);
              if (plane && plane.orientation) {
                planeType = plane.orientation;
                this.lastDetectedPlane = plane;
              }
            }
            if (!this.lastDetectedPlane) {
              planeType = this.inferPlaneTypeFromQuaternion(pose.transform.orientation);
            } else if (this.lastDetectedPlane.orientation) {
              planeType = this.lastDetectedPlane.orientation;
            }

            this.lastPlaneType = planeType;

            // Update surface state (mutated in place — PERF-02)
            this.surfaceState.hasSurface = true;
            this.surfaceState.position = this.lastHitPosition;
            this.surfaceState.rotation = this.lastHitRotation;
            this.surfaceState.planeType = planeType;
            this.surfaceState.confidence = 1;

            // Reticle visibility
            const shouldShowReticle = this.config.showReticle && this.reticle;

            if (shouldShowReticle) {
              this.reticle.visible = true;
              this.reticleVisible = true;

              this.reticle.position.set(
                pose.transform.position.x,
                pose.transform.position.y,
                pose.transform.position.z
              );

              if (planeType === "horizontal") {
                this.reticle.quaternion.set(0, 0, 0, 1);
              } else {
                this.reticle.quaternion.set(
                  pose.transform.orientation.x,
                  pose.transform.orientation.y,
                  pose.transform.orientation.z,
                  pose.transform.orientation.w
                );
              }

              this.updateReticleColor(planeType);
            } else if (this.reticle) {
              this.reticle.visible = false;
              this.reticleVisible = false;
            }

            // Notify listeners — throttled (PERF-02): transitions
            // (surface gained, plane type changed) fire immediately;
            // steady-state updates are capped at 10 Hz.
            const lastNotify = this._lastSurfaceNotify;
            if (
              lastNotify.hasSurface !== true ||
              lastNotify.planeType !== planeType ||
              timestamp - lastNotify.time >= 100
            ) {
              lastNotify.hasSurface = true;
              lastNotify.planeType = planeType;
              lastNotify.time = timestamp;
              const payload = this._surfaceDetectedPayload;
              payload.position = this.lastHitPosition;
              payload.rotation = this.lastHitRotation;
              payload.planeType = planeType;
              this.frameListeners.forEach((cb) => cb(payload));
            }

            // Debug logging
            if (planeType !== lastLoggedPlaneType || (frameCount % 180 === 0 && frameCount < 900)) {
              this.debugLog(`[ARCore] Surface: ${planeType}, planes: ${this.detectedPlanes.size}, reticle: ${shouldShowReticle ? 'visible' : 'hidden'}`);
              lastLoggedPlaneType = planeType;
            }
          }
        } else {
          if (this.reticle) {
            this.reticle.visible = false;
          }
          this.reticleVisible = false;

          this.surfaceState.hasSurface = false;
          this.surfaceState.position = null;
          this.surfaceState.rotation = null;
          this.surfaceState.planeType = null;
          this.surfaceState.confidence = 0;

          // Losing the surface is a transition: fire immediately,
          // once (PERF-02) — not on every empty frame.
          if (this._lastSurfaceNotify.hasSurface !== false) {
            this._lastSurfaceNotify.hasSurface = false;
            this._lastSurfaceNotify.planeType = null;
            this._lastSurfaceNotify.time = timestamp;
            this.frameListeners.forEach((cb) => cb(this._surfaceLostPayload));
          }
        }
      }

      // Animate reticle
      this.animateReticle(timestamp);

      // Update model positions
      this.updateModelPositions(frame);

      // Render
      this.renderer.render(this.scene, this.camera);

      // Camera textures are only valid while the XR animation frame is active.
      // Fulfil screenshot requests here so callers can use a simple async API.
      if (this.pendingScreenshot) {
        const request = this.pendingScreenshot;
        this.pendingScreenshot = null;
        this._captureXRFrame(frame, request.options)
          .then(request.resolve)
          .catch((error) => request.resolve({ success: false, code: error.code, error: error.message || "Screenshot failed" }));
      }
    });
  }

  /**
   * Fallback method to infer plane type from quaternion when plane detection API is not available
   */
  inferPlaneTypeFromQuaternion(quaternion) {
    const qx = quaternion.x;
    const qy = quaternion.y;
    const qz = quaternion.z;
    const qw = quaternion.w;

    // Calculate the Y component of the normal vector
    const normalY = 1 - 2 * (qx * qx + qz * qz);

    // If normal mostly points up/down, it's horizontal
    // Threshold of 0.5 (45 degrees)
    return Math.abs(normalY) > 0.5 ? "horizontal" : "vertical";
  }

  stopRendering() {
    if (!this.isRendering) return;
    this.isRendering = false;

    if (this.renderer) {
      this.renderer.setAnimationLoop(null);
    }
  }

  updateModelPositions(frame) {
    this.loadedModels.forEach((model, anchorId) => {
      const anchorData = this.anchors.get(anchorId);
      if (!anchorData) return;

      if (anchorData.position) {
        model.position.set(
          anchorData.position[0],
          anchorData.position[1],
          anchorData.position[2]
        );

        const shadow = this.modelShadows.get(anchorId);
        if (shadow) {
          shadow.position.set(
            anchorData.position[0],
            anchorData.position[1] + 0.001,
            anchorData.position[2]
          );
        }
      }

      if (anchorData.rotation) {
        model.quaternion.set(
          anchorData.rotation[0],
          anchorData.rotation[1],
          anchorData.rotation[2],
          anchorData.rotation[3]
        );
      }

      if (anchorData.scale) {
        model.scale.set(
          anchorData.scale[0],
          anchorData.scale[1],
          anchorData.scale[2]
        );

        const shadow = this.modelShadows.get(anchorId);
        if (shadow) {
          const avgScale = (anchorData.scale[0] + anchorData.scale[2]) / 2;
          shadow.scale.set(avgScale, avgScale, 1);
        }
      }
    });
  }

  async stopSession() {
    this.stopRendering();

    // Dispose per-instance resources on the way out (LEAK-03);
    // cache-owned resources survive for the next session
    this.loadedModels.forEach((model) => {
      this.scene.remove(model);
      disposeObject(model, this._sharedResources);
    });
    this.modelShadows.forEach((shadow) => {
      this.scene.remove(shadow);
      disposeObject(shadow, this._sharedResources);
    });
    this.modelBaseRings.forEach((ring) => {
      this.scene.remove(ring);
      disposeObject(ring, this._sharedResources);
    });

    this.loadedModels.clear();
    this.modelShadows.clear();
    this.modelBaseRings.clear();

    // Clear plane visualizations (disposing them — LEAK-02)
    this.detectedPlanes.forEach((planeData) => {
      if (planeData.mesh) {
        this.planesMeshGroup.remove(planeData.mesh);
        disposeObject(planeData.mesh, this._sharedResources);
      }
      if (planeData.dots) {
        this.planeDotsGroup.remove(planeData.dots);
        disposeObject(planeData.dots, this._sharedResources);
      }
    });
    this.detectedPlanes.clear();

    if (this.reticle) {
      this.reticle.visible = false;
    }

    this.modelPlaced = false;

    if (this.session) {
      await this.session.end();
      this.session = null;
      this.hitTestSource = null;
      this.referenceSpace = null;
      this.viewerSpace = null;
      this.anchors.clear();
    }

    if (this.renderer && this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(
        this.renderer.domElement
      );
    }
  }

  /**
   * Release every GPU resource the engine owns (LEAK-03): the scene's
   * contents (placed models' per-instance resources, plane
   * visualisations, the reticle), the model cache, the shared dot
   * geometry, and finally the WebGL renderer and its GL context.
   *
   * Afterwards the engine is back to its pre-`initThreeJS` state —
   * renderer/scene/camera and related fields are null — so a later
   * `startSession()` on the SAME engine instance re-initialises from
   * scratch. Safe to call more than once.
   */
  async dispose() {
    this.stopRendering();

    if (this.session) {
      try {
        await this.session.end();
      } catch (_) {
        // Session already ending/ended — teardown continues regardless
      }
      this.session = null;
      this.hitTestSource = null;
      this.referenceSpace = null;
      this.viewerSpace = null;
    }

    if (this.scene) {
      disposeObject(this.scene, this._sharedResources);
    }
    this.loadedModels.clear();
    this.modelShadows.clear();
    this.modelBaseRings.clear();
    this.anchors.clear();
    this.detectedPlanes.clear();

    // Cache-owned resources are disposed only now (OWNERSHIP RULE)
    this.clearModelCache();

    // The engine-shared dot geometry (PERF-01) outlives individual
    // planes but not the engine
    if (this._dotGeometry) {
      this._sharedResources.delete(this._dotGeometry);
      this._dotGeometry.dispose();
      this._dotGeometry = null;
      this._dotGeometrySize = null;
    }

    if (this.renderer) {
      if (this.renderer.domElement && this.renderer.domElement.parentElement) {
        this.renderer.domElement.parentElement.removeChild(
          this.renderer.domElement
        );
      }
      this.renderer.dispose();
      this.renderer.forceContextLoss();
      this.renderer = null;
    }

    this.scene = null;
    this.camera = null;
    this.reticle = null;
    this.planesMeshGroup = null;
    this.planeDotsGroup = null;
    this.gltfLoader = null;
    this.modelPlaced = false;
    this.reticleVisible = false;
    this._lastSurfaceNotify.hasSurface = null;
    this._lastSurfaceNotify.planeType = null;
    this._lastSurfaceNotify.time = -Infinity;
  }

  /**
   * Hit test at normalised screen coordinates ([0, 1], origin
   * top-left).
   *
   * The centre point (0.5, 0.5 — the default) uses the fast viewer-ray
   * path: the cached centre hit from the render loop, or one frame
   * raced against the live viewer hit-test source. Any other point
   * performs a real ray hit test (see `hitTestAtPoint`, BUG-03), so
   * taps land where the user actually tapped.
   *
   * @param {Object} [options]
   * @param {number} [options.x=0.5] - Normalised X [0, 1]
   * @param {number} [options.y=0.5] - Normalised Y [0, 1]
   * @returns {Promise<{hit: boolean, position?: number[], rotation?: number[], planeType?: string, error?: string}>}
   */
  async hitTest({ x = 0.5, y = 0.5 } = {}) {
    if (!this.session || !this.referenceSpace) {
      return { hit: false, error: "Session not active" };
    }

    if (x !== 0.5 || y !== 0.5) {
      return this.hitTestAtPoint(x, y);
    }

    if (!this.hitTestSource) {
      return { hit: false, error: "Session not active" };
    }

    // Use cached hit result if available
    if (this.lastHitPosition && this.reticleVisible) {
      return {
        hit: true,
        position: this.lastHitPosition,
        rotation: this.lastHitRotation,
        planeType: this.lastPlaneType || "horizontal",
      };
    }

    return new Promise((resolve) => {
      const session = this.session;
      let settled = false;
      const settle = (result) => {
        if (settled) return;
        settled = true;
        session.removeEventListener("end", onSessionEnd);
        resolve(result);
      };
      const onSessionEnd = () => {
        // The session ended before the frame callback fired — settle
        // instead of leaving the caller awaiting forever (BUG-08).
        settle({ hit: false, error: "SESSION_ENDED" });
      };
      const onFrame = (time, frame) => {
        const hitTestResults = frame.getHitTestResults(this.hitTestSource);

        if (hitTestResults.length > 0) {
          const hit = hitTestResults[0];
          const pose = hit.getPose(this.referenceSpace);

          if (pose) {
            let planeType = "horizontal";

            // Try to get plane type from detected planes
            if (this.planeDetectionSupported && frame.detectedPlanes) {
              const position = [
                pose.transform.position.x,
                pose.transform.position.y,
                pose.transform.position.z,
              ];
              const plane = this.findPlaneAtPosition(position, frame);
              if (plane && plane.orientation) {
                planeType = plane.orientation;
              }
            }

            settle({
              hit: true,
              position: [
                pose.transform.position.x,
                pose.transform.position.y,
                pose.transform.position.z,
              ],
              rotation: [
                pose.transform.orientation.x,
                pose.transform.orientation.y,
                pose.transform.orientation.z,
                pose.transform.orientation.w,
              ],
              planeType: planeType,
            });
            return;
          }
        }

        settle({ hit: false });
      };

      session.addEventListener("end", onSessionEnd);
      session.requestAnimationFrame(onFrame);
    });
  }

  /**
   * Ray-based hit test for an explicit normalised screen point
   * (BUG-03).
   *
   * On the next frame, the viewer pose supplies the camera's position,
   * orientation and projection; `rayFromScreenPoint` turns (x, y) into
   * a ray in reference space; a dedicated hit-test source is registered
   * with that ray as its `offsetRay`; the following frame's hit results
   * settle the promise.
   *
   * The one-off source is cancelled on EVERY settle path — results
   * consumed, no hit, error, timeout, or session end (including a
   * session that ends while the source is still being created) — so
   * per-tap sources never accumulate in the runtime.
   *
   * @param {number} x - Normalised X [0, 1]
   * @param {number} y - Normalised Y [0, 1]
   * @returns {Promise<{hit: boolean, position?: number[], rotation?: number[], planeType?: string, error?: string}>}
   */
  hitTestAtPoint(x, y) {
    const session = this.session;
    const referenceSpace = this.referenceSpace;

    return new Promise((resolve) => {
      let settled = false;
      let raySource = null;

      const settle = (result) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        session.removeEventListener("end", onSessionEnd);
        if (raySource) {
          try { raySource.cancel(); } catch (_) {}
          raySource = null;
        }
        resolve(result);
      };
      const onSessionEnd = () => {
        // Never leave the caller awaiting a frame that will not come
        // (BUG-08).
        settle({ hit: false, error: "SESSION_ENDED" });
      };
      // Frames can also stall without the session ending; race a
      // timeout so the promise always settles (BUG-08).
      const timer = setTimeout(() => {
        settle({ hit: false, error: "HIT_TEST_TIMEOUT" });
      }, 1000);

      const onResultsFrame = (time, frame) => {
        if (settled || !raySource) return;
        const results = frame.getHitTestResults(raySource);
        if (results.length > 0) {
          const pose = results[0].getPose(referenceSpace);
          if (pose) {
            const position = [
              pose.transform.position.x,
              pose.transform.position.y,
              pose.transform.position.z,
            ];
            let planeType = this.inferPlaneTypeFromQuaternion(
              pose.transform.orientation
            );
            if (this.planeDetectionSupported && frame.detectedPlanes) {
              const plane = this.findPlaneAtPosition(position, frame);
              if (plane && plane.orientation) {
                planeType = plane.orientation;
              }
            }
            settle({
              hit: true,
              position,
              rotation: [
                pose.transform.orientation.x,
                pose.transform.orientation.y,
                pose.transform.orientation.z,
                pose.transform.orientation.w,
              ],
              planeType,
            });
            return;
          }
        }
        settle({ hit: false });
      };

      const onPoseFrame = async (time, frame) => {
        if (settled) return;
        try {
          const viewerPose = frame.getViewerPose(referenceSpace);
          const view = viewerPose && viewerPose.views && viewerPose.views[0];
          if (!viewerPose || !view) {
            settle({ hit: false, error: "NO_VIEWER_POSE" });
            return;
          }
          const ray = rayFromScreenPoint(
            viewerPose.transform,
            view.projectionMatrix,
            x,
            y
          );
          raySource = await session.requestHitTestSource({
            space: referenceSpace,
            offsetRay: new XRRay(ray.origin, ray.direction),
          });
        } catch (error) {
          settle({ hit: false, error: "HIT_TEST_UNAVAILABLE" });
          return;
        }
        if (settled) {
          // Settled while the source was being created (session end or
          // timeout): cancel the late source so it cannot leak.
          try { raySource.cancel(); } catch (_) {}
          raySource = null;
          return;
        }
        session.requestAnimationFrame(onResultsFrame);
      };

      session.addEventListener("end", onSessionEnd);
      session.requestAnimationFrame(onPoseFrame);
    });
  }

  getSurfaceState() {
    return {
      detected: this.reticleVisible,
      hasSurface: this.reticleVisible,
      position: this.lastHitPosition,
      rotation: this.lastHitRotation,
      planeType: this.lastPlaneType,
      planesCount: this.detectedPlanes.size,
    };
  }

  getSurfaceDetectionState() {
    return this.surfaceState;
  }

  getDetectedPlanes() {
    const planes = [];
    for (const [xrPlane, data] of this.detectedPlanes) {
      planes.push({
        orientation: data.orientation,
        polygon: xrPlane.polygon ? Array.from(xrPlane.polygon).map(p => ({ x: p.x, y: p.y, z: p.z })) : [],
      });
    }
    return planes;
  }

  setReticleVisible(visible) {
    this.debugLog(`[ARCore] setReticleVisible(${visible})`);
    this.config.showReticle = visible;
    if (!visible && this.reticle) {
      this.reticle.visible = false;
      this.reticleVisible = false;
    }
  }

  /**
   * Register a freshly loaded GLTF in the model cache, recording its
   * cache-owned resources (OWNERSHIP RULE above).
   *
   * @param {string} modelUrl
   * @param {*} gltf - The GLTFLoader result
   */
  _registerModelCache(modelUrl, gltf) {
    if (this.modelCache.has(modelUrl)) {
      this._disposeModelCacheEntry(modelUrl);
    }
    const resources = collectResources(gltf.scene);
    resources.forEach((r) => this._sharedResources.add(r));
    this.modelCache.set(modelUrl, { gltf, resources });
    this._evictModelCache();
  }

  /**
   * Dispose one cache entry: its resources leave the shared registry
   * and are disposed for real. Callers must not evict URLs with live
   * placements (see _evictModelCache); explicit disposal via
   * clearModelCache()/dispose() accepts the re-upload cost for any
   * still-placed model (three.js disposal semantics — see the
   * OWNERSHIP RULE).
   *
   * @param {string} modelUrl
   */
  _disposeModelCacheEntry(modelUrl) {
    const entry = this.modelCache.get(modelUrl);
    if (!entry) return;
    this.modelCache.delete(modelUrl);
    entry.resources.forEach((r) => this._sharedResources.delete(r));
    disposeObject(entry.gltf.scene, this._sharedResources);
  }

  /**
   * Evict least-recently-used cache entries beyond
   * `config.modelCacheLimit` (LEAK-04). Entries whose model is
   * currently placed are NEVER evicted — the cache may exceed the
   * cap while placements are live rather than disposing resources
   * out from under a visible model.
   */
  _evictModelCache() {
    const limit = this.config.modelCacheLimit;
    if (!Number.isFinite(limit) || limit <= 0) return;
    const liveUrls = new Set();
    this.anchors.forEach((anchor) => {
      if (anchor.modelUrl) liveUrls.add(anchor.modelUrl);
    });
    while (this.modelCache.size > limit) {
      let evicted = false;
      for (const url of this.modelCache.keys()) {
        if (!liveUrls.has(url)) {
          this._disposeModelCacheEntry(url);
          evicted = true;
          break;
        }
      }
      if (!evicted) return; // Everything cached is placed live
    }
  }

  /**
   * Empty the model cache, disposing every cached model's GPU
   * resources (LEAK-04). Models placed from the cache keep working:
   * disposal only releases GPU memory, and three.js re-uploads a
   * resource if it is rendered again.
   */
  clearModelCache() {
    for (const url of Array.from(this.modelCache.keys())) {
      this._disposeModelCacheEntry(url);
    }
  }

  /**
   * Clone-on-write for materials (LEAK-01): placements share the
   * cache's materials, so the first per-anchor mutation of a material
   * swaps in a per-instance clone and mutates that instead — the
   * change can then neither leak into the cache nor into other
   * placements of the same model, and the clone is disposed with its
   * placement.
   *
   * @param {THREE.Material} material
   * @returns {THREE.Material}
   */
  _ownMaterial(material) {
    if (!this._sharedResources.has(material)) return material;
    return material.clone();
  }

  /**
   * Apply {@link _ownMaterial} to every material slot of a mesh.
   *
   * @param {THREE.Mesh} mesh
   * @returns {THREE.Material[]}
   */
  _ownMeshMaterials(mesh) {
    if (!mesh.material) return [];
    if (Array.isArray(mesh.material)) {
      mesh.material = mesh.material.map((m) => this._ownMaterial(m));
      return mesh.material;
    }
    mesh.material = this._ownMaterial(mesh.material);
    return [mesh.material];
  }

  async loadModel(modelUrl) {
    const cached = this.modelCache.get(modelUrl);
    if (cached) {
      // Refresh LRU recency (LEAK-04)
      this.modelCache.delete(modelUrl);
      this.modelCache.set(modelUrl, cached);
      return cached.gltf.scene.clone();
    }

    return new Promise((resolve, reject) => {
      this.gltfLoader.load(
        modelUrl,
        (gltf) => {
          this._registerModelCache(modelUrl, gltf);
          resolve(gltf.scene.clone());
        },
        (progress) => {
          const percent = ((progress.loaded / progress.total) * 100).toFixed(0);
          this.debugLog(`Loading model: ${percent}%`);
        },
        (error) => {
          console.error("Error loading model:", error);
          reject(error);
        }
      );
    });
  }

  /**
   * Load a model and place it in the scene.
   *
   * Transform inputs are normalised at this boundary (BUG-01):
   * `position` accepts [x, y, z] or {x, y, z}; `rotation` accepts a
   * quaternion [x, y, z, w] / {x, y, z, w} or Euler radians {x, y, z};
   * `scale` accepts a uniform number, [x, y, z] or {x, y, z}.
   *
   * @param {Object} options
   * @param {string} [options.modelUrl] - GLTF/GLB URL (or `modelPath`)
   * @param {string} [options.modelPath] - Alias for `modelUrl`
   * @param {number[]|{x:number,y:number,z:number}} [options.position] -
   *   World position; defaults to the latest surface hit position
   * @param {number[]|Object} [options.rotation] - Rotation (see above);
   *   defaults to identity
   * @param {number|number[]|{x:number,y:number,z:number}} [options.scale] -
   *   Scale; defaults to [1, 1, 1]. Clamped to [0.1, 5] per axis — the
   *   one scale range shared by every layer and runtime (API-08)
   * @returns {Promise<{anchorId: string}>}
   */
  async placeModel({
    modelUrl,
    modelPath,
    position,
    rotation,
    scale,
  }) {
    modelUrl = modelUrl || modelPath;
    position = normalizeVector3(position, this.lastHitPosition);
    // No hit was involved in an explicit placement: a missing/null rotation
    // means identity, never an unrelated earlier hit's rotation (BUG-12)
    rotation = normalizeQuaternion(rotation, [0, 0, 0, 1]);
    scale = clampScale(normalizeScale(scale, [1, 1, 1]));
    if (!modelUrl) throw new Error("modelUrl/modelPath is required");
    if (!position) throw new Error("No surface hit available. Scan a surface before placing a model.");
    const anchorId = `anchor_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    this.anchors.set(anchorId, {
      modelUrl,
      position,
      rotation,
      scale,
    });

    try {
      const model = await this.loadModel(modelUrl);
      // No material cloning at placement: the clone shares the
      // cache's geometries/materials/textures (LEAK-01 OWNERSHIP
      // RULE). Per-anchor material changes clone on write instead
      // (see _ownMaterial).

      model.position.set(position[0], position[1], position[2]);
      model.quaternion.set(rotation[0], rotation[1], rotation[2], rotation[3]);
      model.scale.set(scale[0], scale[1], scale[2]);

      // Add to scene and track
      this.scene.add(model);
      this.loadedModels.set(anchorId, model);

      const footprint = this.getModelFootprint(model);

      if (this.config.showShadow) {
        const shadow = this.createShadowPlane(footprint);
        shadow.position.set(position[0], position[1] + 0.001, position[2]);
        this.scene.add(shadow);
        this.modelShadows.set(anchorId, shadow);
      }

      // Keep surface feedback active after placement. This lets users see where
      // another object could be placed and avoids losing spatial context.
      this.modelPlaced = true;

      this.frameListeners.forEach((cb) =>
        cb({
          type: "modelPlaced",
          anchorId,
          modelUrl,
          position,
          rotation,
          scale,
        })
      );

      return { anchorId };
    } catch (error) {
      this.anchors.delete(anchorId);
      throw new Error(`Failed to load model: ${error.message}`);
    }
  }

  async removeModel({ anchorId }) {
    const model = this.loadedModels.get(anchorId);
    if (model) {
      this.scene.remove(model);
      // Dispose per-instance resources; cache-owned shared resources
      // are skipped per the OWNERSHIP RULE (LEAK-01)
      disposeObject(model, this._sharedResources);
      this.loadedModels.delete(anchorId);
    }

    const shadow = this.modelShadows.get(anchorId);
    if (shadow) {
      this.scene.remove(shadow);
      disposeObject(shadow, this._sharedResources);
      this.modelShadows.delete(anchorId);
    }

    const baseRing = this.modelBaseRings.get(anchorId);
    if (baseRing) {
      this.scene.remove(baseRing);
      disposeObject(baseRing, this._sharedResources);
      this.modelBaseRings.delete(anchorId);
    }

    this.anchors.delete(anchorId);

    this.modelPlaced = this.loadedModels.size > 0;

    this.frameListeners.forEach((cb) => cb({ type: "modelRemoved", anchorId }));
  }

  /**
   * Apply a new position/rotation/scale to a placed model.
   * Transform inputs accept the same shapes as `placeModel` (BUG-01);
   * omitted or unrecognisable values leave the current transform intact.
   *
   * @param {Object} options
   * @param {string} options.anchorId
   * @param {number[]|{x:number,y:number,z:number}} [options.position]
   * @param {number[]|Object} [options.rotation]
   * @param {number|number[]|{x:number,y:number,z:number}} [options.scale] -
   *   Clamped to [0.1, 5] per axis (API-08)
   */
  async transformModel({ anchorId, position, rotation, scale }) {
    const anchor = this.anchors.get(anchorId);
    if (!anchor) {
      throw new Error(`Anchor ${anchorId} not found`);
    }

    position = position === undefined ? undefined : normalizeVector3(position, undefined);
    rotation = rotation === undefined ? undefined : normalizeQuaternion(rotation, undefined);
    scale = scale === undefined ? undefined : normalizeScale(scale, undefined);
    if (scale) scale = clampScale(scale);

    if (position) anchor.position = position;
    if (rotation) anchor.rotation = rotation;
    if (scale) anchor.scale = scale;

    const model = this.loadedModels.get(anchorId);
    if (model) {
      if (position) model.position.set(position[0], position[1], position[2]);
      if (rotation)
        model.quaternion.set(rotation[0], rotation[1], rotation[2], rotation[3]);
      if (scale) model.scale.set(scale[0], scale[1], scale[2]);
    }

    this.frameListeners.forEach((cb) =>
      cb({ type: "modelTransformed", anchorId, ...anchor })
    );
  }

  setShadowVisible(anchorId, visible) {
    const shadow = this.modelShadows.get(anchorId);
    if (shadow) shadow.visible = visible;
  }

  // ============================================================
  // Engine events (API-07) — per runtime
  // ============================================================
  // The WebXR engine emits the events below through its OWN listener
  // channels. They are NOT the native facade's event set: the facade
  // (`ARCore.on` in index.js) bridges the ANDROID plugin's events
  // (sessionStarted, trackingChanged, surfaceUpdated, sessionStopped,
  // modelMaterialChanged, modelMoved, …), which the web runtime never
  // emits through `ARCore.on`. Until the surfaces are unified, web
  // consumers subscribe here (directly, via ARView.onFrame/onPlanes,
  // or via the useARCore hook's state).
  //
  // Frame listeners (addFrameListener) — payloads always carry `type`:
  //   surfaceDetected  {hasSurface: true, position, rotation, planeType, confidence}
  //                    — throttled (PERF-02): on change (surface gained
  //                    or plane type changed) immediately, otherwise at
  //                    most 10 Hz while the centre ray has a hit
  //   surfaceLost      {hasSurface: false} — once, when the centre ray
  //                    loses its hit
  //   modelPlaced      {anchorId, modelUrl, position, rotation, scale}
  //   modelRemoved     {anchorId}
  //   modelTransformed {anchorId, modelUrl, position, rotation, scale}
  //   modelColorChanged {anchorId, color}
  //   modelSwitched    {anchorId, modelUrl}
  //   sessionEnded     {} — the XR session ended
  //
  // Plane listeners (addPlaneListener) — payloads always carry `type`:
  //   planeAdded       {orientation, polygon}
  //   planesUpdated    {total, horizontal, vertical} — counts as NUMBERS

  /**
   * Subscribe to plane events (see the event list above).
   * @param {Function} callback - Receives the event payload
   * @returns {Function} Unsubscribe function
   */
  addPlaneListener(callback) {
    this.planeListeners.push(callback);
    return () => {
      this.planeListeners = this.planeListeners.filter((cb) => cb !== callback);
    };
  }

  /**
   * Subscribe to frame/model events (see the event list above).
   *
   * HOT PATH: callbacks run inside the render loop. Surface events
   * are throttled (on change, at most 10 Hz — PERF-02), but handlers
   * should still be cheap and allocation-light, and must not retain
   * surface payload objects — they are reused between emissions.
   *
   * @param {Function} callback - Receives the event payload
   * @returns {Function} Unsubscribe function
   */
  addFrameListener(callback) {
    this.frameListeners.push(callback);
    return () => {
      this.frameListeners = this.frameListeners.filter((cb) => cb !== callback);
    };
  }

  getSession() {
    return this.session;
  }
  getAnchors() {
    return this.anchors;
  }
  getRenderer() {
    return this.renderer;
  }
  getScene() {
    return this.scene;
  }
  getCamera() {
    return this.camera;
  }

  async setModelColor({ anchorId, color }) {
    const model = this.loadedModels.get(anchorId);
    if (!model) throw new Error(`Model with anchorId ${anchorId} not found`);

    const threeColor = new THREE.Color(color);

    model.traverse((child) => {
      if (child.isMesh && child.material) {
        // Clone on write: the colour change must not leak into the
        // shared cache materials (LEAK-01)
        this._ownMeshMaterials(child).forEach((mat) => {
          mat.color = threeColor;
          mat.needsUpdate = true;
        });
      }
    });

    this.frameListeners.forEach((cb) =>
      cb({ type: "modelColorChanged", anchorId, color })
    );
  }

  async setModelMaterial({ anchorId, metalness, roughness, opacity }) {
    const model = this.loadedModels.get(anchorId);
    if (!model) throw new Error(`Model with anchorId ${anchorId} not found`);

    model.traverse((child) => {
      if (child.isMesh && child.material) {
        // Clone on write, as in setModelColor (LEAK-01)
        this._ownMeshMaterials(child).forEach((mat) => {
          if (metalness !== undefined) mat.metalness = metalness;
          if (roughness !== undefined) mat.roughness = roughness;
          if (opacity !== undefined) {
            mat.opacity = opacity;
            mat.transparent = opacity < 1;
          }
          mat.needsUpdate = true;
        });
      }
    });
  }

  /** Swap geometry at an existing anchor while preserving placement and transforms. */
  async switchModel({ anchorId, modelUrl, preserveMaterial = true }) {
    const anchor = this.anchors.get(anchorId);
    const oldModel = this.loadedModels.get(anchorId);
    if (!anchor || !oldModel) throw new Error(`Anchor ${anchorId} not found`);
    const next = await this.loadModel(modelUrl);
    // No material cloning: the new model shares its cache's materials
    // (LEAK-01); the preservation below clones on write per material.
    next.position.copy(oldModel.position);
    next.quaternion.copy(oldModel.quaternion);
    next.scale.copy(oldModel.scale);
    // Texture adopted by the new model from the old one: it must
    // survive the old model's disposal below
    let preservedMap = null;
    if (preserveMaterial) {
      let sourceMaterial = null;
      oldModel.traverse(c => { if (!sourceMaterial && c.isMesh && c.material) sourceMaterial = Array.isArray(c.material) ? c.material[0] : c.material; });
      if (sourceMaterial) next.traverse(c => { if (c.isMesh && c.material) {
        const mats = this._ownMeshMaterials(c);
        mats.forEach(m => { if (m.color && sourceMaterial.color) m.color.copy(sourceMaterial.color); if (sourceMaterial.map) { m.map = sourceMaterial.map; preservedMap = sourceMaterial.map; } m.needsUpdate = true; });
      }});
    }
    this.scene.add(next);
    this.scene.remove(oldModel);
    // Dispose the old model's per-instance resources (LEAK-01) and
    // its shadow (LEAK-07); cache-owned resources are skipped
    const skip = new Set(this._sharedResources);
    if (preservedMap) skip.add(preservedMap);
    disposeObject(oldModel, skip);
    this.loadedModels.set(anchorId, next);
    anchor.modelUrl = modelUrl;
    const oldShadow = this.modelShadows.get(anchorId);
    if (oldShadow) { this.scene.remove(oldShadow); disposeObject(oldShadow, this._sharedResources); this.modelShadows.delete(anchorId); }
    if (this.config.showShadow) {
      const shadow = this.createShadowPlane(this.getModelFootprint(next));
      shadow.position.set(anchor.position[0], anchor.position[1] + .001, anchor.position[2]);
      this.scene.add(shadow); this.modelShadows.set(anchorId, shadow);
    }
    this.frameListeners.forEach(cb => cb({ type:'modelSwitched', anchorId, modelUrl }));
    return { anchorId, modelUrl };
  }

  async setModelTexture({ anchorId, textureUrl, materialName }) {
    const model = this.loadedModels.get(anchorId);
    if (!model) throw new Error(`Model with anchorId ${anchorId} not found`);
    const texture = await this.textureLoader.loadAsync(textureUrl);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.flipY = false;
    model.traverse(child => {
      if (!child.isMesh || !child.material) return;
      const slots = Array.isArray(child.material) ? child.material : [child.material];
      slots.forEach((mat, index) => {
        if (materialName && mat.name !== materialName) return;
        // Clone on write (LEAK-01), then dispose the texture being
        // replaced (LEAK-04) — unless it is cache-owned (the model's
        // original map), whose lifetime the cache manages, or the
        // very texture being applied.
        const owned = this._ownMaterial(mat);
        if (Array.isArray(child.material)) child.material[index] = owned;
        else child.material = owned;
        if (owned.map && owned.map !== texture && !this._sharedResources.has(owned.map)) {
          owned.map.dispose();
        }
        owned.map = texture;
        owned.needsUpdate = true;
      });
    });
    return { success:true, anchorId, textureUrl };
  }

  // Capacitor facade compatibility: the native API uses modelId/setTransform/setMaterial.
  // On web the model identifier is the anchor id, so normalize both forms here.
  async setTransform(options = {}) {
    const anchorId = options.anchorId || options.modelId;
    // Facade convention: a plain {x, y, z} rotation here is Euler DEGREES
    // (the native API's documented form). Quaternion objects ({…, w}) and
    // arrays pass through to transformModel's normalisation untouched
    // (BUG-01).
    const rotation = options.rotation && typeof options.rotation === "object" && !Array.isArray(options.rotation) && !("w" in options.rotation)
      ? new THREE.Quaternion().setFromEuler(new THREE.Euler(
          THREE.MathUtils.degToRad(options.rotation.x || 0),
          THREE.MathUtils.degToRad(options.rotation.y || 0),
          THREE.MathUtils.degToRad(options.rotation.z || 0)
        )).toArray()
      : options.rotation;
    const scale = typeof options.scale === "number"
      ? [options.scale, options.scale, options.scale]
      : options.scale;
    return this.transformModel({ anchorId, position: options.position, rotation, scale });
  }

  async setMaterial(options = {}) {
    const anchorId = options.anchorId || options.modelId;
    if (options.color) await this.setModelColor({ anchorId, color: options.color });
    if (options.metalness !== undefined || options.roughness !== undefined || options.opacity !== undefined) {
      await this.setModelMaterial({ anchorId, metalness: options.metalness, roughness: options.roughness, opacity: options.opacity });
    }
    return { success: true };
  }

  async moveModel(options = {}) {
    const anchorId = options.anchorId || options.modelId;
    const hit = await this.hitTest({ x: options.x ?? 0.5, y: options.y ?? 0.5 });
    if (!hit.hit) return hit;
    await this.transformModel({ anchorId, position: hit.position, rotation: hit.rotation });
    return { ...hit, success: true };
  }

  // ============================================================
  // Shadow Configuration
  // ============================================================

  /**
   * Configure shadow appearance for all models
   */
  setShadowConfig(config = {}) {
    if (config.enabled !== undefined) this.config.showShadow = config.enabled;
    if (config.opacity !== undefined) this.config.shadowOpacity = config.opacity;
    if (config.size !== undefined) this.config.shadowSize = config.size;

    // Update existing shadows
    this.modelShadows.forEach((shadow) => {
      if (shadow.material.uniforms) {
        shadow.material.uniforms.opacity.value = this.config.shadowOpacity;
      }
      shadow.visible = this.config.showShadow;
    });
  }

  /**
   * Get current shadow configuration
   */
  getShadowConfig() {
    return {
      enabled: this.config.showShadow,
      opacity: this.config.shadowOpacity,
      size: this.config.shadowSize,
    };
  }

  // ============================================================
  // Screenshot
  // ============================================================

  /**
   * Take a screenshot of the current AR view
   */
  async takeScreenshot(options = {}) {
    if (!this.renderer || !this.scene || !this.camera || !this.session) {
      return { success: false, error: 'AR session not active' };
    }
    if (!this.xrGlBinding || typeof this.xrGlBinding.getCameraImage !== 'function') {
      // The overwhelmingly common cause is that the session was started
      // without the opt-in camera access (SEC-04). Say so once per
      // engine instance in the console, and in every error message, so
      // the fix is discoverable instead of a dead end.
      this._warnScreenshotHintOnce();
      return {
        success: false,
        code: 'CAMERA_CAPTURE_UNAVAILABLE',
        error: 'This browser does not expose WebXR camera frames. AR remains active. — pass enableScreenshots: true to startSession to enable screenshots',
      };
    }
    if (this.pendingScreenshot) {
      return { success: false, code: 'CAPTURE_BUSY', error: 'A screenshot is already being captured' };
    }
    return new Promise((resolve) => { this.pendingScreenshot = { resolve, options }; });
  }

  /**
   * Explain the SEC-04 opt-in once per engine instance: screenshots
   * fail with CAMERA_CAPTURE_UNAVAILABLE when the session was started
   * without `enableScreenshots: true`, and nothing else in the error
   * path tells the developer that. Repeated failures stay quiet.
   */
  _warnScreenshotHintOnce() {
    if (this._screenshotHintWarned) return;
    this._screenshotHintWarned = true;
    console.warn(
      '[ARCore] takeScreenshot: no WebXR camera access in this session. ' +
      'Screenshots need enableScreenshots: true at startSession (camera-access ' +
      'is opt-in and is NOT implied by lightEstimation).'
    );
  }

  async _captureXRFrame(frame, options = {}) {
    const pose = frame.getViewerPose(this.referenceSpace);
    const view = pose?.views?.find(v => v.camera) || pose?.views?.[0];
    if (!view?.camera) {
      // Same root cause as the coded path in takeScreenshot: the
      // session never granted camera-access (SEC-04 opt-in missing).
      this._warnScreenshotHintOnce();
      const err = /** @type {Error & { code?: string }} */ (
        new Error('WebXR camera access was not granted — pass enableScreenshots: true to startSession to enable screenshots')
      );
      err.code = 'CAMERA_CAPTURE_UNAVAILABLE';
      throw err;
    }

    const gl = this.renderer.getContext();
    const texture = this.xrGlBinding.getCameraImage(view.camera);
    if (!texture) throw new Error('Camera frame is unavailable');

    const width = Math.max(1, options.width || window.innerWidth);
    const height = Math.max(1, options.height || window.innerHeight);
    const cameraPixels = this._readCameraTexture(gl, texture, width, height);

    // Render the virtual scene into a transparent offscreen target with the exact
    // tracked XR camera, then alpha-composite it over the camera frame.
    const target = new THREE.WebGLRenderTarget(width, height, {
      format: THREE.RGBAFormat, type: THREE.UnsignedByteType, depthBuffer: true, stencilBuffer: false
    });
    const oldTarget = this.renderer.getRenderTarget();
    const oldXr = this.renderer.xr.enabled;
    const xrCamera = this.renderer.xr.getCamera(this.camera);
    const captureCamera = xrCamera.cameras?.[0] || xrCamera;
    const reticleWasVisible = this.reticle?.visible;
    if (options.includeReticle === false && this.reticle) this.reticle.visible = false;
    try {
      this.renderer.xr.enabled = false;
      this.renderer.setRenderTarget(target);
      this.renderer.setClearColor(0x000000, 0);
      this.renderer.clear(true, true, true);
      this.renderer.render(this.scene, captureCamera);
      const virtualPixels = new Uint8Array(width * height * 4);
      this.renderer.readRenderTargetPixels(target, 0, 0, width, height, virtualPixels);
      return this._composeScreenshot(cameraPixels, virtualPixels, width, height, options);
    } finally {
      if (this.reticle) this.reticle.visible = reticleWasVisible;
      this.renderer.setRenderTarget(oldTarget);
      this.renderer.xr.enabled = oldXr;
      target.dispose();
      this.renderer.resetState();
    }
  }

  _readCameraTexture(gl, cameraTexture, width, height) {
    const vs = `attribute vec2 p; varying vec2 uv; void main(){uv=(p+1.0)*.5; gl_Position=vec4(p,0.,1.);}`;
    const fs = `precision mediump float; varying vec2 uv; uniform sampler2D tex; void main(){gl_FragColor=texture2D(tex, vec2(uv.x, 1.0-uv.y));}`;
    const shader=(type,src)=>{const x=gl.createShader(type);gl.shaderSource(x,src);gl.compileShader(x);if(!gl.getShaderParameter(x,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(x)||'Camera shader failed');return x;};
    const program=gl.createProgram(), v=shader(gl.VERTEX_SHADER,vs), f=shader(gl.FRAGMENT_SHADER,fs);
    gl.attachShader(program,v);gl.attachShader(program,f);gl.linkProgram(program);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program)||'Camera capture program failed');
    const outTex=gl.createTexture(), fb=gl.createFramebuffer(), buf=gl.createBuffer();
    const pixels=new Uint8Array(width*height*4);
    try {
      gl.bindTexture(gl.TEXTURE_2D,outTex);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,width,height,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
      gl.bindFramebuffer(gl.FRAMEBUFFER,fb);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,outTex,0);
      gl.viewport(0,0,width,height);gl.useProgram(program);
      gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
      const loc=gl.getAttribLocation(program,'p');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
      gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,cameraTexture);gl.uniform1i(gl.getUniformLocation(program,'tex'),0);
      gl.drawArrays(gl.TRIANGLE_STRIP,0,4);gl.readPixels(0,0,width,height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
      return pixels;
    } finally {
      gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.deleteBuffer(buf);gl.deleteFramebuffer(fb);gl.deleteTexture(outTex);gl.deleteProgram(program);gl.deleteShader(v);gl.deleteShader(f);
      this.renderer.resetState();
    }
  }

  _composeScreenshot(cameraPixels, virtualPixels, width, height, options = {}) {
    const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d');
    const out=ctx.createImageData(width,height), dst=out.data;
    // Both readbacks originate at the GL bottom-left. Flip rows while composing.
    for(let y=0;y<height;y++){for(let x=0;x<width;x++){
      const src=((height-1-y)*width+x)*4, d=(y*width+x)*4, a=virtualPixels[src+3]/255, ia=1-a;
      dst[d]=virtualPixels[src]*a+cameraPixels[src]*ia;dst[d+1]=virtualPixels[src+1]*a+cameraPixels[src+1]*ia;dst[d+2]=virtualPixels[src+2]*a+cameraPixels[src+2]*ia;dst[d+3]=255;
    }}
    ctx.putImageData(out,0,0);
    const format=options.format==='jpeg'?'jpeg':'png', mime=format==='jpeg'?'image/jpeg':'image/png', quality=options.quality??0.92;
    return { success:true, dataUrl:canvas.toDataURL(mime,quality), width, height, timestamp:new Date().toISOString(), includesCamera:true };
  }

  // ============================================================
  // Plane Visualization Controls
  // ============================================================

  /**
   * Show or hide plane visualization (mesh overlay and dots)
   */
  setPlaneVisualization(visible) {
    this.config.showPlanes = visible;
    this.config.showPlaneDots = visible;

    if (this.planesMeshGroup) {
      this.planesMeshGroup.visible = visible;
    }
    if (this.planeDotsGroup) {
      this.planeDotsGroup.visible = visible;
    }
  }

  /**
   * Get whether plane visualization is enabled
   */
  isPlaneVisualizationEnabled() {
    return this.config.showPlanes || this.config.showPlaneDots;
  }
}
