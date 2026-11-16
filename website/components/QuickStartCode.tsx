'use client';

import { useState } from 'react';
import { LuCheck, LuCopy } from 'react-icons/lu';

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
    /* Tailwind-docs terminal look: near-black outer panel, plain header row
       with an icon-only copy button, code in an inset inner panel. */
    <div className="overflow-hidden rounded-xl border border-slate-800 bg-[#05070d]">
      <div className="flex items-center justify-between px-3 pb-1.5 pt-0.5">
        <span className="text-xs leading-5 text-[#99A1AF]">Terminal</span>
        <button
          type="button"
          onClick={copy}
          aria-label="Copy quick start code"
          aria-live="polite"
          className="inline-flex h-5 w-5 items-center justify-center rounded-md text-slate-400 hover:bg-white/10 hover:text-slate-100 focus-visible:outline-2 focus-visible:outline-blue-400"
        >
          {copied ? (
            <LuCheck size={15} strokeWidth={2.2} aria-hidden />
          ) : (
            <LuCopy size={15} strokeWidth={1.8} aria-hidden />
          )}
        </button>
      </div>
      <pre className="m-1 overflow-x-auto rounded-lg border border-[#2f3542] bg-[#1d2029] px-5 py-5 font-mono text-sm leading-5">
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
