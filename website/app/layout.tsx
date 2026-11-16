import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import { THEME_SCRIPT } from '@/components/ThemeToggle';

export const metadata: Metadata = {
  title: {
    default: 'arcore-react docs — capacitor-arcore',
    template: '%s · arcore-react docs',
  },
  description:
    'Documentation for arcore-react (npm: capacitor-arcore), a high-level AR SDK for React + Capacitor with WebXR and native ARCore.',
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
