import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://elegant-suite.com';

  // Explicitly allow every AI crawler + answer engine we know of. Written
  // out even though the '*' rule already covers them, because some audit
  // tools + host WAFs look for named UAs before honouring a wildcard.
  // Keeping the site indexable in AI answers (ChatGPT, Claude, Perplexity,
  // Gemini) is the AEO equivalent of showing up in Google — the guest
  // journey now often starts with "hotel in Multan near airport" typed
  // into an AI assistant.
  const aiCrawlers = [
    'GPTBot',              // OpenAI training
    'OAI-SearchBot',       // OpenAI search
    'ChatGPT-User',        // ChatGPT live browsing
    'ClaudeBot',           // Anthropic training
    'Claude-Web',          // Anthropic live browsing
    'anthropic-ai',        // Anthropic alt
    'PerplexityBot',       // Perplexity crawler
    'Perplexity-User',     // Perplexity live retrieval
    'CCBot',               // Common Crawl (feeds many LLMs)
    'Google-Extended',     // Gemini + AI Overviews training
    'Bytespider',          // ByteDance / TikTok AI
    'Applebot',            // Apple + Apple Intelligence
    'Applebot-Extended',   // Apple Intelligence extended
    'meta-externalagent',  // Meta AI training
    'Meta-ExternalFetcher',// Meta AI live fetch
  ];

  return {
    rules: [
      // Baseline: everyone gets the site except admin + internal pages.
      { userAgent: '*', allow: '/', disallow: ['/admin/', '/thank-you', '/api/'] },
      // Named AI crawlers — same allowlist but explicit so bots-blocker WAFs
      // and audit tools see they're welcome.
      ...aiCrawlers.map((ua) => ({
        userAgent: ua,
        allow: '/',
        disallow: ['/admin/', '/thank-you', '/api/'],
      })),
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
