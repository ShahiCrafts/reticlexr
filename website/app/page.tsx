import Link from 'next/link';
import type { ReactNode } from 'react';
import { TopBar, SiteFooter } from '@/components/TopBar';
import { HomeSidebar } from '@/components/HomeSidebar';
import { PhoneVisual } from '@/components/PhoneVisual';
import { QuickStartCode } from '@/components/QuickStartCode';
import { getSearchIndex } from '@/lib/content';

const GITHUB_URL = 'https://github.com/ShahiCrafts/reticlexr';

function CheckItem({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
      <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="10" fill="#2563eb" />
        <path d="m8 12.5 2.5 2.5L16 9.5" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {label}
    </span>
  );
}

function CardIcon({ children }: { children: ReactNode }) {
  return (
    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
      {children}
    </span>
  );
}

function LineIcon({ children }: { children: ReactNode }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

const FEATURE_CARDS: Array<{
  title: string;
  body: string;
  href: string;
  external?: boolean;
  icon: ReactNode;
}> = [
  {
    title: 'WebXR Powered',
    body: 'Leverage ARCore on Android with ease.',
    href: '/docs/concepts/webxr-vs-native',
    icon: (
      <LineIcon>
        <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
        <path d="m3.3 7 8.7 5 8.7-5" />
        <path d="M12 22V12" />
      </LineIcon>
    ),
  },
  {
    title: 'Simple API',
    body: 'A clean and intuitive API for AR experiences.',
    href: '/docs/api',
    icon: (
      <LineIcon>
        <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
      </LineIcon>
    ),
  },
  {
    title: 'React Ready',
    body: 'Built for modern React applications.',
    href: '/docs/guides/react-integration',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
        <ellipse cx="12" cy="12" rx="10" ry="4.2" />
        <ellipse cx="12" cy="12" rx="10" ry="4.2" transform="rotate(60 12 12)" />
        <ellipse cx="12" cy="12" rx="10" ry="4.2" transform="rotate(120 12 12)" />
      </svg>
    ),
  },
  {
    title: 'Open Source',
    body: 'Contribute and grow with us.',
    href: GITHUB_URL,
    external: true,
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.55v-2.15c-3.2.7-3.87-1.36-3.87-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.03 1.75 2.69 1.25 3.34.95.1-.74.4-1.25.72-1.53-2.55-.29-5.23-1.28-5.23-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.78 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.41-2.69 5.38-5.25 1.27.41 2.62.41 1.08 0 2.18-.01 2.41 0 .17.11.37.53.77 1.58 4.57-1.52 7.86-5.83 7.86-10.91C23.5 5.65 18.35.5 12 .5z" />
      </svg>
    ),
  },
];

function AndroidIcon() {
  return (
    <svg width="34" height="34" viewBox="0 0 24 24" aria-hidden="true">
      <g fill="#3ddc84">
        <path d="M5 10.2C5 6.9 8.1 4.6 12 4.6s7 2.3 7 5.6z" />
        <rect x="5" y="10.8" width="14" height="7.6" rx="1.4" />
        <rect x="2.7" y="11.4" width="1.9" height="6" rx="0.95" />
        <rect x="19.4" y="11.4" width="1.9" height="6" rx="0.95" />
        <rect x="8.4" y="18.6" width="2.3" height="3.2" rx="1.1" />
        <rect x="13.3" y="18.6" width="2.3" height="3.2" rx="1.1" />
        <path d="M7.6 4.2 6.2 2M16.4 4.2 17.8 2" stroke="#3ddc84" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      </g>
      <circle cx="9.4" cy="8" r="1" fill="#ffffff" />
      <circle cx="14.6" cy="8" r="1" fill="#ffffff" />
    </svg>
  );
}

function ArCoreIcon() {
  return (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="1.7" strokeLinejoin="round" aria-hidden="true">
      <polygon points="12,2.5 20.5,7.2 20.5,16.8 12,21.5 3.5,16.8 3.5,7.2" />
      <polygon points="12,7.5 16.8,16.5 7.2,16.5" />
    </svg>
  );
}

export default function LandingPage() {
  const searchIndex = getSearchIndex();
  return (
    <div className="flex min-h-screen flex-col bg-white text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-100">
      <TopBar searchIndex={searchIndex} />

      <div className="mx-auto flex w-full max-w-[90rem] flex-1">
        <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-72 shrink-0 overflow-y-auto border-r border-slate-200 px-5 py-8 lg:block dark:border-slate-800">
          <HomeSidebar />
        </aside>

        <main className="min-w-0 flex-1 px-4 pb-20 pt-10 sm:px-8 lg:px-12">
          {/* Hero */}
          <section className="grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-700 dark:border-blue-500/30 dark:bg-transparent dark:text-blue-300">
                <span className="flex h-5 w-5 items-center justify-center rounded-md bg-blue-600 text-[9px] font-bold normal-case tracking-normal text-white" aria-hidden="true">
                  AR
                </span>
                High-level AR SDK • React + Capacitor
              </p>
              <h1 className="mt-6 text-5xl font-bold leading-[1.05] tracking-tight text-[#0a0a0b] sm:text-6xl dark:text-white">
                Put <span className="text-blue-600 dark:text-blue-400">real products</span> into
                your customers&rsquo; rooms.
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-600 dark:text-slate-300">
                reticlexr absorbs WebXR sessions, Three.js scenes, GLTF loading, hit testing,
                plane visualisation and multi-touch gesture math behind a small API — so your app
                can focus on products and UI.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  href="/docs/getting-started"
                  className="rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                >
                  Get Started →
                </Link>
                <Link
                  href="/demo"
                  className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-700 focus-visible:outline-2 focus-visible:outline-blue-500 dark:border-slate-700 dark:text-slate-200 dark:hover:border-blue-500 dark:hover:text-blue-300"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                    <circle cx="12" cy="12" r="9.2" />
                    <path d="M10 8.5v7l6-3.5z" fill="currentColor" stroke="none" />
                  </svg>
                  Open Live Demo
                </Link>
              </div>
              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2">
                <CheckItem label="ARCore Ready" />
                <CheckItem label="React Friendly" />
                <CheckItem label="Smooth Performance" />
              </div>
            </div>

            <PhoneVisual />
          </section>

          {/* Feature cards */}
          <section className="mt-20" aria-label="Highlights">
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {FEATURE_CARDS.map((card) => {
                const inner = (
                  <>
                    <div className="flex items-start justify-between">
                      <CardIcon>{card.icon}</CardIcon>
                      <span className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 text-slate-400 transition-colors group-hover:border-blue-200 group-hover:text-blue-600 dark:border-slate-700 dark:group-hover:border-blue-500/40 dark:group-hover:text-blue-400">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="m9 6 6 6-6 6" />
                        </svg>
                      </span>
                    </div>
                    <h3 className="mt-4 font-semibold text-slate-900 dark:text-white">{card.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{card.body}</p>
                  </>
                );
                const classes =
                  'group block rounded-2xl border border-slate-200 bg-white p-5 focus-visible:outline-2 focus-visible:outline-blue-500 dark:border-slate-800 dark:bg-slate-900';
                return card.external ? (
                  <a key={card.title} href={card.href} target="_blank" rel="noreferrer" className={classes}>
                    {inner}
                  </a>
                ) : (
                  <Link key={card.title} href={card.href} className={classes}>
                    {inner}
                  </Link>
                );
              })}
            </div>
          </section>

          {/* Quick start */}
          <section className="mt-24 grid items-start gap-10 lg:grid-cols-[0.85fr_1.45fr_1fr]" aria-label="Quick start">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-400">
                — Quick Start
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                Get started in minutes
              </h2>
              <p className="mt-3 leading-relaxed text-slate-600 dark:text-slate-300">
                Add AR to your React app with just a few lines of code.
              </p>
              <Link
                href="/docs/getting-started"
                className="mt-6 inline-block rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
              >
                View Installation Guide →
              </Link>
            </div>

            <QuickStartCode />

            <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <p className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                <span className="h-0.5 w-4 bg-blue-600" aria-hidden="true" />
                Works on
              </p>
              <div className="mt-4 flex items-center gap-3">
                <div className="flex flex-1 flex-col items-center gap-1.5 text-center">
                  <AndroidIcon />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Android</span>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-slate-300 dark:text-slate-600" aria-hidden="true">
                  <path d="m9 6 6 6-6 6" />
                </svg>
                <div className="flex flex-1 flex-col items-center gap-1.5 text-center">
                  <ArCoreIcon />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">ARCore</span>
                </div>
              </div>
              <div className="mt-5 border-t border-slate-100 pt-4 dark:border-slate-800">
                <p className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="#2563eb" aria-hidden="true">
                    <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
                  </svg>
                  Built with
                </p>
                <div className="mt-3 flex items-center gap-5 text-sm font-medium text-slate-700 dark:text-slate-200">
                  <span className="inline-flex items-center gap-1.5">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="1.5" aria-hidden="true" className="dark:stroke-blue-400">
                      <circle cx="12" cy="12" r="1.6" fill="#2563eb" stroke="none" />
                      <ellipse cx="12" cy="12" rx="10" ry="4.2" />
                      <ellipse cx="12" cy="12" rx="10" ry="4.2" transform="rotate(60 12 12)" />
                      <ellipse cx="12" cy="12" rx="10" ry="4.2" transform="rotate(120 12 12)" />
                    </svg>
                    React
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="1.6" aria-hidden="true" className="dark:stroke-blue-400">
                      <rect x="3" y="3" width="18" height="18" rx="5" />
                      <path d="M13 6 8.5 13H11l-1 5 4.5-7H12z" fill="#2563eb" stroke="none" />
                    </svg>
                    Capacitor
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Honest native note */}
          <section className="mt-20" aria-label="Platform notes">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
              <h2 className="font-semibold text-slate-900 dark:text-white">
                Native Android: session + hit-test today; model rendering runs on WebXR
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                Two runtimes sit behind the package, and they are not at feature parity yet: models
                render in the WebXR runtime, while the native Capacitor plugin provides ARCore
                session management, hit testing and surface events. The live demo runs in your
                browser — open it on an ARCore-capable Android phone over HTTPS to place a model in
                your room.
              </p>
              <p className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium">
                <Link href="/docs/concepts/webxr-vs-native" className="text-blue-700 hover:underline focus-visible:outline-2 focus-visible:outline-blue-500 dark:text-blue-300">
                  WebXR vs native ARCore
                </Link>
                <Link href="/docs/known-issues" className="text-blue-700 hover:underline focus-visible:outline-2 focus-visible:outline-blue-500 dark:text-blue-300">
                  Known issues &amp; roadmap
                </Link>
                <Link href="/docs/compatibility" className="text-blue-700 hover:underline focus-visible:outline-2 focus-visible:outline-blue-500 dark:text-blue-300">
                  Compatibility
                </Link>
              </p>
            </div>
          </section>
        </main>
      </div>

      <SiteFooter />
    </div>
  );
}
