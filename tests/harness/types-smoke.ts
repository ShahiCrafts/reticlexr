// Consumer smoke test for the shipped declarations (API-06 / PKG-02).
// Run: npx tsc -p tests/harness/tsconfig.smoke.json
// Consumer smoke test for the shipped declarations (API-06 / PKG-02).
// Compiled with tsc against src/index.d.ts via a paths mapping.
import ARCore, {
  createARView,
  createARGestureController,
  useARCore,
  type ARView,
  type ARCoreHitTestResult,
  type EngineFrameEvent,
} from 'reticlexr';

async function facade() {
  const support = await ARCore.checkSupport();
  const supported: boolean = support.supported;
  await ARCore.startSession({ planeDetection: true, lightEstimation: true });
  const hit: ARCoreHitTestResult = await ARCore.hitTest({ x: 0.5, y: 0.25 });
  if (hit.hit && hit.position) {
    const px: number = hit.position[0];
    void px;
  }
  const placed = await ARCore.placeModel({ modelPath: 'models/chair.glb' });
  const modelId: string = placed.modelId;
  await ARCore.setTransform({ modelId, rotation: { y: 90 }, scale: 2 });
  await ARCore.setMaterial({ modelId, color: '#7D8B67' });
  await ARCore.moveModel({ modelId, x: 0.25, y: 0.75 });
  await ARCore.removeModel({ modelId });
  const off = ARCore.on('modelPlaced', (data) => void data);
  off();
  await ARCore.stopSession();
  void supported;
}

async function view() {
  const ar: ARView = createARView({ overlay: document.createElement('div') });
  await ar.create({ showReticle: true, enableScreenshots: true });
  // BUG-01 shapes: object position, Euler rotation, numeric scale
  const placed = await ar.placeModel('/models/sofa.glb', {
    position: { x: 0, y: 0, z: -2 },
    rotation: { x: 0, y: Math.PI / 4, z: 0 },
    scale: 1.5,
  });
  if (placed.success) {
    const id: string | undefined = placed.modelId;
    void id;
  }
  await ar.setScale(2); // API-08 clamp range applies
  await ar.rotateBy(0.5);
  await ar.setColor('#68705b');
  const shot = await ar.takeScreenshot({ format: 'jpeg', quality: 0.85 });
  if (shot.success) {
    const url: string = shot.dataUrl;
    void url;
  } else {
    const code: string | undefined = shot.code;
    void code;
  }
  const offFrame = ar.onFrame((e: EngineFrameEvent) => {
    if (e.type === 'modelPlaced') {
      const aid: string = e.anchorId;
      void aid;
    }
  });
  offFrame();
  await ar.destroy();
}

function hook() {
  const ar = useARCore();
  const supported: boolean | null = ar.isSupported;
  void supported;
  void ar.startSession({ domOverlay: document.createElement('div'), enableScreenshots: true });
  void ar.placeModel('/models/chair.glb', { x: 0, y: 0, z: -1 }, { x: 0, y: 0, z: 0 }, { x: 1, y: 1, z: 1 });
  void ar.hitTest(0.5, 0.5);
}

function gestures() {
  const controller = createARGestureController({
    element: document.createElement('div'),
    onTap: ({ x, y }) => void (x + y),
    onPinch: ({ factor }) => void factor,
    onRotate: ({ delta }) => void delta,
  });
  controller.destroy();
}

// Negative cases: these MUST be type errors.
// @ts-expect-error hitTest requires numeric x/y
void ARCore.hitTest({ x: 'left', y: 0.5 });
// @ts-expect-error placeModel requires modelPath
void ARCore.placeModel({});
// @ts-expect-error setScale takes a number
void (async () => { const ar = createARView(); await ar.setScale('big'); });
// @ts-expect-error gesture element must be an HTMLElement
createARGestureController({ element: 'not-an-element' });

void facade();
void view();
hook();
gestures();
