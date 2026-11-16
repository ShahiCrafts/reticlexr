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

function CopyIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function useCopy(text: string): [boolean, () => void] {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable */
    }
  }
  return [copied, copy];
}

/**
 * Install-command tabs (npm / pnpm / yarn): a light tab bar with a Copy
 * button at its right end, above a separate dark Terminal panel that shows
 * the selected manager's command.
 */
export function InstallTabs({ pkg = 'reticlexr' }: { pkg?: string }) {
  const [active, setActive] = useState<Manager>('npm');
  const [copiedBar, copyBar] = useCopy(command(active, pkg));
  const [copiedPanel, copyPanel] = useCopy(command(active, pkg));
  const cmd = command(active, pkg);
  const [verb, ...rest] = cmd.split(' ');

  const copyBtn =
    'inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[13px] font-medium focus-visible:outline-2 focus-visible:outline-blue-500';

  return (
    <div className="my-6">
      {/* Tab bar */}
      <div className="flex items-center justify-between rounded-xl bg-slate-50 py-1.5 pl-2 pr-2 dark:bg-white/5">
        <div role="tablist" aria-label="Package manager" className="flex gap-1">
          {MANAGERS.map((m) => (
            <button
              key={m}
              role="tab"
              aria-selected={active === m}
              onClick={() => setActive(m)}
              className={`relative px-3 py-1.5 text-sm font-medium focus-visible:outline-2 focus-visible:outline-blue-500 ${
                active === m
                  ? 'text-blue-600 after:absolute after:inset-x-3 after:-bottom-[7px] after:h-0.5 after:bg-blue-600 dark:text-blue-400 dark:after:bg-blue-400'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
        <button
          onClick={copyBar}
          aria-label="Copy install command"
          className={`${copyBtn} text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white`}
        >
          {copiedBar ? 'Copied' : 'Copy'}
          <CopyIcon />
        </button>
      </div>

      {/* Terminal panel */}
      <div className="mt-3 overflow-hidden rounded-xl border border-slate-800 bg-[#020617]">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-2">
          <span className="font-mono text-xs text-slate-400">Terminal</span>
          <button
            onClick={copyPanel}
            aria-label="Copy install command"
            className={`${copyBtn} text-slate-400 hover:text-white`}
          >
            {copiedPanel ? 'Copied' : 'Copy'}
            <CopyIcon />
          </button>
        </div>
        <pre className="overflow-x-auto px-4 py-3.5 font-mono text-sm text-slate-100">
          <code>
            <span className="text-pink-400">{verb}</span> {rest.join(' ')}
          </code>
        </pre>
      </div>
    </div>
  );
}

/** Single-line command with a copy button (used on the landing page). */
export function CopyCommand({ commandText, label }: { commandText: string; label?: string }) {
  const [copied, copy] = useCopy(commandText);
  return (
    <div className="inline-flex max-w-full items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 py-2 pl-4 pr-2 text-left">
      <code className="overflow-x-auto whitespace-nowrap font-mono text-sm text-slate-100">
        <span className="mr-2 select-none text-blue-400">$</span>
        {commandText}
      </code>
      <button
        onClick={copy}
        aria-label={label ?? `Copy command: ${commandText}`}
        className="shrink-0 rounded-md px-2.5 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-blue-400"
      >
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}
