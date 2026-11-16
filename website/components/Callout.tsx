import type { ReactNode } from 'react';

type Kind = 'info' | 'note' | 'warning' | 'tip';

const BODY =
  'text-[15px] leading-relaxed text-slate-700 dark:text-slate-300 [&>p]:my-1 [&>p:first-child]:mt-0 [&>p:last-child]:mb-0';

function InfoIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" className="mt-0.5 shrink-0">
      <circle cx="12" cy="12" r="10" fill="#2563eb" />
      <path d="M12 11v5.2" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="12" cy="7.6" r="1.35" fill="#ffffff" />
    </svg>
  );
}

function BulbIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0"
    >
      <path d="M15 14c.2-1 .7-1.7 1.5-2.5A5.5 5.5 0 1 0 7.5 11.5c.8.8 1.3 1.5 1.5 2.5" />
      <path d="M9 18h6" />
      <path d="M10 22h4" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0"
    >
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" strokeWidth="2.4" />
    </svg>
  );
}

function SparklesIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0"
    >
      <path d="M9.94 15.5a2 2 0 0 0-1.44-1.44L2.37 12.5a.52.52 0 0 1 0-.98l6.13-1.56A2 2 0 0 0 9.94 8.5l1.56-6.13a.52.52 0 0 1 .98 0l1.56 6.13a2 2 0 0 0 1.44 1.44l6.13 1.56a.52.52 0 0 1 0 .98l-6.13 1.56a2 2 0 0 0-1.44 1.44l-1.56 6.13a.52.52 0 0 1-.98 0z" />
      <path d="M20 3v4M22 5h-4" />
    </svg>
  );
}

const STYLES: Record<
  Exclude<Kind, 'info'>,
  { label: string; box: string; head: string; icon: ReactNode }
> = {
  note: {
    label: 'Note',
    box: 'bg-[#eef2ff] dark:bg-indigo-500/10',
    head: 'text-indigo-600 dark:text-indigo-300',
    icon: <BulbIcon />,
  },
  warning: {
    label: 'Warning',
    box: 'bg-amber-50 dark:bg-amber-500/10',
    head: 'text-amber-600 dark:text-amber-400',
    icon: <AlertIcon />,
  },
  tip: {
    label: 'Tip',
    box: 'bg-emerald-50 dark:bg-emerald-500/10',
    head: 'text-emerald-600 dark:text-emerald-400',
    icon: <SparklesIcon />,
  },
};

/** Filled soft callout: pale tinted box, icon + bold coloured label,
    dark body text. No border, no shadow. */
export function Callout({
  kind = 'note',
  title,
  children,
}: {
  kind?: Exclude<Kind, 'info'>;
  title?: string;
  children: ReactNode;
}) {
  const s = STYLES[kind];
  return (
    <div className={`my-6 rounded-xl px-5 py-4 ${s.box}`} role="note">
      <div className={`flex items-center gap-2 ${s.head}`}>
        {s.icon}
        <p className="text-[15px] font-bold">
          {s.label}
          {title && (
            <span className="font-semibold text-slate-900 dark:text-white"> — {title}</span>
          )}
        </p>
      </div>
      <div className={`mt-1.5 ${BODY}`}>{children}</div>
    </div>
  );
}

/** Info callout: pale blue fill, filled blue ⓘ icon, text beside it. No label. */
export function Info({ children }: { children: ReactNode }) {
  return (
    <div
      className="my-6 flex items-start gap-3 rounded-xl bg-[#eef4ff] px-5 py-4 dark:bg-blue-500/10"
      role="note"
    >
      <InfoIcon />
      <div className={`${BODY} min-w-0 flex-1`}>{children}</div>
    </div>
  );
}

export function Note({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <Callout kind="note" title={title}>
      {children}
    </Callout>
  );
}

export function Warning({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <Callout kind="warning" title={title}>
      {children}
    </Callout>
  );
}

export function Tip({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <Callout kind="tip" title={title}>
      {children}
    </Callout>
  );
}

/** Visible placeholder for facts that could not be verified against source.
    Filled pale amber, keeping the dashed outline that distinguishes it. */
export function Todo({ children }: { children: ReactNode }) {
  return (
    <div
      className="my-6 rounded-xl border border-dashed border-amber-400/80 bg-amber-50 px-5 py-4 dark:border-amber-400/40 dark:bg-amber-500/10"
      role="note"
    >
      <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
        <AlertIcon />
        <p className="text-[15px] font-bold">TODO — unverified</p>
      </div>
      <div className={`mt-1.5 ${BODY}`}>{children}</div>
    </div>
  );
}
