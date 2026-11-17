'use client';

import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import Link from 'next/link';
import { LuChevronDown, LuChevronRight, LuBox, LuMenu, LuX, LuMail, LuSparkles, LuHeart, LuCheck, LuTriangleAlert } from 'react-icons/lu';
import { FaGithub } from 'react-icons/fa6';
import { Search } from './Search';
import { ThemeToggle } from './ThemeToggle';
import { SidebarNav } from './Sidebar';
import type { SearchEntry } from '@/lib/content';

const NAV_LINKS: Array<{ label: string; href: string; icon?: ReactNode }> = [
  { label: 'Docs', href: '/docs/getting-started' },
  { label: 'Demo', href: '/demo', icon: <LuBox size={16} strokeWidth={1.9} aria-hidden /> },
];

/** Logo mark: a solid theme-blue hexagon with a white reticle inside —
 *  four arc segments around a centre dot, gaps at the cardinal points.
 *  32px in the header lockup (the wordmark beside it runs 22px). */
export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      className="shrink-0"
      aria-hidden="true"
    >
      <path
        d="M22.00 2.65 Q24.00 1.50 26.00 2.65 L41.49 11.60 Q43.49 12.75 43.49 15.06 L43.49 32.94 Q43.49 35.25 41.49 36.40 L26.00 45.35 Q24.00 46.50 22.00 45.35 L6.51 36.40 Q4.51 35.25 4.51 32.94 L4.51 15.06 Q4.51 12.75 6.51 11.60 L22.00 2.65 Z"
        fill="#2563eb"
      />
      <g fill="none" stroke="#ffffff" strokeWidth="3.3">
        <path d="M32.53 27.45 A9.2 9.2 0 0 1 27.45 32.53" />
        <path d="M20.55 32.53 A9.2 9.2 0 0 1 15.47 27.45" />
        <path d="M15.47 20.55 A9.2 9.2 0 0 1 20.55 15.47" />
        <path d="M27.45 15.47 A9.2 9.2 0 0 1 32.53 20.55" />
      </g>
      <circle cx="24" cy="24" r="2.5" fill="#ffffff" />
    </svg>
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
      <div className="mx-auto flex h-16 max-w-[90rem] items-center justify-between gap-3 px-4 sm:gap-8 sm:px-6">
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

          <Link href="/" className="flex items-center gap-2 focus-visible:outline-2 focus-visible:outline-blue-500" aria-label="reticlexr documentation home">
            <LogoMark />
            <span className="text-[22px] font-bold tracking-tight text-slate-950 dark:text-white">
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
            breadcrumb ? 'top-[112px] z-40' : 'top-0 z-[60]'
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

const FOOTER_COLUMNS: Array<{
  title: string;
  links: Array<{ label: string; href: string; external?: boolean }>;
}> = [
  {
    title: 'Docs',
    links: [
      { label: 'Installation', href: '/docs/getting-started#installation' },
      { label: 'Quick Start', href: '/docs/getting-started' },
      { label: 'API Reference', href: '/docs/api' },
      { label: 'Guides', href: '/docs/guides/react-integration' },
      { label: 'Live demo', href: '/demo' },
    ],
  },
  {
    title: 'Community',
    links: [
      { label: 'GitHub', href: 'https://github.com/ShahiCrafts/reticlexr', external: true },
      { label: 'Contribute', href: '/docs/contributing' },
      { label: 'Changelog', href: '/docs/changelog' },
      { label: 'Issues', href: 'https://github.com/ShahiCrafts/reticlexr/issues', external: true },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Troubleshooting', href: '/docs/guides/troubleshooting' },
      { label: 'Compatibility', href: '/docs/compatibility' },
      { label: 'Known issues', href: '/docs/known-issues' },
      { label: 'License', href: 'https://github.com/ShahiCrafts/reticlexr/blob/main/LICENSE', external: true },
      { label: 'Contact', href: 'mailto:dev.shahi.apps@gmail.com', external: true },
    ],
  },
];

/** Site footer: flat solid background in both themes (no gradients,
 *  no decoration), separated from the page by a hairline border.
 *  Every link resolves to a real page. */
/* Subscribe posts to our own /api/subscribe route, which adds the
   address to the Resend audience server-side. Until the Resend env vars
   exist there, the route answers not_configured and this form falls back
   to the FormSubmit relay (each signup emailed to the maintainer; the
   first signup sends a one-time activation email to click). */
const NEWSLETTER_ENDPOINT = 'https://formsubmit.co/ajax/dev.shahi.apps@gmail.com';

/* Site toast: fixed bottom-centre card (the edit FAB owns the bottom
   right), themed like the search panel, auto-dismisses after 5s. */
function Toast({
  toast,
  onClose,
}: {
  toast: { kind: 'success' | 'error'; title: string; message: string };
  onClose: () => void;
}) {
  const success = toast.kind === 'success';
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-5 z-[80] flex justify-center px-4">
      <div
        role="status"
        className="toast-in pointer-events-auto flex w-full max-w-sm overflow-hidden bg-white text-left shadow-xl shadow-slate-950/10 dark:bg-[#0a0f1c] dark:shadow-black/40"
      >
        <div className={`w-2.5 shrink-0 ${success ? 'bg-emerald-500' : 'bg-rose-500'}`} aria-hidden />
        <div className="flex flex-1 items-start gap-3 p-4">
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white ${
              success ? 'bg-emerald-500' : 'bg-rose-500'
            }`}
          >
            {success ? <LuCheck size={18} aria-hidden /> : <LuX size={18} aria-hidden />}
          </span>
          <div className="min-w-0 flex-1 pt-0.5">
            <p className="text-base font-bold leading-5 text-slate-900 dark:text-white">{toast.title}</p>
            <p className="mt-0.5 text-sm leading-5 text-slate-500 dark:text-slate-400">{toast.message}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Dismiss"
            className="shrink-0 p-0.5 text-slate-400 transition hover:text-slate-700 dark:hover:text-slate-200"
          >
            <LuX size={16} aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}

export function SiteFooter() {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<{ kind: 'success' | 'error'; title: string; message: string } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  const showSuccess = () =>
    setToast({ kind: 'success', title: "You're on the list", message: 'Release news will land in your inbox.' });
  const showError = () =>
    setToast({ kind: 'error', title: "That didn't go through", message: 'Check the address and try again.' });

  const subscribe = async (e: FormEvent) => {
    e.preventDefault();
    const addr = email.trim();
    if (!addr) return;
    setToast(null);
    setSending(true);
    try {
      const own = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: addr }),
      });
      if (own.ok) {
        showSuccess();
        setEmail('');
        return;
      }
      const ownData = await own.json().catch(() => ({}));
      if (ownData.error !== 'not_configured') throw new Error('subscribe failed');
      const res = await fetch(NEWSLETTER_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          email: addr,
          _subject: 'New reticlexr updates subscriber',
          _template: 'table',
          _captcha: 'false',
        }),
      });
      const data = await res.json();
      if (data.success) {
        showSuccess();
        setEmail('');
      } else {
        showError();
      }
    } catch {
      showError();
    } finally {
      setSending(false);
    }
  };

  return (
    <footer className="relative border-t border-slate-200 bg-[#f8fafc] text-slate-500 dark:border-white/10 dark:bg-[#04060d] dark:text-slate-400">
      <div className="relative mx-auto max-w-[90rem] px-4 pt-14 pb-10 sm:px-6">
        <div className="grid gap-12 lg:grid-cols-[1.25fr_2fr_1.35fr]">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2.5">
              <LogoMark size={32} />
              <span className="text-[22px] font-bold tracking-tight text-slate-900 dark:text-white">reticlexr</span>
            </div>
            <p className="mt-4 max-w-xs text-[15px] leading-relaxed">
              Build powerful AR experiences with a lightweight SDK for React and Capacitor.
            </p>
            <div className="mt-6 flex gap-3">
              <a
                href="https://github.com/ShahiCrafts/reticlexr"
                target="_blank"
                rel="noreferrer"
                aria-label="reticlexr on GitHub"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 text-slate-500 transition hover:border-slate-400 hover:text-slate-900 dark:border-white/10 dark:text-slate-300 dark:hover:border-white/25 dark:hover:text-white"
              >
                <FaGithub size={18} aria-hidden />
              </a>
              <a
                href="mailto:dev.shahi.apps@gmail.com"
                aria-label="Email the maintainer"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 text-slate-500 transition hover:border-slate-400 hover:text-slate-900 dark:border-white/10 dark:text-slate-300 dark:hover:border-white/25 dark:hover:text-white"
              >
                <LuMail size={18} aria-hidden />
              </a>
            </div>
          </div>

          {/* Link columns */}
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {FOOTER_COLUMNS.map((col) => (
              <div key={col.title}>
                <h3 className="text-base font-semibold leading-6 text-slate-900 dark:text-white">{col.title}</h3>
                <ul className="mt-4 space-y-2.5 text-sm">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      {link.external ? (
                        <a
                          href={link.href}
                          target={link.href.startsWith('http') ? '_blank' : undefined}
                          rel="noreferrer"
                          className="leading-6 text-slate-500 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                        >
                          {link.label}
                        </a>
                      ) : (
                        <Link href={link.href} className="leading-6 text-slate-500 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
                          {link.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Newsletter: no list provider is connected, so subscribing
              composes a subscription email to the maintainer. */}
          <div className="h-fit rounded-2xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-white/[0.04]">
            <div className="flex items-center gap-3">
              <LuSparkles size={24} className="shrink-0 text-blue-600 dark:text-blue-400" aria-hidden />
              <h3 className="text-lg font-semibold leading-7 text-slate-900 dark:text-white">Stay in the loop</h3>
            </div>
            <p className="mt-2.5 text-[15px] leading-relaxed">
              Get updates on new releases, features and more.
            </p>
            <form onSubmit={subscribe} className="mt-5 flex gap-2">
              <label className="flex flex-1 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 focus-within:border-blue-500 dark:border-white/10 dark:bg-white/[0.05] dark:focus-within:border-blue-500/60">
                <LuMail size={16} className="shrink-0 text-slate-400 dark:text-slate-500" aria-hidden />
                <span className="sr-only">Email address</span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="newsletter-input w-full bg-transparent py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-slate-500"
                />
              </label>
              <button
                type="submit"
                disabled={sending}
                className="shrink-0 rounded-lg bg-blue-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-60"
              >
                {sending ? 'Subscribing…' : 'Subscribe'}
              </button>
            </form>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-14 flex flex-col gap-3 border-t border-slate-200 pt-6 text-sm text-slate-500 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Saugat Shahi. reticlexr is open source under the MIT License.</p>
          <p className="inline-flex items-center gap-1.5">
            Made with
            <LuHeart size={14} className="fill-rose-500 text-rose-500" aria-hidden />
            for Developers
          </p>
        </div>
      </div>
      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}
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
      <div className="relative">
        <SiteFooter />
      </div>
    </div>
  );
}
