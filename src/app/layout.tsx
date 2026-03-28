import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'My App',
    template: '%s — My App',
  },
  description: 'Built with Claude Code Mastery Starter Kit',
  robots: { index: true, follow: true },
  openGraph: {
    type: 'website',
    title: 'My App',
    description: 'Built with Claude Code Mastery Starter Kit',
    siteName: 'My App',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'My App',
    description: 'Built with Claude Code Mastery Starter Kit',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {process.env.NEXT_PUBLIC_RYBBIT_SITE_ID && (
          <script
            src={`${process.env.NEXT_PUBLIC_RYBBIT_URL || 'https://app.rybbit.io'}/api/script.js`}
            data-site-id={process.env.NEXT_PUBLIC_RYBBIT_SITE_ID}
            defer
          />
        )}
      </head>
      <body>{children}</body>
    </html>
  );
}
