export interface NavPage {
  slug: string; // route under /docs, e.g. "guides/gestures"
  title: string;
}

export interface NavSection {
  title: string;
  pages: NavPage[];
}

export const NAV: NavSection[] = [
  {
    title: 'Getting started',
    pages: [{ slug: 'getting-started', title: 'Getting started' }],
  },
  {
    title: 'Guides',
    pages: [
      { slug: 'guides/react-integration', title: 'React integration' },
      { slug: 'guides/model-preloading-and-switching', title: 'Model preloading & switching' },
      { slug: 'guides/gestures', title: 'Gestures' },
      { slug: 'guides/colors-and-textures', title: 'Colors & textures' },
      { slug: 'guides/screenshots', title: 'Screenshots' },
      { slug: 'guides/overlays', title: 'Overlays' },
      { slug: 'guides/troubleshooting', title: 'Troubleshooting' },
    ],
  },
  {
    title: 'API reference',
    pages: [{ slug: 'api', title: 'API reference' }],
  },
  {
    title: 'Concepts',
    pages: [
      { slug: 'concepts/architecture', title: 'Architecture' },
      { slug: 'concepts/webxr-vs-native', title: 'WebXR vs native ARCore' },
      { slug: 'concepts/lifecycle', title: 'Lifecycle' },
    ],
  },
  {
    title: 'Project',
    pages: [
      { slug: 'compatibility', title: 'Compatibility' },
      { slug: 'known-issues', title: 'Known issues & roadmap' },
      { slug: 'changelog', title: 'Changelog' },
      { slug: 'contributing', title: 'Contributing' },
    ],
  },
];

export const FLAT_PAGES: NavPage[] = NAV.flatMap((s) => s.pages);

/** The nav section a page belongs to (used for the eyebrow above the H1). */
export function sectionForSlug(slug: string): NavSection | undefined {
  return NAV.find((s) => s.pages.some((p) => p.slug === slug));
}

export function prevNext(slug: string): { prev?: NavPage; next?: NavPage } {
  const i = FLAT_PAGES.findIndex((p) => p.slug === slug);
  if (i === -1) return {};
  return {
    prev: i > 0 ? FLAT_PAGES[i - 1] : undefined,
    next: i < FLAT_PAGES.length - 1 ? FLAT_PAGES[i + 1] : undefined,
  };
}
