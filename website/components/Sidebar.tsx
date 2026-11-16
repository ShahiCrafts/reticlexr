import type { ReactNode } from 'react';
import Link from 'next/link';
import {
  LuArrowRightLeft,
  LuAtom,
  LuCamera,
  LuCircleAlert,
  LuCirclePlay,
  LuCode,
  LuDroplet,
  LuFileText,
  LuGauge,
  LuHistory,
  LuInfo,
  LuLandmark,
  LuLayers,
  LuMousePointer2,
  LuPackage,
  LuPlay,
  LuRefreshCcw,
  LuUsers,
} from 'react-icons/lu';
import { NAV } from '@/lib/nav';

/* ---------- Sidebar icons (react-icons/lu — Lucide glyphs, 18px) ---------- */

const iconProps = { size: 18, strokeWidth: 1.8, className: 'shrink-0', 'aria-hidden': true } as const;

function PlayCircleIcon({ active }: { active?: boolean }) {
  if (active) {
    // Filled blue disc with a white play triangle (the disc is a styled
    // span so the triangle stays white in dark mode too).
    return (
      <span
        className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-[#2563eb]"
        aria-hidden="true"
      >
        <LuPlay size={10} strokeWidth={1} className="fill-white text-white" />
      </span>
    );
  }
  return <LuCirclePlay {...iconProps} />;
}

const ICONS: Record<string, (active?: boolean) => ReactNode> = {
  'getting-started': (active) => <PlayCircleIcon active={active} />,
  'guides/react-integration': () => <LuAtom {...iconProps} />,
  'guides/model-preloading-and-switching': () => <LuPackage {...iconProps} />,
  'guides/gestures': () => <LuMousePointer2 {...iconProps} />,
  'guides/colors-and-textures': () => <LuDroplet {...iconProps} />,
  'guides/screenshots': () => <LuCamera {...iconProps} />,
  'guides/overlays': () => <LuLayers {...iconProps} />,
  'guides/troubleshooting': () => <LuInfo {...iconProps} />,
  api: () => <LuCode {...iconProps} />,
  'concepts/architecture': () => <LuLandmark {...iconProps} />,
  'concepts/webxr-vs-native': () => <LuArrowRightLeft {...iconProps} />,
  'concepts/lifecycle': () => <LuRefreshCcw {...iconProps} />,
  compatibility: () => <LuGauge {...iconProps} />,
  'known-issues': () => <LuCircleAlert {...iconProps} />,
  changelog: () => <LuHistory {...iconProps} />,
  contributing: () => <LuUsers {...iconProps} />,
};

function FallbackIcon() {
  return <LuFileText {...iconProps} />;
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
  const icon = ICONS[slug ?? '']?.(active) ?? <FallbackIcon />;
  return (
    <li className="relative">
      {active && (
        <span
          aria-hidden="true"
          className="absolute inset-y-0 -left-px w-0.5 bg-[#030712] dark:bg-white"
        />
      )}
      <Link
        href={href}
        onClick={onNavigate}
        aria-current={active ? 'page' : undefined}
        className={`flex items-center gap-3 pl-4 pr-3 text-sm leading-6 focus-visible:outline-2 focus-visible:outline-blue-500 ${
          active
            ? 'font-medium text-[#030712] dark:text-white'
            : 'text-[#4A5565] hover:text-[#030712] dark:text-slate-400 dark:hover:text-white'
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

/** Docs sidebar: small-caps section titles, icon items whose list carries
    a 1px vertical track line; the active item is marked by a 2px
    near-black bar segment over that track (no filled background). */
export function SidebarNav({ currentSlug, onNavigate }: { currentSlug?: string; onNavigate?: () => void }) {
  return (
    <nav aria-label="Documentation">
      {NAV.map((section, i) => (
        <div key={section.title} className={i > 0 ? 'mt-8' : undefined}>
          <h3 className="mb-3 font-mono text-xs font-medium uppercase tracking-[0.1em] text-[#6A7282] dark:text-slate-400">
            {section.title}
          </h3>
          <ul className="space-y-3.5 border-l border-slate-200 dark:border-white/10">
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
    </nav>
  );
}
