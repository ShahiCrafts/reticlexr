import Link from 'next/link';
import { NAV } from '@/lib/nav';

export function SidebarNav({ currentSlug, onNavigate }: { currentSlug?: string; onNavigate?: () => void }) {
  return (
    <nav aria-label="Documentation" className="space-y-7">
      {NAV.map((section) => (
        <div key={section.title}>
          <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {section.title}
          </h3>
          <ul className="space-y-0.5">
            {section.pages.map((page) => {
              const active = page.slug === currentSlug;
              return (
                <li key={page.slug}>
                  <Link
                    href={`/docs/${page.slug}`}
                    onClick={onNavigate}
                    aria-current={active ? 'page' : undefined}
                    className={`block rounded-md px-3 py-1.5 text-sm focus-visible:outline-2 focus-visible:outline-violet-500 ${
                      active
                        ? 'bg-violet-50 font-semibold text-violet-800 dark:bg-violet-500/15 dark:text-violet-200'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
                    }`}
                  >
                    {page.title}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      <div>
        <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Try it
        </h3>
        <ul>
          <li>
            <Link
              href="/demo"
              onClick={onNavigate}
              className="block rounded-md px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-violet-500 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              Live demo
            </Link>
          </li>
        </ul>
      </div>
    </nav>
  );
}
