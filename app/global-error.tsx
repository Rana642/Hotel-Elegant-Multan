'use client';

import { useEffect } from 'react';

// Last-resort catch. Fires when even the root layout itself throws — the
// only boundary Next.js will consult in that case. Must include its own
// <html> + <body> because the root layout is what failed. Written with
// inline styles for the same reason: the global stylesheet import lives
// in the failed root layout.

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[global error boundary]', error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, -apple-system, sans-serif', background: '#1A0B2E', margin: 0, minHeight: '100vh', color: 'white' }}>
        <div style={{ maxWidth: 640, margin: '60px auto', padding: '32px 28px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8 }}>
          <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#E30613', fontWeight: 600, margin: '0 0 8px' }}>
            Fatal error
          </p>
          <h1 style={{ fontSize: 22, color: 'white', margin: '0 0 16px', fontWeight: 600 }}>
            {error.message || 'Something went wrong at the root of the application'}
          </h1>
          {error.digest && (
            <p style={{ fontSize: 11, color: '#aaa', fontFamily: 'ui-monospace, monospace', margin: '0 0 16px' }}>
              digest: {error.digest}
            </p>
          )}
          {error.stack && (
            <pre style={{ fontSize: 11, background: 'rgba(0,0,0,0.3)', padding: 12, overflow: 'auto', maxHeight: 260, fontFamily: 'ui-monospace, monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: '#e5e7eb', margin: '0 0 16px', borderRadius: 4 }}>
              {error.stack}
            </pre>
          )}
          <button
            onClick={reset}
            style={{ padding: '10px 20px', background: '#E30613', color: 'white', fontSize: 13, border: 'none', cursor: 'pointer', borderRadius: 4 }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
