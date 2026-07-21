import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import {
  CODE_TTL_MS,
  escapeHtml,
  generateId,
  isLockedOut,
  recordFailedAttempt,
  clearFailedAttempts,
} from '@/lib/mcpOauth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface AuthorizeParams {
  response_type: string;
  client_id: string;
  redirect_uri: string;
  code_challenge: string;
  code_challenge_method: string;
  state: string;
  resource: string;
}

function getClientIp(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return 'unknown';
}

function renderForm(params: AuthorizeParams, opts: { error?: string; clientName?: string | null }) {
  const { error, clientName } = opts;
  const hidden = Object.entries(params)
    .map(([k, v]) => `<input type="hidden" name="${k}" value="${escapeHtml(v)}">`)
    .join('\n');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Approve Access — Hotel Elegant</title>
<style>
  body { font-family: -apple-system, system-ui, sans-serif; background: #1A0B2E; color: #fff;
         display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; }
  .card { background: #fff; color: #1A0B2E; border-radius: 8px; padding: 32px 28px; max-width: 380px; width: 100%; }
  h1 { font-size: 1.25rem; margin: 0 0 8px; }
  p.sub { color: #666; font-size: 0.9rem; margin: 0 0 24px; }
  label { display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 6px; }
  input[type=password] { width: 100%; box-sizing: border-box; padding: 12px; border: 1px solid #ccc;
         border-radius: 6px; font-size: 1rem; margin-bottom: 16px; }
  button { width: 100%; padding: 13px; background: #E30613; color: #fff; border: none; border-radius: 6px;
         font-weight: 600; font-size: 0.95rem; letter-spacing: 0.03em; cursor: pointer; }
  button:hover { background: #b8040f; }
  .err { background: #fee; color: #c00; padding: 10px 12px; border-radius: 6px; font-size: 0.85rem; margin-bottom: 16px; }
</style>
</head>
<body>
  <div class="card">
    <h1>Hotel Elegant Dashboard</h1>
    <p class="sub">${clientName ? escapeHtml(clientName) : 'An app'} wants to view and edit room names and rates.</p>
    ${error ? `<div class="err">${escapeHtml(error)}</div>` : ''}
    <form method="POST" action="/api/oauth/authorize">
      ${hidden}
      <label for="password">Owner password</label>
      <input type="password" id="password" name="password" autofocus required>
      <button type="submit">Approve</button>
    </form>
  </div>
</body>
</html>`;
}

function renderError(message: string) {
  return new NextResponse(
    `<!doctype html><html><body style="font-family:sans-serif;padding:40px;text-align:center">
      <h2>Cannot complete request</h2><p>${escapeHtml(message)}</p></body></html>`,
    { status: 400, headers: { 'Content-Type': 'text/html' } }
  );
}

async function loadClient(clientId: string) {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from('mcp_oauth_clients')
    .select('client_id, redirect_uris, client_name')
    .eq('client_id', clientId)
    .maybeSingle();
  return data;
}

function extractParams(source: URLSearchParams): AuthorizeParams {
  return {
    response_type: source.get('response_type') || '',
    client_id: source.get('client_id') || '',
    redirect_uri: source.get('redirect_uri') || '',
    code_challenge: source.get('code_challenge') || '',
    code_challenge_method: source.get('code_challenge_method') || '',
    state: source.get('state') || '',
    resource: source.get('resource') || '',
  };
}

/** Validate client_id + redirect_uri BEFORE trusting redirect_uri for anything (open-redirect guard). */
async function validateClientAndRedirect(
  params: AuthorizeParams
): Promise<{ ok: true; clientName: string | null } | { ok: false; response: NextResponse }> {
  if (!params.client_id || !params.redirect_uri) {
    return { ok: false, response: renderError('Missing client_id or redirect_uri.') };
  }
  const client = await loadClient(params.client_id);
  if (!client) {
    return { ok: false, response: renderError('Unknown client_id. Register the client first via /api/oauth/register.') };
  }
  if (!client.redirect_uris.includes(params.redirect_uri)) {
    return { ok: false, response: renderError('redirect_uri does not match any URI registered for this client.') };
  }
  return { ok: true, clientName: client.client_name };
}

export async function GET(req: NextRequest) {
  const params = extractParams(req.nextUrl.searchParams);

  const check = await validateClientAndRedirect(params);
  if (!check.ok) return check.response;

  if (params.response_type !== 'code') {
    return renderError('Only response_type=code is supported.');
  }
  if (!params.code_challenge || params.code_challenge_method !== 'S256') {
    return renderError('PKCE with code_challenge_method=S256 is required.');
  }

  return new NextResponse(renderForm(params, { clientName: check.clientName }), {
    status: 200,
    headers: { 'Content-Type': 'text/html' },
  });
}

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const params: AuthorizeParams = {
    response_type: String(form.get('response_type') || ''),
    client_id: String(form.get('client_id') || ''),
    redirect_uri: String(form.get('redirect_uri') || ''),
    code_challenge: String(form.get('code_challenge') || ''),
    code_challenge_method: String(form.get('code_challenge_method') || ''),
    state: String(form.get('state') || ''),
    resource: String(form.get('resource') || ''),
  };
  const password = String(form.get('password') || '');

  const check = await validateClientAndRedirect(params);
  if (!check.ok) return check.response;

  const ip = getClientIp(req);
  if (isLockedOut(ip)) {
    return new NextResponse(renderForm(params, { error: 'Too many attempts. Try again in 15 minutes.', clientName: check.clientName }), {
      status: 429,
      headers: { 'Content-Type': 'text/html' },
    });
  }

  const expected = process.env.MCP_OWNER_PASSWORD;
  if (!expected || password !== expected) {
    recordFailedAttempt(ip);
    return new NextResponse(renderForm(params, { error: 'Incorrect password.', clientName: check.clientName }), {
      status: 401,
      headers: { 'Content-Type': 'text/html' },
    });
  }
  clearFailedAttempts(ip);

  const code = generateId('oac');
  const supabase = createServiceClient();
  const { error } = await supabase.from('mcp_oauth_codes').insert({
    code,
    client_id: params.client_id,
    redirect_uri: params.redirect_uri,
    code_challenge: params.code_challenge,
    resource: params.resource || null,
    expires_at: new Date(Date.now() + CODE_TTL_MS).toISOString(),
  });
  if (error) return renderError(`Could not create authorization code: ${error.message}`);

  const redirect = new URL(params.redirect_uri);
  redirect.searchParams.set('code', code);
  if (params.state) redirect.searchParams.set('state', params.state);
  return NextResponse.redirect(redirect, 303);
}
