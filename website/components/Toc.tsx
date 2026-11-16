'use client';

import { useEffect, useState } from 'react';
import type { Heading } from '@/lib/content';

/** Right-hand "On this page" table of contents with IntersectionObserver scroll-spy.
    Plain text list behind a hairline left rule; the active link is blue. */
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
    <nav aria-label="On this page" className="text-[13px]">
      <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
        On this page
      </h2>
      <ul className="border-l border-slate-200 dark:border-white/10">
        {headings.map((h) => (
          <li key={h.id}>
            <a
              href={`#${h.id}`}
              aria-current={activeId === h.id ? 'true' : undefined}
              className={`-ml-px block border-l-2 py-1 leading-snug focus-visible:outline-2 focus-visible:outline-blue-500 ${
                h.depth === 3 ? 'pl-7' : 'pl-4'
              } ${
                activeId === h.id
                  ? 'border-blue-600 font-medium text-blue-700 dark:border-blue-400 dark:text-blue-300'
                  : 'border-transparent text-slate-500 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white'
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
