import type { Metadata } from 'next';
import Script from 'next/script';
import { Sidebar } from '@/components/Sidebar';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Bill Tracker',
    template: '%s — Bill Tracker',
  },
  description: 'Personal bill tracker — manage due dates, payments, and recurring bills.',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="bg-zinc-950">
      <body suppressHydrationWarning className="bg-zinc-950 text-zinc-100 antialiased">
        <div className="flex min-h-screen">
          <Sidebar />
          <div className="flex-1 min-w-0">{children}</div>
        </div>
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
