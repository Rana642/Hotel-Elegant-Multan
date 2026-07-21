import { NextResponse } from 'next/server';
import { getSiteUrl, getMcpResourceUrl } from '@/lib/mcpOauth';

// RFC 9728 — OAuth 2.0 Protected Resource Metadata.
// Reached via the /.well-known/oauth-protected-resource rewrite in next.config.mjs.
export async function GET() {
  return NextResponse.json({
    resource: getMcpResourceUrl(),
    authorization_servers: [getSiteUrl()],
  });
}
