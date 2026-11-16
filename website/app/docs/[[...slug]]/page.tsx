import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { MDXRemote } from 'next-mdx-remote/rsc';
import rehypeSlug from 'rehype-slug';
import rehypePrettyCode from 'rehype-pretty-code';
import { getDocPage, getSearchIndex, editUrl } from '@/lib/content';
import { FLAT_PAGES, prevNext, sectionForSlug } from '@/lib/nav';
import { DocsShell } from '@/components/TopBar';
import { SidebarNav } from '@/components/Sidebar';
import { Toc } from '@/components/Toc';
import { CopyEnhancer } from '@/components/CopyEnhancer';
import { mdxComponents } from '@/components/mdx-components';

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
    <DocsShell currentSlug={slugStr} searchIndex={searchIndex} hatch>
      <div className="flex gap-12 py-10 lg:py-12">
        {/* Left sidebar — plain text nav, own scroll, sticky under the top bar */}
        <aside className="sticky top-[60px] hidden max-h-[calc(100vh-60px)] w-60 shrink-0 overflow-y-auto py-2 pr-2 lg:block">
          <SidebarNav currentSlug={slugStr} />
        </aside>

        {/* Content */}
        <main className="min-w-0 flex-1">
          <div className="mx-auto max-w-3xl">
            {section && (
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-600 dark:text-blue-400">
                {section.title}
              </p>
            )}
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950 md:text-[2.75rem] md:leading-[1.15] dark:text-white">
              {page.title}
            </h1>
            {page.description && (
              <p className="mt-5 text-lg leading-relaxed text-slate-600 dark:text-slate-400">
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
                  rehypePlugins: [
                    rehypeSlug,
                    [
                      rehypePrettyCode,
                      {
                        theme: 'github-dark',
                        keepBackground: false,
                      },
                    ],
                  ],
                },
              }}
            />
          </article>

          <CopyEnhancer />

          <div className="mx-auto mt-14 max-w-3xl">
            <a
              href={editUrl(page.filePath)}
              target="_blank"
              rel="noreferrer"
              className="text-[13px] text-slate-500 hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-blue-500 dark:text-slate-400 dark:hover:text-white"
            >
              Edit this page on GitHub →
            </a>
          </div>

          {/* Prev / Next — plain text links behind a hairline */}
          <nav
            aria-label="More documentation"
            className="mx-auto mt-6 flex max-w-3xl items-start justify-between gap-6 border-t border-slate-200 pt-6 dark:border-white/10"
          >
            {prev ? (
              <Link
                href={`/docs/${prev.slug}`}
                className="group focus-visible:outline-2 focus-visible:outline-blue-500"
              >
                <span className="block text-xs text-slate-400 dark:text-slate-500">Previous</span>
                <span className="mt-1 block text-[15px] font-medium text-slate-700 group-hover:text-blue-700 dark:text-slate-200 dark:group-hover:text-blue-300">
                  ← {prev.title}
                </span>
              </Link>
            ) : (
              <span />
            )}
            {next && (
              <Link
                href={`/docs/${next.slug}`}
                className="group text-right focus-visible:outline-2 focus-visible:outline-blue-500"
              >
                <span className="block text-xs text-slate-400 dark:text-slate-500">Next</span>
                <span className="mt-1 block text-[15px] font-medium text-slate-700 group-hover:text-blue-700 dark:text-slate-200 dark:group-hover:text-blue-300">
                  {next.title} →
                </span>
              </Link>
            )}
          </nav>
        </main>

        {/* Right TOC */}
        <aside className="sticky top-[60px] hidden max-h-[calc(100vh-60px)] w-56 shrink-0 overflow-y-auto py-2 xl:block">
          <Toc headings={page.headings} />
        </aside>
      </div>
    </DocsShell>
  );
}
