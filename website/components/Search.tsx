'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import FlexSearch from 'flexsearch';
import type { SearchEntry } from '@/lib/content';

interface Result {
  slug: string;
  title: string;
  matchedIn: string;
}

export function Search({ index }: { index: SearchEntry[] }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const engine = useMemo(() => {
    const doc = new FlexSearch.Document({
      document: {
        id: 'slug',
        index: ['title', 'headings', 'text'],
        store: ['title'],
      },
      tokenize: 'forward',
    });
    index.forEach((entry) => doc.add(entry));
    return doc;
  }, [index]);

  const results: Result[] = useMemo(() => {
    const q = query.trim();
    if (!q) return index.slice(0, 6).map((e) => ({ slug: e.slug, title: e.title, matchedIn: 'Page' }));
    const found = engine.search(q, { limit: 10, enrich: true }) as Array<{
      field: string;
      result: Array<{ id: string; doc: { title: string } }>;
    }>;
    const bySlug = new Map<string, Result>();
    for (const fieldResult of found) {
      for (const hit of fieldResult.result) {
        if (!bySlug.has(hit.id)) {
          bySlug.set(hit.id, {
            slug: hit.id,
            title: hit.doc.title,
            matchedIn:
              fieldResult.field === 'title'
                ? 'Page'
                : fieldResult.field === 'headings'
                  ? 'Heading'
                  : 'Content',
          });
        }
      }
    }
    return [...bySlug.values()].slice(0, 10);
  }, [engine, query, index]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery('');
      setHighlight(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open ]);

  function go(slug: string) {
    setOpen(false);
    router.push(`/docs/${slug}`);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Search documentation (Control K)"
        className="flex w-44 items-center gap-2 rounded-md border border-slate-300 bg-slate-50 px-3 py-1.5 text-sm text-slate-500 hover:border-slate-400 focus-visible:outline-2 focus-visible:outline-blue-500 sm:w-56 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400 dark:hover:border-slate-600"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <span className="flex-1 text-left">Search docs…</span>
        <kbd className="hidden rounded border border-slate-300 bg-white px-1 font-mono text-[10px] text-slate-500 lg:inline dark:border-slate-600 dark:bg-slate-900 dark:text-slate-400">
          Ctrl K
        </kbd>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[70] flex items-start justify-center bg-slate-950/50 px-4 pt-24"
          role="dialog"
          aria-modal="true"
          aria-label="Search documentation"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-xl overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setHighlight(0);
              }}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setHighlight((h) => Math.min(h + 1, results.length - 1));
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setHighlight((h) => Math.max(h - 1, 0));
                } else if (e.key === 'Enter' && results[highlight]) {
                  go(results[highlight].slug);
                }
              }}
              placeholder="Search the docs…"
              aria-label="Search the docs"
              className="w-full border-b border-slate-200 bg-transparent px-4 py-3.5 text-base text-slate-900 outline-none placeholder:text-slate-400 dark:border-slate-700 dark:text-slate-100"
            />
            <ul className="max-h-80 overflow-y-auto py-2" role="listbox" aria-label="Search results">
              {results.length === 0 && (
                <li className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                  No results for “{query}”.
                </li>
              )}
              {results.map((r, i) => (
                <li key={r.slug}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={i === highlight}
                    onMouseEnter={() => setHighlight(i)}
                    onClick={() => go(r.slug)}
                    className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-sm focus-visible:outline-2 focus-visible:outline-blue-500 ${
                      i === highlight
                        ? 'bg-blue-50 text-blue-900 dark:bg-blue-500/15 dark:text-blue-100'
                        : 'text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    <span className="font-medium">{r.title}</span>
                    <span className="ml-3 shrink-0 text-xs text-slate-400">{r.matchedIn}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
