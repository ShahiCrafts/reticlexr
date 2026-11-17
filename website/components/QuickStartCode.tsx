'use client';

import { useState } from 'react';
import { LuCheck, LuCopy, LuTerminal } from 'react-icons/lu';

/** The verified quick-start snippet, shown verbatim in the code window. */
export const QUICK_START_SNIPPET = `npm install reticlexr

import { createARView } from 'reticlexr';

const ar = createARView({
  overlay: document.querySelector('#ar-overlay'),
});`;

/* Token colours mirror the site's Shiki palettes: the shell line uses the
   terminal theme (lib/terminal-theme.ts) — verb #f97583 pink, arguments
   #74d4ff sky; the JS lines mirror stock github-dark — keywords #f97583
   pink, strings #74d4ff sky (github-dark paints them #9ecbff; the shell
   theme's sky is used here so the mixed block reads as one palette),
   function names #b392f0 lavender. */
const KW = 'text-[#f97583]'; // keywords + shell verb — pink
const STR = 'text-[#74d4ff]'; // strings / arguments — sky blue
const FN = 'text-[#b392f0]'; // function names — soft lavender
const BASE = 'text-[#e1e4e8]';
const PUNCT = 'text-slate-400';

export function QuickStartCode() {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(QUICK_START_SNIPPET);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    /* macOS-style terminal window, flat: traffic-light dots, a Terminal
       tab chip and a Copy button in the header; one dark panel of code
       below — no inset panel, no shadow, no gradient. */
    <div className="overflow-hidden rounded-2xl border border-slate-800 bg-[#05070d]">
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="flex items-center gap-2" aria-hidden="true">
          <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
          <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
          <span className="h-3 w-3 rounded-full bg-[#28c840]" />
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-md bg-white/10 px-2.5 py-1 text-xs text-slate-300">
          <LuTerminal size={12} strokeWidth={2} aria-hidden />
          Terminal
        </span>
        <button
          type="button"
          onClick={copy}
          aria-label="Copy quick start code"
          aria-live="polite"
          className="ml-auto inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 text-xs text-slate-400 hover:text-slate-100 focus-visible:outline-2 focus-visible:outline-blue-400"
        >
          {copied ? (
            <LuCheck size={14} strokeWidth={2.2} aria-hidden />
          ) : (
            <LuCopy size={14} strokeWidth={1.8} aria-hidden />
          )}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="overflow-x-auto px-6 pb-6 pt-1 font-mono text-sm leading-6">
        <code>
          <span className="block">
            <span className={KW}>npm</span> <span className={STR}>install</span>{' '}
            <span className={STR}>reticlexr</span>
          </span>
          <span className="block">&nbsp;</span>
          <span className="block">
            <span className={KW}>import</span> <span className={PUNCT}>{'{'}</span>{' '}
            <span className={BASE}>createARView</span> <span className={PUNCT}>{'}'}</span>{' '}
            <span className={KW}>from</span> <span className={STR}>&apos;reticlexr&apos;</span>
            <span className={PUNCT}>;</span>
          </span>
          <span className="block">&nbsp;</span>
          <span className="block">
            <span className={KW}>const</span> <span className={BASE}>ar</span>{' '}
            <span className={PUNCT}>=</span> <span className={FN}>createARView</span>
            <span className={PUNCT}>{'({'}</span>
          </span>
          <span className="block">
            {'  '}
            <span className={BASE}>overlay</span>
            <span className={PUNCT}>:</span> <span className={BASE}>document</span>
            <span className={PUNCT}>.</span>
            <span className={BASE}>querySelector</span>
            <span className={PUNCT}>(</span>
            <span className={STR}>&apos;#ar-overlay&apos;</span>
            <span className={PUNCT}>),</span>
          </span>
          <span className="block">
            <span className={PUNCT}>{'});'}</span>
          </span>
        </code>
      </pre>
    </div>
  );
}
