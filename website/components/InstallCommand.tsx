'use client';

import { useState } from 'react';
import { LuCheck, LuCopy } from 'react-icons/lu';

/** One-line install command chip with a copy button (landing band). */
export function InstallCommand() {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText('npm install reticlexr');
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="inline-flex items-center gap-3 rounded-xl bg-[#05070d] py-2.5 pl-5 pr-2.5 font-mono text-sm">
      <span>
        <span className="text-[#f97583]">npm</span>{' '}
        <span className="text-[#74d4ff]">install reticlexr</span>
      </span>
      <button
        type="button"
        onClick={copy}
        aria-label="Copy install command"
        aria-live="polite"
        className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-white/10 hover:text-slate-100 focus-visible:outline-2 focus-visible:outline-blue-400"
      >
        {copied ? (
          <LuCheck size={14} strokeWidth={2.2} aria-hidden />
        ) : (
          <LuCopy size={14} strokeWidth={1.8} aria-hidden />
        )}
      </button>
    </div>
  );
}
