'use client';

import { useEffect } from 'react';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface the actual error to any attached debugger / server log.
    console.error('[admin error boundary]', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
      <div className="max-w-2xl w-full bg-white border border-red-200 p-6">
        <p className="text-xs uppercase tracking-widest text-red-600 font-semibold mb-2">
          Admin — Runtime error
        </p>
        <h1 className="font-playfair font-semibold text-xl text-[#1A0B2E] mb-4">
          {error.message || 'Something went wrong'}
        </h1>
        {error.digest && (
          <p className="text-xs text-gray-500 mb-4 font-mono">digest: {error.digest}</p>
        )}
        {error.stack && (
          <pre className="text-[11px] bg-gray-100 border border-gray-200 p-3 overflow-auto max-h-64 font-mono whitespace-pre-wrap break-words text-gray-700">
            {error.stack}
          </pre>
        )}
        <div className="mt-5 flex gap-3">
          <button
            onClick={reset}
            className="px-4 py-2 bg-[#1A0B2E] text-white text-sm font-montserrat"
          >
            Try again
          </button>
          <a
            href="/admin/login"
            className="px-4 py-2 border border-gray-300 text-sm font-montserrat text-gray-700"
          >
            Back to login
          </a>
        </div>
      </div>
    </div>
  );
}
