'use client';

import { useState } from 'react';

const MANAGERS = ['npm', 'pnpm', 'yarn'] as const;
type Manager = (typeof MANAGERS)[number];

function command(manager: Manager, pkg: string): string {
  switch (manager) {
    case 'npm':
      return `npm install ${pkg}`;
    case 'pnpm':
      return `pnpm add ${pkg}`;
    case 'yarn':
      return `yarn add ${pkg}`;
  }
}

/** Install-command tabs for npm / pnpm / yarn, with a copy button. */
export function InstallTabs({ pkg = 'capacitor-arcore' }: { pkg?: string }) {
  const [active, setActive] = useState<Manager>('npm');
  const [copied, setCopied] = useState(false);
  const cmd = command(active, pkg);

  async function copy() {
    try {
      await navigator.clipboard.writeText(cmd);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <div className="my-6 overflow-hidden rounded-lg border border-slate-200 bg-slate-950 dark:border-slate-800">
      <div className="flex items-center justify-between border-b border-white/10 px-2 pt-2">
        <div role="tablist" aria-label="Package manager" className="flex gap-1">
          {MANAGERS.map((m) => (
            <button
              key={m}
              role="tab"
              aria-selected={active === m}
              onClick={() => setActive(m)}
              className={`rounded-t-md px-3 py-1.5 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400 ${
                active === m ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
        <button
          onClick={copy}
          aria-label="Copy install command"
          className="mr-1 rounded px-2 py-1 text-xs font-medium text-slate-300 hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-violet-400"
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="overflow-x-auto px-4 py-3 text-sm text-slate-100">
        <code>{cmd}</code>
      </pre>
    </div>
  );
}

/** Single-line command with a copy button (used on the landing page). */
export function CopyCommand({ commandText, label }: { commandText: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(commandText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable */
    }
  }
  return (
    <div className="inline-flex max-w-full items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 py-2 pl-4 pr-2 text-left">
      <code className="overflow-x-auto whitespace-nowrap font-mono text-sm text-slate-100">
        <span className="mr-2 select-none text-violet-400">$</span>
        {commandText}
      </code>
      <button
        onClick={copy}
        aria-label={label ?? `Copy command: ${commandText}`}
        className="shrink-0 rounded-md px-2.5 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-violet-400"
      >
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}
