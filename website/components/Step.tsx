import { Children, isValidElement, type ReactElement, type ReactNode } from 'react';

/**
 * Numbered-step layout for guide pages (used by Getting started).
 *
 * Usage in MDX:
 *   <Steps>
 *     <Step n="01" title="Install the package">
 *       <StepText>…markdown…</StepText>
 *       <StepCode>…code fence / panel…</StepCode>
 *     </Step>
 *   </Steps>
 *
 * On desktop each step is a two-column row: number + title + text on the
 * left (~45%), the code panel on the right (~55%). Stacks on mobile.
 * The wrapper is `not-prose`, so StepText styles its own markdown children.
 */

export function Steps({ children }: { children: ReactNode }) {
  return <div className="not-prose mt-2 flex flex-col">{children}</div>;
}

/** Left column of a step: explanatory markdown. */
export function StepText({ children }: { children: ReactNode }) {
  return (
    <div
      className={[
        'min-w-0 text-[15px] leading-[1.75] text-slate-600 dark:text-slate-400',
        '[&>p]:my-3 [&>p:first-child]:mt-0 [&>p:last-child]:mb-0',
        '[&_a]:font-medium [&_a]:text-blue-700 [&_a]:underline [&_a]:decoration-blue-300 [&_a]:underline-offset-[3px] dark:[&_a]:text-blue-300 dark:[&_a]:decoration-blue-500/50',
        '[&_strong]:font-semibold [&_strong]:text-slate-900 dark:[&_strong]:text-white',
        '[&_code]:rounded-md [&_code]:bg-slate-100 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.85em] [&_code]:font-medium [&_code]:text-slate-800 dark:[&_code]:bg-white/10 dark:[&_code]:text-slate-100',
        '[&_ol]:my-3 [&_ol]:list-decimal [&_ol]:space-y-1.5 [&_ol]:pl-5',
        '[&_ul]:my-3 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5',
        '[&_table]:mt-4 [&_table]:w-full [&_table]:text-sm',
        '[&_th]:border-b [&_th]:border-slate-200 [&_th]:py-2 [&_th]:pr-3 [&_th]:text-left [&_th]:font-semibold [&_th]:text-slate-900 dark:[&_th]:border-white/10 dark:[&_th]:text-white',
        '[&_td]:border-b [&_td]:border-slate-100 [&_td]:py-2 [&_td]:pr-3 dark:[&_td]:border-white/5',
      ].join(' ')}
    >
      {children}
    </div>
  );
}

/** Right column of a step: code panels (fences, InstallTabs, callouts).
    Vertical rhythm is handled by the `.step-code` rules in globals.css. */
export function StepCode({ children }: { children: ReactNode }) {
  return <div className="step-code min-w-0">{children}</div>;
}

export function Step({ n, title, children }: { n: string; title: string; children: ReactNode }) {
  let text: ReactNode = null;
  let code: ReactNode = null;
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    if ((child as ReactElement).type === StepText) text = child;
    else if ((child as ReactElement).type === StepCode) code = child;
  });

  return (
    <section className="grid gap-x-12 gap-y-6 border-t border-slate-200 py-10 first:border-t-0 first:pt-2 md:grid-cols-[minmax(0,45fr)_minmax(0,55fr)] dark:border-white/10">
      <div className="flex min-w-0 gap-4">
        <span
          aria-hidden="true"
          className="flex h-8 w-8 shrink-0 translate-y-0.5 items-center justify-center rounded-md border border-slate-300 font-mono text-xs font-semibold text-slate-500 dark:border-white/15 dark:text-slate-400"
        >
          {n}
        </span>
        <div className="min-w-0">
          <h3 className="text-base font-semibold tracking-tight text-slate-950 dark:text-white">{title}</h3>
          <div className="mt-2">{text}</div>
        </div>
      </div>
      <div className="min-w-0 md:pt-10">{code}</div>
    </section>
  );
}
