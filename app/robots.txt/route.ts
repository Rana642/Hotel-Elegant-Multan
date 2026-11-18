// /robots.txt as plain text so we can declare Content-Signal (AI usage
// preferences) inside each user-agent group, which the Next.js robots
// metadata API cannot express.

const AI_CRAWLERS = [
  'GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-Web',
  'anthropic-ai', 'PerplexityBot', 'Perplexity-User', 'CCBot',
  'Google-Extended', 'Bytespider', 'Applebot', 'Applebot-Extended',
  'meta-externalagent', 'Meta-ExternalFetcher',
];

// Search and answer retrieval allowed; model training not declared.
const CONTENT_SIGNAL = 'Content-Signal: search=yes, ai-train=no';

export function GET() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://elegant-suite.com';

  const group = (ua: string) =>
    [
      `User-agent: ${ua}`,
      'Allow: /',
      'Disallow: /admin/',
      'Disallow: /thank-you',
      'Disallow: /api/',
      CONTENT_SIGNAL,
      '',
    ].join('\n');

  const body = [
    group('*'),
    ...AI_CRAWLERS.map(group),
    `Sitemap: ${siteUrl}/sitemap.xml`,
    `Host: ${siteUrl}`,
    '',
  ].join('\n');

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
