import type { ReactNode } from 'react';
import Link from 'next/link';
import { NAV } from '@/lib/nav';

/* ---------- Sidebar icons (lucide-style outline glyphs, 18px) ---------- */

function Glyph({ children }: { children: ReactNode }) {
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

function PlayCircleIcon({ active }: { active?: boolean }) {
  if (active) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" className="shrink-0">
        <circle cx="12" cy="12" r="9.5" fill="#2563eb" />
        <path d="M10.2 8.9v6.2L15.6 12z" fill="#ffffff" />
      </svg>
    );
  }
  return (
    <Glyph>
      <circle cx="12" cy="12" r="9.2" />
      <path d="M10.2 8.9v6.2L15.6 12z" fill="currentColor" stroke="none" />
    </Glyph>
  );
}

const ICONS: Record<string, (active?: boolean) => ReactNode> = {
  'getting-started': (active) => <PlayCircleIcon active={active} />,
  'guides/react-integration': () => (
    <Glyph>
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <ellipse cx="12" cy="12" rx="9.5" ry="4" strokeWidth="1.4" />
      <ellipse cx="12" cy="12" rx="9.5" ry="4" strokeWidth="1.4" transform="rotate(60 12 12)" />
      <ellipse cx="12" cy="12" rx="9.5" ry="4" strokeWidth="1.4" transform="rotate(120 12 12)" />
    </Glyph>
  ),
  'guides/model-preloading-and-switching': () => (
    <Glyph>
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5" />
      <path d="M12 22V12" />
    </Glyph>
  ),
  'guides/gestures': () => (
    <Glyph>
      <path d="M5.5 3.5 19 10.2l-6.2 2.1-2.6 7.2z" />
      <path d="m13.2 13.2 5.3 5.3" />
    </Glyph>
  ),
  'guides/colors-and-textures': () => (
    <Glyph>
      <path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z" />
    </Glyph>
  ),
  'guides/screenshots': () => (
    <Glyph>
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
      <circle cx="12" cy="13" r="3.2" />
    </Glyph>
  ),
  'guides/overlays': () => (
    <Glyph>
      <path d="M12 2.7 21 7.5l-9 4.8-9-4.8z" />
      <path d="m3 12.3 9 4.8 9-4.8" />
      <path d="m3 17.1 9 4.8 9-4.8" />
    </Glyph>
  ),
  'guides/troubleshooting': () => (
    <Glyph>
      <circle cx="12" cy="12" r="9.2" />
      <path d="M12 11v5" />
      <path d="M12 7.8h.01" strokeWidth="2.4" />
    </Glyph>
  ),
  api: () => (
    <Glyph>
      <path d="m16 18 6-6-6-6" />
      <path d="m8 6-6 6 6 6" />
    </Glyph>
  ),
  'concepts/architecture': () => (
    <Glyph>
      <path d="M3 21.5h18" />
      <path d="M12 2.5 20 7H4z" />
      <path d="M6.5 11v7M10.2 11v7M13.8 11v7M17.5 11v7" />
    </Glyph>
  ),
  'concepts/webxr-vs-native': () => (
    <Glyph>
      <path d="M8 3 4 7l4 4" />
      <path d="M4 7h16" />
      <path d="m16 21 4-4-4-4" />
      <path d="M20 17H4" />
    </Glyph>
  ),
  'concepts/lifecycle': () => (
    <Glyph>
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M8 16H3v5" />
    </Glyph>
  ),
  compatibility: () => (
    <Glyph>
      <path d="m12 14 4-4" />
      <path d="M3.34 19a10 10 0 1 1 17.32 0" />
    </Glyph>
  ),
  'known-issues': () => (
    <Glyph>
      <circle cx="12" cy="12" r="9.2" />
      <path d="M12 7.8V13" />
      <path d="M12 16.2h.01" strokeWidth="2.4" />
    </Glyph>
  ),
  changelog: () => (
    <Glyph>
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M12 7v5l4 2" />
    </Glyph>
  ),
  contributing: () => (
    <Glyph>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </Glyph>
  ),
};

function FallbackIcon() {
  return (
    <Glyph>
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="M9 13h6M9 17h6" />
    </Glyph>
  );
}

function DemoIcon() {
  return (
    <Glyph>
      <rect x="7" y="2" width="10" height="20" rx="2" />
      <path d="M12 18h.01" strokeWidth="2.4" />
    </Glyph>
  );
}

/* ---------- Bottom card ---------- */

/** Flat isometric cube in the site's blue scale. */
function CubeArt() {
  return (
    <svg width="46" height="46" viewBox="0 0 48 48" aria-hidden="true" className="shrink-0">
      <polygon points="24,5 41,14 24,23 7,14" fill="#93c5fd" />
      <polygon points="7,14 24,23 24,41 7,32" fill="#2563eb" />
      <polygon points="24,23 41,14 41,32 24,41" fill="#60a5fa" />
    </svg>
  );
}

function DemoCard({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/5">
      <div className="flex items-start gap-3.5">
        <CubeArt />
        <div className="min-w-0">
          <p className="text-[15px] font-semibold leading-snug text-slate-900 dark:text-white">
            Build amazing AR experiences with reticlexr.
          </p>
          <Link
            href="/demo"
            onClick={onNavigate}
            className="mt-2 inline-block text-sm font-medium text-blue-600 hover:text-blue-700 focus-visible:outline-2 focus-visible:outline-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
          >
            View demo →
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ---------- Nav ---------- */

function NavItem({
  href,
  title,
  slug,
  active,
  onNavigate,
}: {
  href: string;
  title: string;
  slug?: string;
  active?: boolean;
  onNavigate?: () => void;
}) {
  const icon = slug ? (ICONS[slug]?.(active) ?? <FallbackIcon />) : <DemoIcon />;
  return (
    <li>
      <Link
        href={href}
        onClick={onNavigate}
        aria-current={active ? 'page' : undefined}
        className={`flex items-center gap-3 rounded-lg px-3 py-2 text-[15px] leading-snug focus-visible:outline-2 focus-visible:outline-blue-500 ${
          active
            ? 'bg-[#eaf1fe] font-semibold text-blue-600 dark:bg-blue-500/15 dark:text-blue-300'
            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white'
        }`}
      >
        <span className={active ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'}>
          {icon}
        </span>
        {title}
      </Link>
    </li>
  );
}

/** Docs sidebar: small-caps section titles, icon items with a filled
    light-blue active state, and a demo card at the bottom. */
export function SidebarNav({ currentSlug, onNavigate }: { currentSlug?: string; onNavigate?: () => void }) {
  return (
    <nav aria-label="Documentation">
      {NAV.map((section, i) => (
        <div key={section.title} className={i > 0 ? 'mt-10' : undefined}>
          <h3 className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
            {section.title}
          </h3>
          <ul className="space-y-0.5">
            {section.pages.map((page) => (
              <NavItem
                key={page.slug}
                href={`/docs/${page.slug}`}
                title={page.title}
                slug={page.slug}
                active={page.slug === currentSlug}
                onNavigate={onNavigate}
              />
            ))}
          </ul>
        </div>
      ))}
      <div className="mt-10">
        <h3 className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
          Try it
        </h3>
        <ul className="space-y-0.5">
          <NavItem href="/demo" title="Live demo" onNavigate={onNavigate} />
        </ul>
      </div>
      <DemoCard onNavigate={onNavigate} />
    </nav>
  );
}
