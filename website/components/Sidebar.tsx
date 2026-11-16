import Link from 'next/link';
import { NAV } from '@/lib/nav';

function NavItem({
  href,
  title,
  active,
  onNavigate,
}: {
  href: string;
  title: string;
  active?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <li>
      <Link
        href={href}
        onClick={onNavigate}
        aria-current={active ? 'page' : undefined}
        className={`-ml-px block border-l-2 py-1.5 pl-4 text-[15px] leading-snug focus-visible:outline-2 focus-visible:outline-blue-500 ${
          active
            ? 'border-blue-600 font-semibold text-slate-950 dark:border-blue-400 dark:text-white'
            : 'border-transparent text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white'
        }`}
      >
        {title}
      </Link>
    </li>
  );
}

/** Plain-text docs sidebar: small-caps section titles, hairline left rule,
    blue bar segment on the active item. No icons, no fills, no cards. */
export function SidebarNav({ currentSlug, onNavigate }: { currentSlug?: string; onNavigate?: () => void }) {
  return (
    <nav aria-label="Documentation">
      {NAV.map((section, i) => (
        <div key={section.title} className={i > 0 ? 'mt-10' : undefined}>
          <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
            {section.title}
          </h3>
          <ul className="border-l border-slate-200 dark:border-white/10">
            {section.pages.map((page) => (
              <NavItem
                key={page.slug}
                href={`/docs/${page.slug}`}
                title={page.title}
                active={page.slug === currentSlug}
                onNavigate={onNavigate}
              />
            ))}
          </ul>
        </div>
      ))}
      <div className="mt-10">
        <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
          Try it
        </h3>
        <ul className="border-l border-slate-200 dark:border-white/10">
          <NavItem href="/demo" title="Live demo" onNavigate={onNavigate} />
        </ul>
      </div>
    </nav>
  );
}
