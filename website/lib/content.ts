import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { FLAT_PAGES, sectionForSlug } from './nav';

const CONTENT_DIR = path.join(process.cwd(), 'content', 'docs');

export interface Heading {
  depth: 2 | 3;
  text: string;
  id: string;
}

export interface DocPage {
  slug: string;
  title: string;
  description: string;
  source: string; // MDX body without frontmatter
  headings: Heading[];
  plainText: string;
  filePath: string; // path relative to repo root, for "Edit this page"
}

function slugify(text: string): string {
  // Mirrors github-slugger (used by rehype-slug): lowercase, strip
  // punctuation, then replace each space with a hyphen (no collapsing).
  return text
    .toLowerCase()
    .replace(/[`*_~]/g, '')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s/g, '-');
}

function extractHeadings(source: string): Heading[] {
  const headings: Heading[] = [];
  const seen = new Map<string, number>();
  let inFence = false;
  for (const line of source.split('\n')) {
    if (/^\s*```/.test(line)) inFence = !inFence;
    if (inFence) continue;
    const m = /^(#{2,3})\s+(.+?)\s*$/.exec(line);
    if (!m) continue;
    const text = m[2].replace(/[`*_]/g, '');
    let id = slugify(text);
    const count = seen.get(id) ?? 0;
    seen.set(id, count + 1);
    if (count > 0) id = `${id}-${count}`;
    headings.push({ depth: m[1].length as 2 | 3, text, id });
  }
  return headings;
}

function toPlainText(source: string): string {
  return source
    .replace(/```[\s\S]*?```/g, (block) => block.replace(/```/g, ' '))
    .replace(/<[^>]+>/g, ' ')
    .replace(/[#>*_`|[\]()!-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function getDocPage(slug: string): DocPage | null {
  const file = path.join(CONTENT_DIR, `${slug}.mdx`);
  if (!fs.existsSync(file)) return null;
  const raw = fs.readFileSync(file, 'utf8');
  const { data, content } = matter(raw);
  return {
    slug,
    title: data.title ?? slug,
    description: data.description ?? '',
    source: content,
    headings: extractHeadings(content),
    plainText: toPlainText(content),
    filePath: `website/content/docs/${slug}.mdx`,
  };
}

export function getAllDocPages(): DocPage[] {
  return FLAT_PAGES.map((p) => getDocPage(p.slug)).filter(
    (p): p is DocPage => p !== null,
  );
}

export interface SearchEntry {
  [key: string]: string; // FlexSearch Document requires an index signature
  id: string; // slug for page entries, slug#anchor for section entries
  slug: string;
  anchor: string; // '' for the page-level entry
  pageTitle: string;
  section: string; // heading text for section entries, '' for page-level
  group: string; // nav section title (Guides, API reference, …)
  description: string;
  text: string; // this section's full body text (plain)
}

/** Split an MDX body into one chunk per heading (plus the intro before
 *  the first heading), pairing each chunk with its heading so section
 *  text can be indexed and linked separately — deep search. */
function splitByHeadings(
  source: string,
  headings: Heading[],
): Array<{ heading: Heading | null; body: string }> {
  const chunks: Array<{ heading: Heading | null; lines: string[] }> = [
    { heading: null, lines: [] },
  ];
  let next = 0;
  let inFence = false;
  for (const line of source.split('\n')) {
    if (/^\s*```/.test(line)) inFence = !inFence;
    if (!inFence && next < headings.length) {
      const m = /^(#{2,3})\s+(.+?)\s*$/.exec(line);
      if (m && m[2].replace(/[`*_]/g, '') === headings[next].text) {
        chunks.push({ heading: headings[next], lines: [] });
        next += 1;
        continue;
      }
    }
    chunks[chunks.length - 1].lines.push(line);
  }
  return chunks.map((c) => ({ heading: c.heading, body: c.lines.join('\n') }));
}

export function getSearchIndex(): SearchEntry[] {
  const entries: SearchEntry[] = [];
  for (const page of getAllDocPages()) {
    const group = sectionForSlug(page.slug)?.title ?? 'Docs';
    const chunks = splitByHeadings(page.source, page.headings);
    for (const chunk of chunks) {
      const isPage = chunk.heading === null;
      entries.push({
        id: isPage ? page.slug : `${page.slug}#${chunk.heading!.id}`,
        slug: page.slug,
        anchor: isPage ? '' : chunk.heading!.id,
        pageTitle: page.title,
        section: isPage ? '' : chunk.heading!.text,
        group,
        description: page.description,
        text: toPlainText(chunk.body).slice(0, 6000),
      });
    }
  }
  return entries;
}

export function editUrl(filePath: string): string {
  return `https://github.com/ShahiCrafts/reticlexr/edit/main/${filePath}`;
}
