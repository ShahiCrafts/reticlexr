import type { ReactNode } from 'react';
import { LuLightbulb, LuSparkles, LuTriangleAlert } from 'react-icons/lu';
import { FaCircleInfo } from 'react-icons/fa6';

type Kind = 'info' | 'note' | 'warning' | 'tip';

const BODY =
  'text-[15px] leading-relaxed text-slate-700 dark:text-slate-300 [&>p]:my-1 [&>p:first-child]:mt-0 [&>p:last-child]:mb-0';

function InfoIcon() {
  return <FaCircleInfo size={20} color="#2563eb" aria-hidden className="mt-0.5 shrink-0" />;
}

function BulbIcon() {
  return <LuLightbulb size={20} strokeWidth={1.8} aria-hidden className="shrink-0" />;
}

function AlertIcon() {
  return <LuTriangleAlert size={20} strokeWidth={1.8} aria-hidden className="shrink-0" />;
}

function SparklesIcon() {
  return <LuSparkles size={20} strokeWidth={1.8} aria-hidden className="shrink-0" />;
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
