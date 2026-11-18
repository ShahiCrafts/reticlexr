import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { IBM_Plex_Mono } from 'next/font/google';
import '@fontsource-variable/inter';
import './globals.css';
import { THEME_SCRIPT } from '@/components/ThemeToggle';

/** Typography matches the Tailwind CSS v4 docs: Inter Variable is the
    site-wide sans (self-hosted via @fontsource-variable/inter, family
    name "Inter Variable", weights 100–900); IBM Plex Mono covers code
    and the small-caps mono labels (eyebrows, sidebar group labels, TOC
    label, version pill) and is exposed as --font-plex-mono, wired into
    Tailwind's --font-mono in globals.css (@theme). */
const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  display: 'swap',
  variable: '--font-plex-mono',
});

const SITE_URL = 'https://reticlexr.vercel.app';
const SITE_DESCRIPTION =
  'Reticle XR (npm: reticlexr) is a high-level augmented reality SDK for React and Capacitor. Place GLB 3D models on real surfaces with WebXR, ARCore hit testing, plane detection and XRAnchors — tap-to-place, gestures, recolouring and screenshots in about ten lines of code.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Reticle XR - High-Level AR SDK for React & Capacitor',
    template: '%s - Reticle XR',
  },
  description: SITE_DESCRIPTION,
  keywords: [
    'augmented reality',
    'AR SDK',
    'WebXR',
    'ARCore',
    'React AR',
    'Capacitor AR',
    'reticlexr',
    'Reticle XR',
    'WebAR',
    'immersive AR',
    'Three.js AR',
    'AR for React',
    'product AR',
    '3D model viewer AR',
    'hit test',
    'plane detection',
    'XRAnchors',
  ],
  authors: [{ name: 'Saugat Shahi', url: 'https://github.com/ShahiCrafts' }],
  creator: 'Saugat Shahi (ShahiCrafts)',
  publisher: 'ShahiCrafts',
  category: 'technology',
  applicationName: 'Reticle XR',
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
  openGraph: {
    type: 'website',
    siteName: 'Reticle XR',
    title: 'Reticle XR - High-Level AR SDK for React & Capacitor',
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Reticle XR - High-Level AR SDK for React & Capacitor',
    description: SITE_DESCRIPTION,
  },
  other: {
    'npm-package': 'reticlexr',
  },
};

/** Structured data for search and answer engines: what Reticle XR
    is, where to get it, and what it runs on. Kept factual — every
    claim here is also stated in the docs. */
const JSON_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'SoftwareApplication',
      '@id': `${SITE_URL}/#software`,
      name: 'Reticle XR',
      alternateName: ['reticlexr', 'arcore-react'],
      applicationCategory: 'DeveloperApplication',
      applicationSubCategory: 'Augmented Reality SDK',
      operatingSystem: 'Android, Web (WebXR)',
      description: SITE_DESCRIPTION,
      url: SITE_URL,
      downloadUrl: 'https://www.npmjs.com/package/reticlexr',
      softwareVersion: '1.1.0',
      license: 'https://opensource.org/licenses/MIT',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      author: { '@id': `${SITE_URL}/#author` },
      codeRepository: 'https://github.com/ShahiCrafts/reticlexr',
      programmingLanguage: ['TypeScript', 'JavaScript'],
      runtimePlatform: ['WebXR', 'ARCore', 'Capacitor', 'React', 'Three.js'],
    },
    {
      '@type': 'Person',
      '@id': `${SITE_URL}/#author`,
      name: 'Saugat Shahi',
      url: 'https://github.com/ShahiCrafts',
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      name: 'Reticle XR',
      url: SITE_URL,
      description: SITE_DESCRIPTION,
      author: { '@id': `${SITE_URL}/#author` },
      inLanguage: 'en',
    },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={plexMono.variable} suppressHydrationWarning>
      <head>
        {/* Applies the stored / system theme before first paint — no flash. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
