import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { MDXRemote } from 'next-mdx-remote/rsc';
import rehypeSlug from 'rehype-slug';
import rehypePrettyCode from 'rehype-pretty-code';
import { getDocPage, getSearchIndex, editUrl } from '@/lib/content';
import { FLAT_PAGES, prevNext } from '@/lib/nav';
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
  const searchIndex = getSearchIndex();

  return (
    <DocsShell currentSlug={slugStr} searchIndex={searchIndex}>
      <div className="flex gap-10 py-8 lg:py-10">
        {/* Left sidebar */}
        <aside className="sticky top-24 hidden max-h-[calc(100vh-7rem)] w-60 shrink-0 overflow-y-auto pr-2 lg:block">
          <SidebarNav currentSlug={slugStr} />
        </aside>

        {/* Content */}
        <main className="min-w-0 flex-1">
          <article className="prose prose-slate mx-auto max-w-3xl dark:prose-invert prose-headings:scroll-mt-24 prose-a:text-blue-700 prose-a:font-medium hover:prose-a:text-blue-900 dark:prose-a:text-blue-300 dark:hover:prose-a:text-blue-200 prose-code:text-[0.85em] prose-pre:p-0 prose-table:text-sm">
            <h1>{page.title}</h1>
            {page.description && <p className="lead">{page.description}</p>}
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
                        theme: { light: 'github-light', dark: 'github-dark' },
                        keepBackground: false,
                      },
                    ],
                  ],
                },
              }}
            />
          </article>

          <CopyEnhancer />

          <div className="mx-auto mt-10 max-w-3xl border-t border-slate-200 pt-5 dark:border-slate-800">
            <a
              href={editUrl(page.filePath)}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-medium text-slate-500 hover:text-blue-700 focus-visible:outline-2 focus-visible:outline-blue-500 dark:text-slate-400 dark:hover:text-blue-300"
            >
              Edit this page on GitHub →
            </a>
          </div>

          {/* Prev / Next */}
          <nav aria-label="More documentation" className="mx-auto mt-6 grid max-w-3xl gap-4 sm:grid-cols-2">
            {prev ? (
              <Link
                href={`/docs/${prev.slug}`}
                className="rounded-lg border border-slate-200 p-4 hover:border-blue-400 focus-visible:outline-2 focus-visible:outline-blue-500 dark:border-slate-800 dark:hover:border-blue-500"
              >
                <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Previous</span>
                <span className="mt-1 block font-medium text-slate-900 dark:text-slate-100">← {prev.title}</span>
              </Link>
            ) : (
              <span />
            )}
            {next && (
              <Link
                href={`/docs/${next.slug}`}
                className="rounded-lg border border-slate-200 p-4 text-right hover:border-blue-400 focus-visible:outline-2 focus-visible:outline-blue-500 dark:border-slate-800 dark:hover:border-blue-500"
              >
                <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Next</span>
                <span className="mt-1 block font-medium text-slate-900 dark:text-slate-100">{next.title} →</span>
              </Link>
            )}
          </nav>
        </main>

        {/* Right TOC */}
        <aside className="sticky top-24 hidden max-h-[calc(100vh-7rem)] w-56 shrink-0 overflow-y-auto xl:block">
          <Toc headings={page.headings} />
        </aside>
      </div>
    </DocsShell>
  );
}
