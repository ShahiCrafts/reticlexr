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

export const metadata: Metadata = {
  title: {
    default: 'reticlexr docs — reticlexr',
    template: '%s · reticlexr docs',
  },
  description:
    'Documentation for reticlexr (npm: reticlexr), a high-level AR SDK for React + Capacitor with WebXR and native ARCore.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={plexMono.variable} suppressHydrationWarning>
      <head>
        {/* Applies the stored / system theme before first paint — no flash. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
