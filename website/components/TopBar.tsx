'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { Search } from './Search';
import { ThemeToggle } from './ThemeToggle';
import { SidebarNav } from './Sidebar';
import type { SearchEntry } from '@/lib/content';

const NAV_LINKS = [
  { label: 'Docs', href: '/docs/getting-started' },
  { label: 'Demo', href: '/demo' },
  { label: 'API', href: '/docs/api' },
  { label: 'Guides', href: '/docs/guides/react-integration' },
  { label: 'Changelog', href: '/docs/changelog' },
];

/** Reticle / target logo mark: white crosshair target on a blue tile. */
export function LogoMark({ size = 34 }: { size?: number }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-[9px] bg-blue-600"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg
        width={size * 0.68}
        height={size * 0.68}
        viewBox="0 0 24 24"
        fill="none"
        stroke="#ffffff"
        strokeWidth="1.9"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="5.4" />
        <path d="M12 2.6v3.6M12 17.8v3.6M2.6 12h3.6M17.8 12h3.6" />
        <circle cx="12" cy="12" r="1.25" fill="#ffffff" stroke="none" />
      </svg>
    </span>
  );
}

export function TopBar({
  searchIndex,
  currentSlug,
  translucent = false,
}: {
  searchIndex: SearchEntry[];
  currentSlug?: string;
  /** Render the bar translucent so the docs header wash shows through. */
  translucent?: boolean;
}) {
  const [drawer, setDrawer] = useState(false);

  return (
    <header
      className={`sticky top-0 z-50 border-b border-slate-200 dark:border-white/10 ${
        translucent
          ? 'bg-white/80 backdrop-blur-md dark:bg-slate-950/75'
          : 'bg-white dark:bg-slate-950'
      }`}
    >
      <div className="mx-auto flex h-[60px] max-w-[90rem] items-center gap-3 px-4 sm:px-6 lg:px-8">
        <button
          type="button"
          className="rounded-md p-2 text-slate-600 hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-blue-500 lg:hidden dark:text-slate-300 dark:hover:text-white"
          aria-label="Open navigation menu"
          aria-expanded={drawer}
          onClick={() => setDrawer(true)}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <Link href="/" className="flex items-center gap-2.5 focus-visible:outline-2 focus-visible:outline-blue-500" aria-label="reticlexr documentation home">
          <LogoMark />
          <span className="text-[17px] font-bold tracking-tight text-slate-950 dark:text-white">
            reticlexr
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-2.5 py-0.5 text-xs font-medium text-slate-500 dark:border-white/15 dark:text-slate-400">
            v1.0.0
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </span>
        </Link>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <Search index={searchIndex} />

          <nav aria-label="Primary" className="ml-2 hidden items-center lg:flex">
            {NAV_LINKS.map((item) => {
              const active = item.label === 'Docs' && currentSlug !== undefined;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={`relative px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-blue-500 ${
                    active
                      ? 'font-semibold text-blue-600 dark:text-blue-400'
                      : 'font-medium text-slate-700 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white'
                  }`}
                >
                  {item.label}
                  {active && (
                    <span className="absolute inset-x-3 -bottom-3 h-0.5 bg-blue-600 dark:bg-blue-400" aria-hidden="true" />
                  )}
                </Link>
              );
            })}
          </nav>

          <a
            href="https://github.com/ShahiCrafts/reticlexr"
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub repository"
            className="rounded-md p-2 text-slate-600 hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-blue-500 dark:text-slate-300 dark:hover:text-white"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.55v-2.15c-3.2.7-3.87-1.36-3.87-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.03 1.75 2.69 1.25 3.34.95.1-.74.4-1.25.72-1.53-2.55-.29-5.23-1.28-5.23-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.78 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.41-2.69 5.38-5.25 1.27.41 2.62.41 1.08 0 2.18-.01 2.41 0 .17.11.37.53.77 1.58 4.57-1.52 7.86-5.83 7.86-10.91C23.5 5.65 18.35.5 12 .5z" />
            </svg>
          </a>
          <ThemeToggle />
        </div>
      </div>

      {drawer && (
        <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation menu">
          <div className="absolute inset-0 bg-slate-950/50" onClick={() => setDrawer(false)} />
          <div className="absolute inset-y-0 left-0 w-72 overflow-y-auto border-r border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-slate-950">
            <div className="mb-6 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-950 dark:text-white">Documentation</span>
              <button
                type="button"
                onClick={() => setDrawer(false)}
                aria-label="Close navigation menu"
                className="rounded-md p-2 text-slate-600 hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-blue-500 dark:text-slate-300 dark:hover:text-white"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <SidebarNav currentSlug={currentSlug} onNavigate={() => setDrawer(false)} />
          </div>
        </div>
      )}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 py-8 dark:border-white/10">
      <div className="mx-auto flex max-w-[90rem] flex-col gap-2 px-4 text-sm text-slate-500 sm:px-6 lg:px-8 dark:text-slate-400">
        <p>
          <span className="font-semibold text-slate-700 dark:text-slate-200">reticlexr</span> — npm package{' '}
          <code className="font-mono text-[0.85em]">reticlexr</code> · MIT © Saugat Shahi
        </p>
        <p>
          Docs for v1.0.0. Every API on this site was checked against the source; anything unverified is
          marked TODO.
        </p>
      </div>
    </footer>
  );
}

/** Decorative header wash for docs pages: soft pale-blue radial wash in the
    top-right with two thin swoosh curves arcing across it. Docs-only. */
function HeaderWash() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[27rem] overflow-hidden">
      <div className="header-wash absolute inset-0" />
      <svg
        className="absolute right-0 top-0 h-full w-[min(62rem,85%)] opacity-90 dark:opacity-40"
        viewBox="0 0 900 430"
        preserveAspectRatio="none"
        fill="none"
        aria-hidden="true"
      >
        <path d="M110 -20 C 370 55, 560 165, 920 235" stroke="#ffffff" strokeWidth="1.6" />
        <path d="M205 -30 C 445 85, 640 225, 930 330" stroke="#bfdbfe" strokeWidth="1.4" />
        <path d="M40 -12 C 310 35, 520 125, 905 185" stroke="#ffffff" strokeWidth="1.1" opacity="0.55" />
      </svg>
    </div>
  );
}

export function DocsShell({
  children,
  currentSlug,
  searchIndex,
  hatch = false,
  wash = false,
}: {
  children: ReactNode;
  currentSlug?: string;
  searchIndex: SearchEntry[];
  /** Flank the shell with diagonal hatch gutters on very wide screens (docs only). */
  hatch?: boolean;
  /** Soft blue gradient wash behind the header + title zone (docs pages only). */
  wash?: boolean;
}) {
  return (
    <div className="relative flex min-h-screen flex-col bg-white text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-100">
      {wash && <HeaderWash />}
      {hatch && (
        <>
          <div
            aria-hidden="true"
            className="hatch-strip pointer-events-none fixed inset-y-0 left-0 z-[55] hidden w-7 border-r border-slate-200 min-[1600px]:block dark:border-white/10"
          />
          <div
            aria-hidden="true"
            className="hatch-strip pointer-events-none fixed inset-y-0 right-0 z-[55] hidden w-7 border-l border-slate-200 min-[1600px]:block dark:border-white/10"
          />
        </>
      )}
      <TopBar searchIndex={searchIndex} currentSlug={currentSlug} translucent={wash} />
      <div className="relative z-10 mx-auto w-full max-w-[90rem] flex-1 px-4 sm:px-6 lg:px-8">{children}</div>
      <div className="relative z-10">
        <SiteFooter />
      </div>
    </div>
  );
}
