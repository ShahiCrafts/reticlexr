'use client';

import dynamic from 'next/dynamic';

// Client-only mount for the demo: WebXR and the library's import-time
// side effects need a browser, so DemoClient is never server-rendered.
const DemoClient = dynamic(() => import('./DemoClient'), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-[560px] w-full items-center justify-center rounded-2xl bg-slate-950 text-sm text-slate-300">
      Loading the AR demo…
    </div>
  ),
});

export function DemoMount() {
  return <DemoClient />;
}
