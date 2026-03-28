export function JsonLd() {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'My App',
    url: process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com',
    description: 'Built with Claude Code Mastery Starter Kit',
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}
