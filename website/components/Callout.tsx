import type { ReactNode } from 'react';

type Kind = 'note' | 'warning' | 'tip';

const STYLES: Record<Kind, { label: string; labelClass: string }> = {
  note: { label: 'Note', labelClass: 'text-blue-600 dark:text-blue-400' },
  warning: { label: 'Warning', labelClass: 'text-amber-600 dark:text-amber-400' },
  tip: { label: 'Tip', labelClass: 'text-emerald-600 dark:text-emerald-400' },
};

/** Flat callout: white (dark: white/5) panel, hairline border, small-caps
    label in the semantic colour. No fills, no shadows. */
export function Callout({ kind = 'note', title, children }: { kind?: Kind; title?: string; children: ReactNode }) {
  const s = STYLES[kind];
  return (
    <div
      className="my-6 rounded-xl border border-slate-200 bg-white px-5 py-4 text-[0.95rem] leading-relaxed dark:border-white/10 dark:bg-white/5"
      role="note"
    >
      <p className={`text-xs font-semibold uppercase tracking-[0.12em] ${s.labelClass}`}>{s.label}</p>
      {title && <p className="mt-1.5 font-semibold text-slate-900 dark:text-white">{title}</p>}
      <div className="mt-1.5 [&>p]:my-1 [&>p:first-child]:mt-0 [&>p:last-child]:mb-0">{children}</div>
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
    <div
      className="my-6 rounded-xl border border-dashed border-amber-400/70 bg-white px-5 py-4 dark:border-amber-400/40 dark:bg-white/5"
      role="note"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-600 dark:text-amber-400">
        TODO — unverified
      </p>
      <div className="mt-1.5 [&>p]:my-1 [&>p:first-child]:mt-0 [&>p:last-child]:mb-0">{children}</div>
    </div>
  );
}
