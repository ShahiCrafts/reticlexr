import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import { THEME_SCRIPT } from '@/components/ThemeToggle';

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
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Applies the stored / system theme before first paint — no flash. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
