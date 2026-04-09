import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import { AppShell } from '@/components/AppShell';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Bill Tracker',
    template: '%s — Bill Tracker',
  },
  description: 'Personal bill tracker — manage due dates, payments, and recurring bills.',
  robots: { index: false, follow: false },
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  themeColor: '#09090b',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="bg-zinc-950">
      <body suppressHydrationWarning className="bg-zinc-950 text-white antialiased">
        <AppShell>{children}</AppShell>
        {process.env.NEXT_PUBLIC_RYBBIT_SITE_ID && (
          <Script
            src={`${process.env.NEXT_PUBLIC_RYBBIT_URL || 'https://app.rybbit.io'}/api/script.js`}
            data-site-id={process.env.NEXT_PUBLIC_RYBBIT_SITE_ID}
            strategy="afterInteractive"
          />
        )}
      </body>
    </html>
  );
}
