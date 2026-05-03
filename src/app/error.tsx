'use client';

import Link from 'next/link';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Global Error]', error.digest || 'no-digest');
  }, [error]);

  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6 text-center font-sans">
        {/* Icon */}
        <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mb-6">
          <svg
            className="w-10 h-10 text-red-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
        </div>

        <h1 className="font-bold text-2xl text-gray-900 mb-3">
          Algo deu errado
        </h1>
        <p className="text-gray-500 text-base max-w-xs mb-8">
          Ocorreu um erro inesperado. Nossa equipe já foi notificada.
        </p>

        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button
            onClick={reset}
            className="bg-[#F5921E] text-white font-semibold py-3 px-6 rounded-2xl hover:bg-[#F5921E]/90 transition-all"
          >
            Tentar novamente
          </button>
          <Link
            href="/"
            className="text-[#5B2D8E] text-sm font-medium hover:underline"
          >
            Ir para o início
          </Link>
        </div>
      </body>
    </html>
  );
}
