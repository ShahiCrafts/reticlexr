'use client';

import { useEffect, useState } from 'react';
import type { Heading } from '@/lib/content';

/** Right-hand "On this page" table of contents with IntersectionObserver scroll-spy. */
export function Toc({ headings }: { headings: Heading[] }) {
  const [activeId, setActiveId] = useState<string>('');

  useEffect(() => {
    const elements = headings
      .map((h) => document.getElementById(h.id))
      .filter((el): el is HTMLElement => el !== null);
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveId(entry.target.id);
        }
      },
      { rootMargin: '-80px 0px -70% 0px', threshold: 0 },
    );
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [headings]);

  if (headings.length === 0) return null;

  return (
    <nav aria-label="On this page" className="text-sm">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        On this page
      </h2>
      <ul className="space-y-1.5 border-l border-slate-200 dark:border-slate-800">
        {headings.map((h) => (
          <li key={h.id} className={h.depth === 3 ? 'pl-5' : 'pl-3'}>
            <a
              href={`#${h.id}`}
              aria-current={activeId === h.id ? 'true' : undefined}
              className={`-ml-px block border-l-2 py-0.5 focus-visible:outline-2 focus-visible:outline-blue-500 ${
                h.depth === 3 ? 'pl-3' : 'pl-2.5'
              } ${
                activeId === h.id
                  ? 'border-blue-500 font-medium text-blue-700 dark:text-blue-300'
                  : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
              }`}
            >
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
