'use client';

import { useState } from 'react';

/** The verified quick-start snippet, shown verbatim in the code window. */
export const QUICK_START_SNIPPET = `npm install reticlexr

import { createARView } from 'reticlexr';

const ar = createARView({
  overlay: document.querySelector('#ar-overlay'),
});`;

const KW = 'text-[#93c5fd]'; // keywords — blue-300
const STR = 'text-[#86efac]'; // strings — green-300
const BASE = 'text-slate-200';
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
    <div className="overflow-hidden rounded-2xl border border-slate-800 bg-[#0b1220]">
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
        <span className="h-3 w-3 rounded-full bg-[#ff5f57]" aria-hidden="true" />
        <span className="h-3 w-3 rounded-full bg-[#febc2e]" aria-hidden="true" />
        <span className="h-3 w-3 rounded-full bg-[#28c840]" aria-hidden="true" />
        <button
          type="button"
          onClick={copy}
          aria-live="polite"
          className="ml-auto inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-slate-300 hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-blue-400"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="9" y="9" width="13" height="13" rx="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="overflow-x-auto p-5 font-mono text-[13px] leading-6">
        <code>
          <span className="block">
            <span className={KW}>npm</span> <span className={BASE}>install</span>{' '}
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
            <span className={PUNCT}>=</span> <span className={BASE}>createARView</span>
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
