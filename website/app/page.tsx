import Link from 'next/link';
import { DocsShell } from '@/components/TopBar';
import { CopyCommand } from '@/components/InstallTabs';
import { getSearchIndex } from '@/lib/content';

const FEATURES: Array<{ title: string; body: string }> = [
  {
    title: 'Surface detection & reticle',
    body: 'WebXR plane detection with a dotted plane visualisation and a centre placement reticle that tracks the surface in front of the camera.',
  },
  {
    title: 'Tap to place',
    body: 'Place GLB/GLTF models on detected surfaces with one call. Models are anchored, so they stay put as the user moves.',
  },
  {
    title: 'Preloading & caching',
    body: 'Preload product models up front; the engine caches the parsed GLTF so repeat placements and switches clone from memory instead of the network.',
  },
  {
    title: 'Gestures built in',
    body: 'One-finger tap to place, pinch to scale, two-finger twist to rotate — Pointer Events based, with data-ui zones so your buttons never trigger gestures.',
  },
  {
    title: 'In-place model switching',
    body: 'switchModel() swaps the placed product while keeping its placement, scale and rotation, so shoppers can compare variants without re-aiming.',
  },
  {
    title: 'Runtime colors & textures',
    body: 'Recolor the placed model or apply your own texture images at runtime — the building blocks for fabric and finish pickers.',
  },
  {
    title: 'AR screenshots',
    body: 'Capture the composited AR view (camera + model) to a PNG/JPEG data URL where the browser supports WebXR camera access.',
  },
  {
    title: 'React DOM overlays',
    body: 'Your product UI — price tags, variant pickers, add-to-cart — renders as regular DOM on top of the immersive view.',
  },
  {
    title: 'Native Android session layer',
    body: 'On Android, a Capacitor plugin wraps ARCore for sessions, hit testing and surface events. Model rendering today happens in the WebXR runtime — see WebXR vs native for the honest split.',
  },
];

const SAMPLE = `import { createARView } from 'capacitor-arcore';

const ar = createARView({
  overlay: document.querySelector('#ar-overlay'),
});

await ar.create({ showReticle: true, showPlaneDots: true });
await ar.preloadModels(['/models/sofa.glb', '/models/chair.glb']);
await ar.placeModel('/models/sofa.glb');

// Later, in place — placement, scale and rotation carry over:
await ar.switchModel('/models/chair.glb');`;

export default function LandingPage() {
  const searchIndex = getSearchIndex();
  return (
    <DocsShell searchIndex={searchIndex}>
      {/* Hero */}
      <section className="mx-auto max-w-3xl pb-16 pt-16 text-center sm:pt-24">
        <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-violet-600 dark:text-violet-400">
          High-level AR SDK · React + Capacitor
        </p>
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl dark:text-white">
          Put real products into your customers&rsquo; rooms.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-slate-600 dark:text-slate-300">
          arcore-react absorbs WebXR sessions, Three.js scenes, GLTF loading, hit testing, plane
          visualisation and multi-touch gesture math behind a small API — so your app can focus on
          products and UI.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <CopyCommand commandText="npm install capacitor-arcore" />
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/docs/getting-started"
            className="rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-violet-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500"
          >
            Get started →
          </Link>
          <Link
            href="/demo"
            className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:border-violet-400 hover:text-violet-700 focus-visible:outline-2 focus-visible:outline-violet-500 dark:border-slate-700 dark:text-slate-200 dark:hover:border-violet-500 dark:hover:text-violet-300"
          >
            Open the live demo
          </Link>
          <Link
            href="/docs/api"
            className="rounded-lg px-5 py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-violet-500 dark:text-slate-300 dark:hover:text-white"
          >
            API reference
          </Link>
        </div>
        <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">
          The demo runs in your browser — open it on an ARCore-capable Android phone over HTTPS to
          place a model in your room.
        </p>
      </section>

      {/* Code sample */}
      <section className="mx-auto max-w-3xl pb-16" aria-label="Code sample">
        <figure className="overflow-hidden rounded-lg border border-slate-800 bg-[#0d1526]" data-rehype-pretty-code-figure>
          <figcaption className="border-b border-slate-800 bg-slate-900 px-4 py-2 font-mono text-xs text-slate-400">
            quick-start.js
          </figcaption>
          <pre className="overflow-x-auto p-4 text-sm leading-7 text-slate-100">
            <code>{SAMPLE}</code>
          </pre>
        </figure>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-5xl pb-20" aria-label="Features">
        <h2 className="text-center text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          What the SDK handles for you
        </h2>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-slate-200 p-5 dark:border-slate-800"
            >
              <h3 className="font-semibold text-slate-900 dark:text-white">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{f.body}</p>
            </div>
          ))}
        </div>
        <p className="mx-auto mt-10 max-w-2xl text-center text-sm leading-relaxed text-slate-500 dark:text-slate-400">
          Two runtimes sit behind the package: a WebXR runtime that renders models in the browser,
          and a native Android ARCore layer reached through Capacitor. They are not at feature
          parity yet —{' '}
          <Link href="/docs/concepts/webxr-vs-native" className="font-medium text-violet-700 hover:underline dark:text-violet-300">
            WebXR vs native ARCore
          </Link>{' '}
          explains exactly what each one does today.
        </p>
      </section>
    </DocsShell>
  );
}
