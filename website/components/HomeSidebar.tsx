import Link from 'next/link';
import type { ReactNode } from 'react';

/**
 * Home-page left sidebar, modelled on the owner's reference layout.
 * Groups and labels follow the reference; every href is a real route
 * (several reference entries map onto the same docs page, which is the
 * finest-grained route that exists for them).
 */

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0"
    >
      {children}
    </svg>
  );
}

const HomeIcon = (
  <Icon>
    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <path d="M9 22V12h6v10" />
  </Icon>
);

const DownloadIcon = (
  <Icon>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <path d="m7 10 5 5 5-5" />
    <path d="M12 15V3" />
  </Icon>
);

const ZapIcon = (
  <Icon>
    <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
  </Icon>
);

const ScanIcon = (
  <Icon>
    <path d="M3 7V5a2 2 0 0 1 2-2h2" />
    <path d="M17 3h2a2 2 0 0 1 2 2v2" />
    <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
    <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
    <path d="M7 12h10" />
  </Icon>
);

const BoxIcon = (
  <Icon>
    <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
    <path d="m3.3 7 8.7 5 8.7-5" />
    <path d="M12 22V12" />
  </Icon>
);

const PointerIcon = (
  <Icon>
    <path d="m4 3 7.5 18 2.4-7.6L21 11z" />
    <path d="M13.5 13.5 19 19" />
  </Icon>
);

const GaugeIcon = (
  <Icon>
    <path d="m12 14 4-4" />
    <path d="M3.34 19a10 10 0 1 1 17.32 0" />
  </Icon>
);

const CodeIcon = (
  <Icon>
    <path d="m16 18 6-6-6-6" />
    <path d="m8 6-6 6 6 6" />
  </Icon>
);

const PhoneIcon = (
  <Icon>
    <rect x="7" y="2" width="10" height="20" rx="2" />
    <path d="M12 18h.01" />
  </Icon>
);

const BracesIcon = (
  <Icon>
    <path d="M8 3H7a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2 2 2 0 0 1 2 2v5c0 1.1.9 2 2 2h1" />
    <path d="M16 21h1a2 2 0 0 0 2-2v-5c0-1.1.9-2 2-2a2 2 0 0 1-2-2V5a2 2 0 0 0-2-2h-1" />
  </Icon>
);

interface HomeNavItem {
  label: string;
  href: string;
  icon: ReactNode;
  active?: boolean;
}

const GROUPS: Array<{ title: string; items: HomeNavItem[] }> = [
  {
    title: 'Getting Started',
    items: [
      { label: 'Introduction', href: '/docs/getting-started', icon: HomeIcon, active: true },
      { label: 'Installation', href: '/docs/getting-started', icon: DownloadIcon },
      { label: 'Quick Start', href: '/docs/getting-started', icon: ZapIcon },
    ],
  },
  {
    title: 'Guides',
    items: [
      { label: 'AR Sessions', href: '/docs/concepts/lifecycle', icon: ScanIcon },
      { label: '3D Models', href: '/docs/guides/model-preloading-and-switching', icon: BoxIcon },
      { label: 'UI & Interactions', href: '/docs/guides/overlays', icon: PointerIcon },
      { label: 'Performance', href: '/docs/guides/troubleshooting', icon: GaugeIcon },
    ],
  },
  {
    title: 'API Reference',
    items: [
      { label: 'React Components', href: '/docs/api', icon: CodeIcon },
      { label: 'Capacitor APIs', href: '/docs/api', icon: PhoneIcon },
      { label: 'Types & Interfaces', href: '/docs/api', icon: BracesIcon },
    ],
  },
];

export function HomeSidebar() {
  return (
    <div>
      <nav aria-label="Home" className="space-y-7">
        {GROUPS.map((group) => (
          <div key={group.title}>
            <h3 className="mb-2 px-3 text-xs font-semibold capitalize tracking-wide text-slate-500 dark:text-slate-400">
              {group.title}
            </h3>
            <ul className="space-y-0.5">
              {group.items.map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    aria-current={item.active ? 'page' : undefined}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-blue-500 ${
                      item.active
                        ? 'bg-blue-50 font-semibold text-blue-700 dark:bg-blue-500/10 dark:text-blue-300'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/60 dark:hover:text-white'
                    }`}
                  >
                    <span className={item.active ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'}>
                      {item.icon}
                    </span>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="mt-9 rounded-2xl border border-blue-100 bg-blue-50 p-5 dark:border-blue-500/20 dark:bg-blue-500/10">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="#2563eb"
          aria-hidden="true"
          className="dark:fill-blue-400"
        >
          <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>
        <h3 className="mt-3 font-semibold text-slate-900 dark:text-white">Join the Community</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          Get help, share ideas, and stay updated.
        </p>
        <a
          href="https://github.com/ShahiCrafts/reticlexr"
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-white px-4 py-1.5 text-sm font-semibold text-blue-700 hover:bg-blue-100 focus-visible:outline-2 focus-visible:outline-blue-500 dark:border-blue-500/30 dark:bg-transparent dark:text-blue-300 dark:hover:bg-blue-500/10"
        >
          Star on GitHub
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M7 17 17 7" />
            <path d="M8 7h9v9" />
          </svg>
        </a>
      </div>

      <div className="mt-8 flex items-center justify-between px-3 text-xs text-slate-500 dark:text-slate-400">
        <span>v1.1.0 • MIT License</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="#fb7185" aria-hidden="true">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      </div>
    </div>
  );
}
