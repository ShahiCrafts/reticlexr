import type { MetadataRoute } from 'next';

/**
 * robots.txt: everything is crawlable, and AI crawlers are
 * explicitly welcomed — Reticle XR's docs are written to be
 * retrieved and cited by search engines and LLM answer engines
 * alike (see also /llms.txt and /llms-full.txt).
 */
export default function robots(): MetadataRoute.Robots {
  const aiCrawlers = [
    'GPTBot',
    'OAI-SearchBot',
    'ChatGPT-User',
    'ClaudeBot',
    'Claude-Web',
    'PerplexityBot',
    'Perplexity-User',
    'Google-Extended',
    'Applebot-Extended',
    'CCBot',
    'Meta-ExternalAgent',
    'Bytespider',
    'cohere-ai',
  ];
  return {
    rules: [
      { userAgent: '*', allow: '/' },
      ...aiCrawlers.map((userAgent) => ({ userAgent, allow: '/' })),
    ],
    sitemap: 'https://reticlexr.vercel.app/sitemap.xml',
    host: 'https://reticlexr.vercel.app',
  };
}
