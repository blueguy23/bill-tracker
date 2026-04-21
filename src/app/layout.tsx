import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import { AppShell } from '@/components/AppShell';
import { DemoBanner } from '@/components/DemoBanner';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Folio',
    template: '%s — Folio',
  },
  description: 'Your personal finance command center. Track bills, goals, budgets and spending in one place.',
  robots: { index: false, follow: false },
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  themeColor: '#0b0b0f',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" style={{ background: '#0b0b0f' }}>
      <body suppressHydrationWarning style={{ background: '#0b0b0f' }}>
        <DemoBanner />
        <AppShell>{children}</AppShell>
        {process.env.NEXT_PUBLIC_RYBBIT_SITE_ID && (
          <Script
            src={`${process.env.NEXT_PUBLIC_RYBBIT_URL || 'https://app.rybbit.io'}/api/script.js`}
            data-site-id={process.env.NEXT_PUBLIC_RYBBIT_SITE_ID}
            strategy="afterInteractive"
          />
        )}
        <Script id="sw-register" strategy="afterInteractive">{`
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
              navigator.serviceWorker.register('/sw.js').catch(() => {});
            });
          }
        `}</Script>
      </body>
    </html>
  );
}
