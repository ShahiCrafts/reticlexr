import type { Metadata } from 'next';
import Link from 'next/link';
import { DocsShell } from '@/components/TopBar';
import { DemoMount } from '@/components/DemoMount';
import { getSearchIndex } from '@/lib/content';

export const metadata: Metadata = {
  title: 'Live demo',
  description:
    'Try reticlexr live in your browser: place, switch, recolour and photograph a model with WebXR.',
};

export default function DemoPage() {
  const searchIndex = getSearchIndex();
  return (
    <DocsShell searchIndex={searchIndex}>
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Live demo</h1>
        <p className="mt-3 leading-relaxed text-slate-600 dark:text-slate-300">
          This is the repository&rsquo;s example playground, running as a page on this site against
          the library source in <code className="font-mono text-[0.85em]">src/</code>. It uses the
          WebXR runtime: surface dots, tap-to-place, pinch/twist gestures, in-place model switching
          with <code className="font-mono text-[0.85em]">switchModel()</code>, runtime colours and
          screenshots.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 p-4 text-sm dark:border-slate-800">
            <strong className="font-semibold text-slate-900 dark:text-white">You need</strong>
            <p className="mt-1 text-slate-600 dark:text-slate-300">
              An ARCore-capable Android phone with current Chrome and Google Play Services for AR.
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 p-4 text-sm dark:border-slate-800">
            <strong className="font-semibold text-slate-900 dark:text-white">HTTPS required</strong>
            <p className="mt-1 text-slate-600 dark:text-slate-300">
              WebXR only runs in secure contexts. This site is served over HTTPS, so you&rsquo;re
              covered. A plain-HTTP copy of the demo will refuse to start.
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 p-4 text-sm dark:border-slate-800">
            <strong className="font-semibold text-slate-900 dark:text-white">Desktop / iOS?</strong>
            <p className="mt-1 text-slate-600 dark:text-slate-300">
              The demo loads and explains itself, but immersive AR won&rsquo;t start: iOS Safari does
              not expose the immersive-ar WebXR flow.
            </p>
          </div>
        </div>

        <div className="mt-8">
          <DemoMount />
        </div>

        <p className="mt-4 text-xs leading-relaxed text-slate-400 dark:text-slate-500">
          Models from Sketchfab: Astronaut by{' '}
          <a href="https://sketchfab.com/3d-models/astronaut-482bf87662fd4b378bcb3a2931d59ca3" className="underline hover:text-slate-600 dark:hover:text-slate-300" target="_blank" rel="noreferrer">
            Antropik
          </a>{' '}
          (CC BY 4.0) · Cute Little Duck by{' '}
          <a href="https://sketchfab.com/3d-models/cute-little-duck-7d731ce780534a01b5a11f72f7e93fd2" className="underline hover:text-slate-600 dark:hover:text-slate-300" target="_blank" rel="noreferrer">
            TadenStar
          </a>{' '}
          (CC BY 4.0) · Southern White Rhino by{' '}
          <a href="https://sketchfab.com/3d-models/model-56a-southern-white-rhino-8e97b62a90f44ce19ea9e3fd421f55b4" className="underline hover:text-slate-600 dark:hover:text-slate-300" target="_blank" rel="noreferrer">
            DigitalLife3D
          </a>{' '}
          (CC BY-NC 4.0). The astronaut and the rhino are animated. The library plays the clips
          embedded in their files.
        </p>

        {/* Owner-supplied recording slot — intentionally empty. */}
        <div className="mt-10 rounded-2xl border-2 border-dashed border-slate-300 p-8 text-center dark:border-slate-700" aria-label="Demo recording placeholder">
          <p className="font-semibold text-slate-700 dark:text-slate-200">Demo GIF: slot reserved</p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-500 dark:text-slate-400">
            TODO (site owner): record the real demo on a device (tap-to-place, pinch, twist,
            in-place switching) and drop the GIF here. Nothing on this page is a mock screenshot;
            the demo above is live.
          </p>
        </div>

        <p className="mt-8 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
          Want the code? The playground source is{' '}
          <code className="font-mono text-[0.85em]">example/src/components/ARPlayground.jsx</code> in
          the repository, and the walkthrough lives in{' '}
          <Link href="/docs/guides/react-integration" className="font-medium text-blue-700 hover:underline dark:text-blue-300">
            React integration
          </Link>
          .
        </p>
      </div>
    </DocsShell>
  );
}
