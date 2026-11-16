'use client';

import { useState } from 'react';
import { LuCheck, LuCopy } from 'react-icons/lu';

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
 * Install-command tabs (npm / pnpm / yarn): a plain text tab bar —
 * Tailwind-docs style, no fill or pills; the active tab is near-black
 * with a 2px underline bar sitting on the row's hairline — above a
 * separate dark Terminal panel that shows the selected manager's command
 * (the panel carries the copy button).
 */
export function InstallTabs({ pkg = 'reticlexr' }: { pkg?: string }) {
  const [active, setActive] = useState<Manager>('npm');
  const [copiedPanel, copyPanel] = useCopy(command(active, pkg));
  const cmd = command(active, pkg);
  const [verb, ...rest] = cmd.split(' ');

  return (
    <div className="my-6">
      {/* Tab bar */}
      <div className="border-b border-slate-200 dark:border-white/10">
        <div role="tablist" aria-label="Package manager" className="flex gap-7">
          {MANAGERS.map((m) => (
            <button
              key={m}
              role="tab"
              aria-selected={active === m}
              onClick={() => setActive(m)}
              className={`relative -mb-px border-b-2 pb-2.5 pt-1 text-sm leading-6 focus-visible:outline-2 focus-visible:outline-blue-500 ${
                active === m
                  ? 'border-[#030712] font-medium text-[#030712] dark:border-white dark:text-white'
                  : 'border-transparent text-[#4A5565] hover:text-[#030712] dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Terminal panel — Tailwind-docs look: near-black outer panel, plain
          header row with an icon-only copy button, code in an inset inner
          panel. Token colours match the site's terminal Shiki theme
          (lib/terminal-theme.ts): verb pink, arguments sky. */}
      <div className="mt-3 overflow-hidden rounded-xl border border-slate-800 bg-[#05070d]">
        <div className="flex items-center justify-between px-3 pb-1.5 pt-0.5">
          <span className="text-xs leading-5 text-[#99A1AF]">Terminal</span>
          <button
            onClick={copyPanel}
            aria-label="Copy install command"
            className="inline-flex h-5 w-5 items-center justify-center rounded-md text-slate-400 hover:bg-white/10 hover:text-slate-100 focus-visible:outline-2 focus-visible:outline-blue-400"
          >
            {copiedPanel ? (
              <LuCheck size={15} strokeWidth={2.2} aria-hidden />
            ) : (
              <LuCopy size={15} strokeWidth={1.8} aria-hidden />
            )}
          </button>
        </div>
        <pre className="m-1 overflow-x-auto rounded-lg border border-[#2f3542] bg-[#1d2029] px-5 py-5 font-mono text-sm leading-5">
          <code>
            <span className="text-[#f97583]">{verb}</span>{' '}
            <span className="text-[#74d4ff]">{rest.join(' ')}</span>
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
