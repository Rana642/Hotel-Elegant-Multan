'use client';

import { useEffect } from 'react';

// Root-level error boundary. Catches ANYTHING the deeper /admin boundary
// misses (root-layout errors, initial-render exceptions, hydration
// mismatches). Without this the app falls back to Next.js's built-in
// generic "Application error: a client-side exception has occurred" —
// which gives the user zero info and forces the developer to open
// DevTools to diagnose.

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[root error boundary]', error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, -apple-system, sans-serif', background: '#f7f7f7', margin: 0, minHeight: '100vh' }}>
        <div style={{ maxWidth: 640, margin: '60px auto', padding: '32px 28px', background: 'white', borderRadius: 8, border: '1px solid #fecaca', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#dc2626', fontWeight: 600, margin: '0 0 8px' }}>
            Runtime error
          </p>
          <h1 style={{ fontSize: 22, color: '#1A0B2E', margin: '0 0 16px', fontWeight: 600 }}>
            {error.message || 'Something went wrong'}
          </h1>
          {error.digest && (
            <p style={{ fontSize: 11, color: '#666', fontFamily: 'ui-monospace, monospace', margin: '0 0 16px' }}>
              digest: {error.digest}
            </p>
          )}
          {error.stack && (
            <pre style={{ fontSize: 11, background: '#f3f4f6', border: '1px solid #e5e7eb', padding: 12, overflow: 'auto', maxHeight: 260, fontFamily: 'ui-monospace, monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: '#374151', margin: '0 0 16px', borderRadius: 4 }}>
              {error.stack}
            </pre>
          )}
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={reset}
              style={{ padding: '10px 20px', background: '#1A0B2E', color: 'white', fontSize: 13, border: 'none', cursor: 'pointer', borderRadius: 4 }}
            >
              Try again
            </button>
            <a
              href="/"
              style={{ padding: '10px 20px', border: '1px solid #d1d5db', color: '#374151', fontSize: 13, textDecoration: 'none', borderRadius: 4 }}
            >
              Back to home
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
