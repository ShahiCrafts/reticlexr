import type { ReactNode } from 'react';

type Kind = 'note' | 'warning' | 'tip';

const STYLES: Record<Kind, { box: string; label: string; title: string }> = {
  note: {
    box: 'border-sky-300 bg-sky-50 dark:border-sky-500/40 dark:bg-sky-500/10',
    label: 'Note',
    title: 'text-sky-900 dark:text-sky-200',
  },
  warning: {
    box: 'border-amber-300 bg-amber-50 dark:border-amber-500/40 dark:bg-amber-500/10',
    label: 'Warning',
    title: 'text-amber-900 dark:text-amber-200',
  },
  tip: {
    box: 'border-emerald-300 bg-emerald-50 dark:border-emerald-500/40 dark:bg-emerald-500/10',
    label: 'Tip',
    title: 'text-emerald-900 dark:text-emerald-200',
  },
};

export function Callout({ kind = 'note', title, children }: { kind?: Kind; title?: string; children: ReactNode }) {
  const s = STYLES[kind];
  return (
    <div className={`my-6 rounded-lg border px-4 py-3 text-[0.95rem] leading-relaxed ${s.box}`} role="note">
      <p className={`mb-1 font-semibold ${s.title}`}>{title ?? s.label}</p>
      <div className="[&>p]:my-1 [&>p:first-child]:mt-0 [&>p:last-child]:mb-0">{children}</div>
    </div>
  );
}

export function Note({ children, title }: { children: ReactNode; title?: string }) {
  return <Callout kind="note" title={title}>{children}</Callout>;
}

export function Warning({ children, title }: { children: ReactNode; title?: string }) {
  return <Callout kind="warning" title={title}>{children}</Callout>;
}

export function Tip({ children, title }: { children: ReactNode; title?: string }) {
  return <Callout kind="tip" title={title}>{children}</Callout>;
}

/** Visible placeholder for facts that could not be verified against source. */
export function Todo({ children }: { children: ReactNode }) {
  return (
    <div className="my-6 rounded-lg border-2 border-dashed border-amber-400 bg-amber-50 px-4 py-3 dark:border-amber-500/60 dark:bg-amber-500/10" role="note">
      <p className="mb-1 font-semibold text-amber-900 dark:text-amber-200">TODO — unverified</p>
      <div className="[&>p]:my-1">{children}</div>
    </div>
  );
}
