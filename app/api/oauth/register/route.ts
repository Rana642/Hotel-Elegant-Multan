import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { generateId } from '@/lib/mcpOauth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// RFC 7591 — OAuth 2.0 Dynamic Client Registration Protocol.
// Public clients only (PKCE, no client_secret) — this server has exactly one
// human approver (the hotel owner), so any client may self-register; the real
// gate is the password on /api/oauth/authorize.
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: 'invalid_client_metadata', error_description: 'Body must be JSON.' },
      { status: 400 }
    );
  }

  const redirectUris = body.redirect_uris;
  if (!Array.isArray(redirectUris) || redirectUris.length === 0) {
    return NextResponse.json(
      { error: 'invalid_redirect_uri', error_description: 'redirect_uris must be a non-empty array.' },
      { status: 400 }
    );
  }
  for (const uri of redirectUris) {
    if (typeof uri !== 'string' || !/^https:\/\/|^http:\/\/localhost/.test(uri)) {
      return NextResponse.json(
        {
          error: 'invalid_redirect_uri',
          error_description: `Redirect URI must be https:// (or http://localhost for testing): ${String(uri)}`,
        },
        { status: 400 }
      );
    }
  }

  const clientName = typeof body.client_name === 'string' ? body.client_name.slice(0, 200) : null;
  const clientId = generateId('mcp_client');

  const supabase = createServiceClient();
  const { error } = await supabase.from('mcp_oauth_clients').insert({
    client_id: clientId,
    redirect_uris: redirectUris,
    client_name: clientName,
  });

  if (error) {
    return NextResponse.json(
      { error: 'server_error', error_description: `Could not register client: ${error.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      client_id: clientId,
      client_id_issued_at: Math.floor(Date.now() / 1000),
      redirect_uris: redirectUris,
      client_name: clientName,
      token_endpoint_auth_method: 'none',
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
    },
    { status: 201 }
  );
}
