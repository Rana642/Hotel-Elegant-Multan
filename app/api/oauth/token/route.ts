import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import {
  ACCESS_TOKEN_TTL_MS,
  REFRESH_TOKEN_TTL_MS,
  generateId,
  pkceMatches,
} from '@/lib/mcpOauth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function tokenError(error: string, description: string, status = 400) {
  return NextResponse.json({ error, error_description: description }, { status });
}

async function issueTokens(clientId: string, resource: string | null) {
  const supabase = createServiceClient();
  const accessToken = generateId('oat');
  const refreshToken = generateId('ort');
  const now = Date.now();

  const { error } = await supabase.from('mcp_oauth_tokens').insert({
    access_token: accessToken,
    refresh_token: refreshToken,
    client_id: clientId,
    resource,
    expires_at: new Date(now + ACCESS_TOKEN_TTL_MS).toISOString(),
    refresh_expires_at: new Date(now + REFRESH_TOKEN_TTL_MS).toISOString(),
  });
  if (error) throw error;

  return NextResponse.json({
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: Math.floor(ACCESS_TOKEN_TTL_MS / 1000),
    refresh_token: refreshToken,
    scope: 'mcp',
  });
}

async function handleAuthorizationCode(form: FormData) {
  const code = String(form.get('code') || '');
  const redirectUri = String(form.get('redirect_uri') || '');
  const clientId = String(form.get('client_id') || '');
  const codeVerifier = String(form.get('code_verifier') || '');

  if (!code || !redirectUri || !clientId || !codeVerifier) {
    return tokenError('invalid_request', 'code, redirect_uri, client_id and code_verifier are required.');
  }

  const supabase = createServiceClient();
  const { data: codeRow, error } = await supabase
    .from('mcp_oauth_codes')
    .select('*')
    .eq('code', code)
    .maybeSingle();

  if (error || !codeRow) return tokenError('invalid_grant', 'Unknown or already-used code.');
  if (codeRow.used) return tokenError('invalid_grant', 'This code has already been used.');
  if (new Date(codeRow.expires_at).getTime() < Date.now())
    return tokenError('invalid_grant', 'This code has expired. Start the authorization flow again.');
  if (codeRow.client_id !== clientId) return tokenError('invalid_grant', 'client_id does not match.');
  if (codeRow.redirect_uri !== redirectUri) return tokenError('invalid_grant', 'redirect_uri does not match.');
  if (!pkceMatches(codeVerifier, codeRow.code_challenge))
    return tokenError('invalid_grant', 'code_verifier does not match code_challenge.');

  // Single-use: mark consumed before issuing tokens.
  await supabase.from('mcp_oauth_codes').update({ used: true }).eq('code', code);

  try {
    return await issueTokens(clientId, codeRow.resource);
  } catch (e) {
    return tokenError('server_error', e instanceof Error ? e.message : 'Could not issue tokens.', 500);
  }
}

async function handleRefreshToken(form: FormData) {
  const refreshToken = String(form.get('refresh_token') || '');
  const clientId = String(form.get('client_id') || '');

  if (!refreshToken) return tokenError('invalid_request', 'refresh_token is required.');

  const supabase = createServiceClient();
  const { data: row, error } = await supabase
    .from('mcp_oauth_tokens')
    .select('*')
    .eq('refresh_token', refreshToken)
    .maybeSingle();

  if (error || !row) return tokenError('invalid_grant', 'Unknown refresh_token.');
  if (row.revoked) return tokenError('invalid_grant', 'This refresh_token has been revoked.');
  if (!row.refresh_expires_at || new Date(row.refresh_expires_at).getTime() < Date.now())
    return tokenError('invalid_grant', 'refresh_token has expired. Re-authorize from the client.');
  if (clientId && row.client_id !== clientId) return tokenError('invalid_grant', 'client_id does not match.');

  // Rotate: revoke the old row, issue a fresh access+refresh token pair.
  await supabase.from('mcp_oauth_tokens').update({ revoked: true }).eq('access_token', row.access_token);

  try {
    return await issueTokens(row.client_id, row.resource);
  } catch (e) {
    return tokenError('server_error', e instanceof Error ? e.message : 'Could not issue tokens.', 500);
  }
}

export async function POST(req: NextRequest) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return tokenError('invalid_request', 'Body must be application/x-www-form-urlencoded.');
  }

  const grantType = String(form.get('grant_type') || '');
  switch (grantType) {
    case 'authorization_code':
      return handleAuthorizationCode(form);
    case 'refresh_token':
      return handleRefreshToken(form);
    default:
      return tokenError('unsupported_grant_type', `grant_type "${grantType}" is not supported.`);
  }
}
