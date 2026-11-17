'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import FlexSearch from 'flexsearch';
import {
  LuBookOpen,
  LuBox,
  LuCodeXml,
  LuCornerDownLeft,
  LuFileText,
  LuLayers,
  LuRocket,
  LuSearch,
  LuX,
} from 'react-icons/lu';
import type { SearchEntry } from '@/lib/content';

const GROUP_ICONS: Record<string, ReactNode> = {
  'Getting started': <LuRocket size={19} strokeWidth={1.7} aria-hidden />,
  Guides: <LuBookOpen size={19} strokeWidth={1.7} aria-hidden />,
  'API reference': <LuCodeXml size={19} strokeWidth={1.7} aria-hidden />,
  Concepts: <LuBox size={19} strokeWidth={1.7} aria-hidden />,
  Project: <LuLayers size={19} strokeWidth={1.7} aria-hidden />,
};

interface Result {
  entry: SearchEntry;
  score: number;
}

const FIELD_SCORES: Record<string, number> = { pageTitle: 100, section: 60, text: 25 };

/** Find where a query term (or a word starting with it) first occurs. */
function firstMatchIndex(text: string, terms: string[]): number {
  const lower = text.toLowerCase();
  let best = -1;
  for (const term of terms) {
    let idx = lower.indexOf(term);
    if (idx === -1) {
      const m = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\w*`).exec(lower);
      idx = m ? m.index : -1;
    }
    if (idx !== -1 && (best === -1 || idx < best)) best = idx;
  }
  return best;
}

function snippetFor(text: string, terms: string[]): string {
  const idx = firstMatchIndex(text, terms);
  if (idx === -1) return text.slice(0, 130).trimEnd() + (text.length > 130 ? '…' : '');
  const start = Math.max(0, idx - 52);
  const end = Math.min(text.length, idx + 84);
  return (start > 0 ? '…' : '') + text.slice(start, end).trim() + (end < text.length ? '…' : '');
}

/** Wrap query-term matches in <mark> for display. */
function highlight(text: string, terms: string[], selected: boolean): ReactNode {
  if (terms.length === 0) return text;
  const pattern = new RegExp(
    `(${terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`,
    'gi',
  );
  const parts = text.split(pattern);
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <mark
        key={i}
        className={
          selected
            ? 'rounded-sm bg-white/25 px-px text-white'
            : 'rounded-sm bg-blue-100 px-px text-blue-900 dark:bg-blue-500/30 dark:text-blue-100'
        }
      >
        {part}
      </mark>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

export function Search({ index }: { index: SearchEntry[] }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlightIdx, setHighlightIdx] = useState(0);
  const [chip, setChip] = useState('All');
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const router = useRouter();

  const groups = useMemo(
    () => ['All', ...Array.from(new Set(index.map((e) => e.group)))],
    [index],
  );

  const engine = useMemo(() => {
    const doc = new FlexSearch.Document({
      document: {
        id: 'id',
        index: ['pageTitle', 'section', 'text'],
        store: ['slug', 'anchor', 'pageTitle', 'section', 'group', 'description', 'text'],
      },
      tokenize: 'forward',
    });
    index.forEach((entry) => doc.add(entry));
    return doc;
  }, [index]);

  const terms = useMemo(
    () => query.toLowerCase().split(/\s+/).filter(Boolean),
    [query],
  );

  const results: Result[] = useMemo(() => {
    const inChip = (e: SearchEntry) => chip === 'All' || e.group === chip;
    if (terms.length === 0) {
      return index
        .filter((e) => e.anchor === '' && inChip(e))
        .slice(0, 8)
        .map((entry) => ({ entry, score: 0 }));
    }
    const found = engine.search(query.trim(), { limit: 60, enrich: true }) as Array<{
      field: string;
      result: Array<{ id: string; doc: SearchEntry }>;
    }>;
    const byId = new Map<string, Result>();
    for (const fieldResult of found) {
      const points = FIELD_SCORES[fieldResult.field] ?? 10;
      for (const hit of fieldResult.result) {
        const prev = byId.get(hit.id);
        if (!prev) byId.set(hit.id, { entry: hit.doc, score: points });
        else prev.score += points;
      }
    }
    return [...byId.values()]
      .filter((r) => inChip(r.entry))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  }, [engine, index, query, terms, chip]);

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
      setChip('All');
      setHighlightIdx(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open ]);

  // Lock background scroll while the dialog is open (the results list
  // inside still scrolls); restore the previous values on close.
  useEffect(() => {
    if (!open) return;
    const prevBody = document.body.style.overflow;
    const prevHtml = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevBody;
      document.documentElement.style.overflow = prevHtml;
    };
  }, [open ]);

  useEffect(() => {
    listRef.current
      ?.querySelector('[data-highlighted="true"]')
      ?.scrollIntoView({ block: 'nearest' });
  }, [highlightIdx]);

  function go(entry: SearchEntry) {
    setOpen(false);
    router.push(`/docs/${entry.slug}${entry.anchor ? `#${entry.anchor}` : ''}`);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Search documentation (Command K)"
        className="flex w-10 items-center justify-center gap-2 rounded-full bg-slate-100 py-2 text-sm text-slate-500 hover:bg-slate-200/70 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-blue-500 sm:w-52 sm:justify-start sm:pl-3.5 sm:pr-3 dark:bg-white/10 dark:text-slate-400 dark:hover:bg-white/15 dark:hover:text-slate-200"
      >
        <LuSearch size={15} strokeWidth={2} aria-hidden />
        <span className="hidden flex-1 text-left sm:block">Search docs…</span>
        <kbd className="hidden font-sans text-xs text-slate-400 lg:inline dark:text-slate-500">
          ⌘ K
        </kbd>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[70] flex items-start justify-center overscroll-contain bg-slate-950/60 px-4 pt-[10vh] backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Search documentation"
          onClick={() => setOpen(false)}
        >
          <div
            className="flex max-h-[76vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#0a0f1c]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Query row */}
            <div className="flex items-center gap-3 border-b border-slate-200 px-5 dark:border-slate-800">
              <LuSearch size={20} strokeWidth={2} aria-hidden className="shrink-0 text-slate-400" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setHighlightIdx(0);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setHighlightIdx((h) => Math.min(h + 1, results.length - 1));
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setHighlightIdx((h) => Math.max(h - 1, 0));
                  } else if (e.key === 'Enter' && results[highlightIdx]) {
                    go(results[highlightIdx].entry);
                  }
                }}
                placeholder="Search the docs…"
                aria-label="Search the docs"
                className="search-input min-w-0 flex-1 bg-transparent py-4 text-sm leading-6 text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    inputRef.current?.focus();
                  }}
                  aria-label="Clear search"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-2 focus-visible:outline-blue-500 dark:hover:bg-white/10 dark:hover:text-slate-200"
                >
                  <LuX size={15} strokeWidth={2.2} aria-hidden />
                </button>
              ) : (
                <kbd className="shrink-0 rounded-md border border-slate-200 px-1.5 py-0.5 font-sans text-[10px] text-slate-400 dark:border-slate-800 dark:text-slate-500">
                  ESC
                </kbd>
              )}
            </div>

            {/* Group filter chips */}
            <div className="flex flex-wrap gap-1.5 border-b border-slate-200 px-5 py-3 dark:border-slate-800">
              {groups.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => {
                    setChip(g);
                    setHighlightIdx(0);
                  }}
                  aria-pressed={chip === g}
                  className={`rounded-lg px-3 py-1 text-[13px] font-medium leading-5 focus-visible:outline-2 focus-visible:outline-blue-500 ${
                    chip === g
                      ? 'bg-blue-600 text-white dark:bg-blue-700'
                      : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-slate-100'
                  }`}
                >
                  {g === 'API reference' ? 'API' : g}
                </button>
              ))}
            </div>

            {/* Results */}
            <ul
              ref={listRef}
              className="scrollbar-none min-h-0 flex-1 overflow-y-auto p-2"
              role="listbox"
              aria-label="Search results"
            >
              {results.length === 0 && (
                <li className="px-4 py-8 text-center">
                  <p className="text-base font-medium text-slate-700 dark:text-slate-200">
                    No results for “{query}”
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    Search covers every word of the docs. Try a class, method or error code.
                  </p>
                </li>
              )}
              {results.map((r, i) => {
                const selected = i === highlightIdx;
                const e = r.entry;
                const title = e.section || e.pageTitle;
                const context = e.section ? e.pageTitle : e.description;
                const snippet =
                  terms.length > 0 && e.text
                    ? snippetFor(e.text, terms)
                    : '';
                return (
                  <li key={e.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={selected}
                      data-highlighted={selected}
                      onMouseEnter={() => setHighlightIdx(i)}
                      onClick={() => go(e)}
                      className={`flex w-full items-center gap-3.5 rounded-lg px-5 py-3 text-left focus-visible:outline-2 focus-visible:outline-blue-500 ${
                        selected
                          ? 'bg-blue-600 text-white dark:bg-blue-700'
                          : 'text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      <span
                        className={`shrink-0 ${selected ? 'text-white' : 'text-slate-400 dark:text-slate-500'}`}
                      >
                        {GROUP_ICONS[e.group] ?? (
                          <LuFileText size={19} strokeWidth={1.7} aria-hidden />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium leading-6">
                          {highlight(title, terms, selected)}
                        </span>
                        <span
                          className={`mt-0.5 block truncate text-xs leading-6 ${
                            selected ? 'text-white/75' : 'text-slate-400 dark:text-slate-500'
                          }`}
                        >
                          {snippet
                            ? highlight(snippet, terms, selected)
                            : context}
                        </span>
                      </span>
                      {selected ? (
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white/20 text-white">
                          <LuCornerDownLeft size={13} strokeWidth={2.2} aria-hidden />
                        </span>
                      ) : (
                        <span className="shrink-0 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                          {e.group === 'API reference' ? 'API' : e.group}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>

            {/* Footer hints */}
            <div className="flex items-center justify-between gap-4 border-t border-slate-200 px-5 py-3 text-xs text-slate-400 dark:border-slate-800 dark:text-slate-500">
              <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <span>
                  <kbd className="font-sans font-semibold text-slate-500 dark:text-slate-400">↑↓</kbd>{' '}
                  to navigate
                </span>
                <span>
                  <kbd className="font-sans font-semibold text-slate-500 dark:text-slate-400">Enter</kbd>{' '}
                  to select
                </span>
                <span>
                  <kbd className="font-sans font-semibold text-slate-500 dark:text-slate-400">Esc</kbd>{' '}
                  to close
                </span>
              </span>
              <span className="hidden shrink-0 sm:block">
                {terms.length > 0 ? `${results.length} result${results.length === 1 ? '' : 's'} · ` : ''}
                Deep search · <kbd className="font-sans font-semibold text-slate-500 dark:text-slate-400">⌘K</kbd>
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
