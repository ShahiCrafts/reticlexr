import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { MDXRemote } from 'next-mdx-remote/rsc';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import rehypePrettyCode from 'rehype-pretty-code';
import { getDocPage, getSearchIndex, editUrl } from '@/lib/content';
import { terminalTheme } from '@/lib/terminal-theme';
import { FLAT_PAGES, prevNext, sectionForSlug } from '@/lib/nav';
import { DocsShell } from '@/components/TopBar';
import { SidebarNav } from '@/components/Sidebar';
import { Toc } from '@/components/Toc';
import { CopyEnhancer } from '@/components/CopyEnhancer';
import { mdxComponents } from '@/components/mdx-components';
import { LuPencil } from 'react-icons/lu';

export function generateStaticParams() {
  return FLAT_PAGES.map((p) => ({ slug: p.slug.split('/') }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = getDocPage((slug ?? []).join('/'));
  if (!page) return {};
  return { title: page.title, description: page.description };
}

/** 40px shaded gutter column for the docs grid (fill in globals.css
    .gutter-strip). It stretches the full height of the docs row. Hidden
    below lg, where the sidebar is hidden too. */
function GutterStrip() {
  return (
    <div
      aria-hidden="true"
      className="gutter-strip hidden w-5 shrink-0 border-x border-slate-200 lg:block dark:border-white/10"
    />
  );
}

export default async function DocPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const slugStr = (slug ?? []).join('/');
  if (slugStr === '') redirect('/docs/getting-started');
  const page = getDocPage(slugStr);
  if (!page) notFound();

  const { prev, next } = prevNext(slugStr);
  const section = sectionForSlug(slugStr);
  const searchIndex = getSearchIndex();

  return (
    <DocsShell
      currentSlug={slugStr}
      searchIndex={searchIndex}
      breadcrumb={{ section: section?.title, title: page.title }}
    >
      <div className="flex">
        {/* Left sidebar — plain text nav, own scroll (scrollbar hidden),
            sticky under the top bar. 320px wide, 24px padding. */}
        <aside className="no-scrollbar sticky top-[72px] hidden max-h-[calc(100vh-72px)] w-80 shrink-0 overflow-y-auto p-6 lg:block">
          <SidebarNav currentSlug={slugStr} />
        </aside>

        {/* Gutter column between the sidebar and the content */}
        <GutterStrip />

        {/* Content */}
        <main className="min-w-0 flex-1 px-4 py-10 sm:px-6 lg:py-12">
          <div className="mx-auto max-w-3xl">
            {section && (
              <p className="font-mono text-xs font-medium uppercase tracking-[0.1em] text-[#4A5565] dark:text-slate-400">
                {section.title}
              </p>
            )}
            <h1 className="mt-3 text-[30px] font-semibold leading-[36px] tracking-[-0.8px] text-[#030712] dark:text-white">
              {page.title}
            </h1>
            {page.description && (
              <p className="mt-5 text-base leading-7 text-[#364153] dark:text-slate-300">
                {page.description}
              </p>
            )}
          </div>

          <article className="prose prose-slate mx-auto mt-4 max-w-3xl dark:prose-invert prose-headings:scroll-mt-24 prose-a:text-blue-700 prose-a:font-medium hover:prose-a:text-blue-900 dark:prose-a:text-blue-300 dark:hover:prose-a:text-blue-200 prose-code:text-[0.85em] prose-pre:p-0 prose-table:text-sm">
            <MDXRemote
              source={page.source}
              components={mdxComponents}
              options={{
                mdxOptions: {
                  remarkPlugins: [remarkGfm],
                  rehypePlugins: [
                    rehypeSlug,
                    [
                      rehypePrettyCode,
                      {
                        theme: terminalTheme,
                        keepBackground: false,
                      },
                    ],
                  ],
                },
              }}
            />
          </article>

          <CopyEnhancer />

          {/* Floating edit button — same GitHub edit target as the old
              "Edit this page on GitHub" text link, as a FAB */}
          <a
            href={editUrl(page.filePath)}
            target="_blank"
            rel="noreferrer"
            aria-label="Edit this page on GitHub"
            title="Edit this page on GitHub"
            className="fixed right-6 top-[7.5rem] z-30 flex h-12 w-12 items-center justify-center rounded-full bg-[#030712] text-white shadow-lg shadow-slate-950/25 transition hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 lg:top-20 dark:bg-white dark:text-slate-950 dark:shadow-black/40 dark:hover:bg-slate-200"
          >
            <LuPencil size={19} strokeWidth={1.9} aria-hidden />
          </a>

          {/* Prev / Next — plain text links with small chevrons, no boxes,
              borders or backgrounds (Tailwind-docs style) */}
          <nav
            aria-label="More documentation"
            className="mx-auto mt-10 flex max-w-3xl items-center justify-between gap-6"
          >
            {prev ? (
              <Link
                href={`/docs/${prev.slug}`}
                className="inline-flex items-baseline gap-2 text-sm leading-6 text-[#101828] hover:text-[#030712] focus-visible:outline-2 focus-visible:outline-blue-500 dark:text-slate-300 dark:hover:text-white"
              >
                <span aria-hidden="true">‹</span>
                {prev.title}
              </Link>
            ) : (
              <span />
            )}
            {next && (
              <Link
                href={`/docs/${next.slug}`}
                className="inline-flex items-baseline gap-2 text-sm leading-6 text-[#101828] hover:text-[#030712] focus-visible:outline-2 focus-visible:outline-blue-500 dark:text-slate-300 dark:hover:text-white"
              >
                {next.title}
                <span aria-hidden="true">›</span>
              </Link>
            )}
          </nav>
        </main>

        {/* Right TOC */}
        <aside className="no-scrollbar sticky top-14 hidden max-h-[calc(100vh-56px)] w-56 shrink-0 overflow-y-auto pt-12 pr-6 pb-2 lg:pt-14 xl:block">
          <Toc headings={page.headings} />
        </aside>
      </div>
    </DocsShell>
  );
}
