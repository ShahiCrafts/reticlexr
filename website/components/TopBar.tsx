'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { LuChevronDown, LuChevronRight, LuBox, LuMenu, LuX } from 'react-icons/lu';
import { FaGithub } from 'react-icons/fa6';
import { Search } from './Search';
import { ThemeToggle } from './ThemeToggle';
import { SidebarNav } from './Sidebar';
import type { SearchEntry } from '@/lib/content';

const NAV_LINKS: Array<{ label: string; href: string; icon?: ReactNode }> = [
  { label: 'Docs', href: '/docs/getting-started' },
  { label: 'Demo', href: '/demo', icon: <LuBox size={16} strokeWidth={1.9} aria-hidden /> },
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
  breadcrumb,
}: {
  searchIndex: SearchEntry[];
  currentSlug?: string;
  /** Docs pages pass their section + page title: below lg the header
      gains a breadcrumb bar (hamburger first, then section › page),
      Tailwind-docs style. Without it, the hamburger stays at the left
      of the main row. */
  breadcrumb?: { section?: string; title: string };
}) {
  const [drawer, setDrawer] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white dark:border-white/10 dark:bg-slate-950">
      <div className="mx-auto flex h-14 max-w-[90rem] items-center justify-between gap-3 px-4 sm:gap-8 sm:px-6">
        <div className="flex items-center gap-3">
          {!breadcrumb && (
            <button
              type="button"
              className="rounded-md p-2 text-slate-600 hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-blue-500 lg:hidden dark:text-slate-300 dark:hover:text-white"
              aria-label="Open navigation menu"
              aria-expanded={drawer}
              onClick={() => setDrawer((v) => !v)}
            >
              <LuMenu size={22} strokeWidth={2} aria-hidden />
            </button>
          )}

          <Link href="/" className="flex items-center gap-2.5 focus-visible:outline-2 focus-visible:outline-blue-500" aria-label="reticlexr documentation home">
            <LogoMark />
            <span className="text-[17px] font-bold tracking-tight text-slate-950 dark:text-white">
              reticlexr
            </span>
            <span className="hidden items-center gap-1 rounded-2xl bg-[rgb(3_7_18/0.075)] pb-0.5 pl-2.5 pr-1.5 pt-0.5 text-xs font-medium leading-5 text-[#030712] min-[420px]:inline-flex dark:bg-white/10 dark:text-slate-100">
              v1.1.0
              <LuChevronDown size={12} strokeWidth={2.2} aria-hidden />
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <Search index={searchIndex} />

          <nav aria-label="Primary" className="ml-2 hidden items-center lg:flex">
            {NAV_LINKS.map((item) => {
              const active = item.label === 'Docs' && currentSlug !== undefined;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={`relative inline-flex items-center gap-1.5 px-3 py-2 text-sm leading-6 tracking-normal focus-visible:outline-2 focus-visible:outline-blue-500 ${
                    active
                      ? 'font-semibold text-blue-600 dark:text-blue-400'
                      : 'font-medium text-[#030712] hover:text-black dark:text-slate-300 dark:hover:text-white'
                  }`}
                >
                  {item.icon}
                  {item.label}
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
            <FaGithub size={20} aria-hidden />
          </a>
          <ThemeToggle />
        </div>
      </div>

      {breadcrumb && (
        <div className="border-t border-slate-200 lg:hidden dark:border-white/10">
          <div className="mx-auto flex h-12 max-w-[90rem] items-center gap-2 px-4 sm:px-6">
            <button
              type="button"
              className="-ml-2 shrink-0 rounded-md p-2 text-slate-600 hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-blue-500 dark:text-slate-300 dark:hover:text-white"
              aria-label="Open navigation menu"
              aria-expanded={drawer}
              onClick={() => setDrawer((v) => !v)}
            >
              <LuMenu size={22} strokeWidth={2} aria-hidden />
            </button>
            <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2 text-[15px] leading-6">
              {breadcrumb.section && (
                <>
                  <span className="shrink-0 text-slate-500 dark:text-slate-400">{breadcrumb.section}</span>
                  <LuChevronRight size={16} strokeWidth={2} className="shrink-0 text-slate-400 dark:text-slate-500" aria-hidden />
                </>
              )}
              <span className="truncate font-medium text-slate-950 dark:text-white" aria-current="page">
                {breadcrumb.title}
              </span>
            </nav>
          </div>
        </div>
      )}

      {drawer && (
        <div
          className={`fixed inset-x-0 bottom-0 lg:hidden ${
            breadcrumb ? 'top-[104px] z-40' : 'top-0 z-[60]'
          }`}
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
        >
          <div className="absolute inset-0 bg-slate-950/50" onClick={() => setDrawer(false)} />
          <div className="no-scrollbar absolute inset-y-0 left-0 w-80 overflow-y-auto border-r border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-slate-950">
            <div className="mb-6 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-950 dark:text-white">Documentation</span>
              <button
                type="button"
                onClick={() => setDrawer(false)}
                aria-label="Close navigation menu"
                className="rounded-md p-2 text-slate-600 hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-blue-500 dark:text-slate-300 dark:hover:text-white"
              >
                <LuX size={20} strokeWidth={2} aria-hidden />
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
      <div className="mx-auto flex max-w-[90rem] flex-col gap-2 px-4 text-sm text-slate-500 sm:px-6 dark:text-slate-400">
        <p>
          <span className="font-semibold text-slate-700 dark:text-slate-200">reticlexr</span> — npm package{' '}
          <code className="font-mono text-[0.85em]">reticlexr</code> · MIT © Saugat Shahi
        </p>
        <p>
          Docs for v1.1.0. Every API on this site was checked against the source; anything unverified is
          marked TODO.
        </p>
      </div>
    </footer>
  );
}

export function DocsShell({
  children,
  currentSlug,
  searchIndex,
  breadcrumb,
}: {
  children: ReactNode;
  currentSlug?: string;
  searchIndex: SearchEntry[];
  breadcrumb?: { section?: string; title: string };
}) {
  return (
    <div className="relative flex min-h-screen flex-col bg-white text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-100">
      <TopBar searchIndex={searchIndex} currentSlug={currentSlug} breadcrumb={breadcrumb} />
      <div className="relative z-10 mx-auto w-full max-w-[90rem] flex-1">{children}</div>
      <div className="relative z-10">
        <SiteFooter />
      </div>
    </div>
  );
}
