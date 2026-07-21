import { NextResponse } from 'next/server';
import { getSiteUrl } from '@/lib/mcpOauth';

// RFC 8414 — OAuth 2.0 Authorization Server Metadata.
// Reached via the /.well-known/oauth-authorization-server rewrite in next.config.mjs.
export async function GET() {
  const siteUrl = getSiteUrl();
  return NextResponse.json({
    issuer: siteUrl,
    authorization_endpoint: `${siteUrl}/api/oauth/authorize`,
    token_endpoint: `${siteUrl}/api/oauth/token`,
    registration_endpoint: `${siteUrl}/api/oauth/register`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    code_challenge_methods_supported: ['S256'],
    token_endpoint_auth_methods_supported: ['none'],
    scopes_supported: ['mcp'],
  });
}
