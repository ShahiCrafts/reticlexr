'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { Search } from './Search';
import { ThemeToggle } from './ThemeToggle';
import { SidebarNav } from './Sidebar';
import type { SearchEntry } from '@/lib/content';

export function TopBar({ searchIndex, currentSlug }: { searchIndex: SearchEntry[]; currentSlug?: string }) {
  const [drawer, setDrawer] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/85 backdrop-blur dark:border-slate-800 dark:bg-slate-950/85">
      <div className="mx-auto flex h-16 max-w-[90rem] items-center gap-3 px-4 sm:px-6 lg:px-8">
        <button
          type="button"
          className="rounded-md p-2 text-slate-600 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-violet-500 lg:hidden dark:text-slate-300 dark:hover:bg-slate-800"
          aria-label="Open navigation menu"
          aria-expanded={drawer}
          onClick={() => setDrawer(true)}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <Link href="/" className="flex items-center gap-2.5 focus-visible:outline-2 focus-visible:outline-violet-500" aria-label="arcore-react documentation home">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 text-sm font-bold text-white" aria-hidden="true">
            AR
          </span>
          <span className="text-base font-semibold tracking-tight text-slate-900 dark:text-white">
            arcore-react
          </span>
          <span className="rounded-full border border-violet-300 bg-violet-50 px-2 py-0.5 text-xs font-semibold text-violet-700 dark:border-violet-500/40 dark:bg-violet-500/10 dark:text-violet-300">
            v1.0.0
          </span>
        </Link>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-3">
          <Search index={searchIndex} />
          <nav aria-label="External links" className="flex items-center gap-1">
            <a
              href="https://www.npmjs.com/package/capacitor-arcore"
              target="_blank"
              rel="noreferrer"
              className="hidden rounded-md px-2.5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-violet-500 sm:block dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              npm
            </a>
            <a
              href="https://github.com/ShahiCrafts/arcore-react"
              target="_blank"
              rel="noreferrer"
              aria-label="GitHub repository"
              className="rounded-md p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-violet-500 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.55v-2.15c-3.2.7-3.87-1.36-3.87-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.03 1.75 2.69 1.25 3.34.95.1-.74.4-1.25.72-1.53-2.55-.29-5.23-1.28-5.23-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.78 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.41-2.69 5.38-5.25 1.27.41 2.62.41 1.08 0 2.18-.01 2.41 0 .17.11.37.53.77 1.58 4.57-1.52 7.86-5.83 7.86-10.91C23.5 5.65 18.35.5 12 .5z" />
              </svg>
            </a>
            <ThemeToggle />
          </nav>
        </div>
      </div>

      {drawer && (
        <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation menu">
          <div className="absolute inset-0 bg-slate-950/50" onClick={() => setDrawer(false)} />
          <div className="absolute inset-y-0 left-0 w-72 overflow-y-auto bg-white p-5 shadow-xl dark:bg-slate-950">
            <div className="mb-5 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-900 dark:text-white">Documentation</span>
              <button
                type="button"
                onClick={() => setDrawer(false)}
                aria-label="Close navigation menu"
                className="rounded-md p-2 text-slate-600 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-violet-500 dark:text-slate-300 dark:hover:bg-slate-800"
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
    <footer className="border-t border-slate-200 py-8 dark:border-slate-800">
      <div className="mx-auto flex max-w-[90rem] flex-col gap-2 px-4 text-sm text-slate-500 sm:px-6 lg:px-8 dark:text-slate-400">
        <p>
          <span className="font-semibold text-slate-700 dark:text-slate-200">arcore-react</span> — npm package{' '}
          <code className="font-mono text-[0.85em]">capacitor-arcore</code> · MIT © Saugat Shahi
        </p>
        <p>
          Docs for v1.0.0. Every API on this site was checked against the source; anything unverified is
          marked TODO.
        </p>
      </div>
    </footer>
  );
}

export function DocsShell({ children, currentSlug, searchIndex }: { children: ReactNode; currentSlug?: string; searchIndex: SearchEntry[] }) {
  return (
    <div className="flex min-h-screen flex-col bg-white text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-100">
      <TopBar searchIndex={searchIndex} currentSlug={currentSlug} />
      <div className="mx-auto w-full max-w-[90rem] flex-1 px-4 sm:px-6 lg:px-8">{children}</div>
      <SiteFooter />
    </div>
  );
}
