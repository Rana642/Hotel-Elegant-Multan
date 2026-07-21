-- MCP OAuth 2.1 authorization server storage.
-- Run this once in Supabase Dashboard -> SQL Editor.
-- These tables are only ever touched by the server's service-role client
-- (app/api/oauth/*), so RLS is enabled with NO policies — completely
-- inaccessible to the anon/public key, only reachable via service_role.

CREATE TABLE mcp_oauth_clients (
  client_id     TEXT PRIMARY KEY,
  redirect_uris TEXT[] NOT NULL,
  client_name   TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE mcp_oauth_codes (
  code            TEXT PRIMARY KEY,
  client_id       TEXT NOT NULL REFERENCES mcp_oauth_clients(client_id) ON DELETE CASCADE,
  redirect_uri    TEXT NOT NULL,
  code_challenge  TEXT NOT NULL,
  resource        TEXT,
  expires_at      TIMESTAMPTZ NOT NULL,
  used            BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE mcp_oauth_tokens (
  access_token   TEXT PRIMARY KEY,
  refresh_token  TEXT UNIQUE,
  client_id      TEXT NOT NULL REFERENCES mcp_oauth_clients(client_id) ON DELETE CASCADE,
  resource       TEXT,
  expires_at     TIMESTAMPTZ NOT NULL,
  refresh_expires_at TIMESTAMPTZ,
  revoked        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_mcp_oauth_codes_expires ON mcp_oauth_codes(expires_at);
CREATE INDEX idx_mcp_oauth_tokens_refresh ON mcp_oauth_tokens(refresh_token);
CREATE INDEX idx_mcp_oauth_tokens_expires ON mcp_oauth_tokens(expires_at);

ALTER TABLE mcp_oauth_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcp_oauth_codes   ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcp_oauth_tokens  ENABLE ROW LEVEL SECURITY;
-- No policies added: default-deny for anon/authenticated roles. service_role
-- bypasses RLS entirely, which is the only role the app uses for these tables.
