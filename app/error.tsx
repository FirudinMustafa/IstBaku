'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.error('[GlobalError]', error);
    }
  }, [error]);

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="size-16 mx-auto rounded-full bg-[color:var(--accent)]/10 flex items-center justify-center">
          <svg
            className="size-8 text-[color:var(--accent)]"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
            />
          </svg>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-[color:var(--fg)]">
            Bir hata olustu
          </h1>
          <p className="text-sm text-[color:var(--fg-muted)]">
            Beklenmedik bir sorun meydana geldi. Sayfayi yeniden yuklemeyi
            deneyebilir veya ana sayfaya donebilirsiniz.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center rounded-lg bg-[color:var(--accent)] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
          >
            Tekrar Dene
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-lg border border-[color:var(--border)] px-5 py-2.5 text-sm font-semibold text-[color:var(--fg-muted)] hover:text-[color:var(--fg)] transition-colors"
          >
            Ana Sayfa
          </Link>
        </div>
      </div>
    </div>
  );
}
