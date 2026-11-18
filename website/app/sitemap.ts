import type { MetadataRoute } from 'next';
import { FLAT_PAGES } from '@/lib/nav';

const BASE = 'https://reticlexr.vercel.app';

/**
 * Sitemap for the whole public site: the docs entry point, the
 * live demo, and every documentation page (slugs come from the
 * same FLAT_PAGES list the sidebar is built from, so the sitemap
 * can never drift from the real routes).
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const docs: MetadataRoute.Sitemap = FLAT_PAGES.map((p) => ({
    url: `${BASE}/docs/${p.slug}`,
    lastModified: now,
    changeFrequency: 'monthly',
    priority: p.slug === 'getting-started' ? 1.0 : 0.8,
  }));
  return [
    {
      url: `${BASE}/docs/getting-started`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 1.0,
    },
    {
      url: `${BASE}/demo`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    ...docs.filter((d) => d.url !== `${BASE}/docs/getting-started`),
  ];
}
