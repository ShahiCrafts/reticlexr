import { Children, isValidElement, type ReactNode } from 'react';

/**
 * Numbered step for the getting-started guide, in the Tailwind-docs
 * installation layout: a two-column grid (stacked on mobile) — the left
 * column carries a bracketed mono step-number chip beside the step title
 * with the prose under it; the right column carries the step's code /
 * terminal panel.
 *
 * MDX passes exactly two children blocks: the prose <div> first, then the
 * panel <div> holding the fenced code block(s). The section keeps the
 * step's old H2 anchor id so existing deep links (#capacitor-setup,
 * #https-and-phone-testing, …) keep working.
 */
export function Step({
  number,
  title,
  id,
  children,
}: {
  number: string;
  title: string;
  id?: string;
  children: ReactNode;
}) {
  const blocks = Children.toArray(children).filter(isValidElement);
  const [prose, panel] = blocks;

  return (
    <section id={id} className="mt-12 scroll-mt-24">
      <div className="grid gap-8 md:grid-cols-2 md:gap-10">
        <div>
          <div className="flex items-center gap-3.5">
            <span className="inline-flex items-center border border-slate-300 px-2 py-1 font-mono text-[13px] leading-none text-slate-500 dark:border-white/15 dark:text-slate-400">
              {number}
            </span>
            <div className="text-base font-semibold leading-6 tracking-[-0.25px] text-[#030712] dark:text-slate-50">
              {title}
            </div>
          </div>
          <div className="mt-4 [&>div>:first-child]:mt-0">{prose}</div>
        </div>
        <div className="[&_figure]:mt-0">{panel}</div>
      </div>
    </section>
  );
}
