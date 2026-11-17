import { Children, isValidElement, type ReactElement, type ReactNode } from 'react';

/**
 * Numbered step for the getting-started guide, in the Tailwind-docs
 * installation layout: a two-column grid (stacked on mobile) — the left
 * column carries a bracketed mono step-number chip beside the step title
 * with the lead prose under it; the right column carries the step's code /
 * terminal panel, its top aligned with the header row.
 *
 * MDX passes two or three children blocks: the lead prose <div> first and
 * the panel <div> holding the fenced code block(s) last. An optional
 * middle <div data-wide> renders full width under the grid — callouts and
 * trailing prose that read better across the whole measure, using the
 * space under the panel. The section keeps the step's old H2 anchor id so
 * existing deep links (#capacitor-setup, #https-and-phone-testing, …)
 * keep working.
 *
 * With `stacked`, the grid goes away: every block renders full width in
 * document order — for steps whose prose and panels both read better
 * across the whole measure, and so a panel can sit mid-flow (e.g. a
 * terminal between the paragraph that introduces it and the steps that
 * follow it) instead of leaving a dead column beside long prose.
 */
export function Step({
  number,
  title,
  id,
  stacked,
  children,
}: {
  number: string;
  title: string;
  id?: string;
  stacked?: boolean;
  children: ReactNode;
}) {
  const blocks = Children.toArray(children).filter(isValidElement) as ReactElement[];
  const wide = blocks.find((b) => (b.props as { 'data-wide'?: boolean })['data-wide']);
  const [prose, panel] = blocks.filter((b) => b !== wide);

  const header = (
    <div className="flex items-center gap-3.5">
      <span className="inline-flex items-center border border-slate-300 px-2 py-1 font-mono text-[13px] leading-none text-slate-500 dark:border-white/15 dark:text-slate-400">
        {number}
      </span>
      <div className="text-base font-semibold leading-6 tracking-[-0.25px] text-[#030712] dark:text-slate-50">
        {title}
      </div>
    </div>
  );

  if (stacked) {
    return (
      <section id={id} className="mt-12 scroll-mt-24">
        {header}
        {blocks.map((b, i) => (
          <div
            key={i}
            className={`step-panel min-w-0 [&>div>:first-child]:mt-0 ${i === 0 ? 'mt-4' : 'mt-8'}`}
          >
            {b}
          </div>
        ))}
      </section>
    );
  }

  return (
    <section id={id} className="mt-12 scroll-mt-24">
      <div className="grid gap-8 md:grid-cols-2 md:gap-10">
        <div className="min-w-0">
          {header}
          <div className="mt-4 [&>div>:first-child]:mt-0">{prose}</div>
        </div>
        <div className="step-panel min-w-0">{panel}</div>
      </div>
      {wide ? <div className="mt-8 [&>div>:first-child]:mt-0">{wide}</div> : null}
    </section>
  );
}
