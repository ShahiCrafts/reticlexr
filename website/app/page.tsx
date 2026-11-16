import Link from 'next/link';
import type { ReactNode } from 'react';
import { LuAtom, LuCheck, LuChevronRight, LuCirclePlay, LuPackage, LuZap } from 'react-icons/lu';
import { FaAndroid, FaGithub } from 'react-icons/fa6';
import { SiCapacitor } from 'react-icons/si';
import { TopBar, SiteFooter } from '@/components/TopBar';
import { PhoneVisual } from '@/components/PhoneVisual';
import { QuickStartCode } from '@/components/QuickStartCode';
import { getSearchIndex } from '@/lib/content';

const GITHUB_URL = 'https://github.com/ShahiCrafts/reticlexr';

function CheckItem({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
      <span
        className="flex h-5 w-5 items-center justify-center rounded-full bg-[#2563eb]"
        aria-hidden="true"
      >
        <LuCheck size={11} strokeWidth={3} color="#ffffff" />
      </span>
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
    icon: <LuPackage size={22} strokeWidth={1.8} aria-hidden />,
  },
  {
    title: 'Simple API',
    body: 'A clean and intuitive API for AR experiences.',
    href: '/docs/api',
    icon: <LuZap size={22} strokeWidth={1.8} aria-hidden />,
  },
  {
    title: 'React Ready',
    body: 'Built for modern React applications.',
    href: '/docs/guides/react-integration',
    icon: <LuAtom size={22} strokeWidth={1.5} aria-hidden />,
  },
  {
    title: 'Open Source',
    body: 'Contribute and grow with us.',
    href: GITHUB_URL,
    external: true,
    icon: <FaGithub size={22} aria-hidden />,
  },
];

function AndroidIcon() {
  return <FaAndroid size={34} color="#3ddc84" aria-hidden />;
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

      <div className="mx-auto w-full max-w-7xl flex-1 px-4 sm:px-8">
        <main className="min-w-0 pb-20 pt-10">
          {/* Hero */}
          <section className="grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-3 py-1.5 font-mono text-xs font-medium uppercase tracking-[0.1em] text-blue-700 dark:border-blue-500/30 dark:bg-transparent dark:text-blue-300">
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
                  <LuCirclePlay size={16} strokeWidth={1.8} aria-hidden />
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
                        <LuChevronRight size={14} strokeWidth={2} aria-hidden />
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
              <p className="font-mono text-xs font-medium uppercase tracking-[0.1em] text-blue-600 dark:text-blue-400">
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
                <LuChevronRight
                  size={16}
                  strokeWidth={2}
                  aria-hidden
                  className="text-slate-300 dark:text-slate-600"
                />
                <div className="flex flex-1 flex-col items-center gap-1.5 text-center">
                  <ArCoreIcon />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">ARCore</span>
                </div>
              </div>
              <div className="mt-5 border-t border-slate-100 pt-4 dark:border-slate-800">
                <p className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                  <LuZap size={15} fill="#2563eb" color="#2563eb" aria-hidden />
                  Built with
                </p>
                <div className="mt-3 flex items-center gap-5 text-sm font-medium text-slate-700 dark:text-slate-200">
                  <span className="inline-flex items-center gap-1.5">
                    <LuAtom
                      size={18}
                      strokeWidth={1.5}
                      aria-hidden
                      className="text-[#2563eb] dark:text-blue-400"
                    />
                    React
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <SiCapacitor size={18} aria-hidden className="text-[#2563eb] dark:text-blue-400" />
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
