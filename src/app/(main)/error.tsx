'use client';

import Link from 'next/link';
import { useEffect } from 'react';

export default function MainSectionError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Section Error]', error.digest || 'no-digest');
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-6 text-center">
      <div className="w-16 h-16 rounded-full bg-brand-orange/10 flex items-center justify-center mb-5">
        <svg
          className="w-8 h-8 text-brand-orange"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 9v3.75m9.303 3.376c.866 1.5-.217 3.374-1.948 3.374H4.645c-1.73 0-2.813-1.874-1.948-3.374l7.658-13.748c.866-1.5 3.032-1.5 3.898 0l7.657 13.748z"
          />
        </svg>
      </div>

      <h2 className="font-display font-bold text-xl text-gray-900 mb-2">
        Algo deu errado
      </h2>
      <p className="text-gray-500 text-sm max-w-xs mb-6">
        Não foi possível carregar esta seção. Tente novamente.
      </p>

      <div className="flex flex-col gap-2 w-full max-w-xs">
        <button
          onClick={reset}
          className="btn-primary"
          aria-label="Tentar carregar novamente"
        >
          Tentar novamente
        </button>
        <Link href="/" className="text-brand-blue text-sm font-medium hover:underline">
          Voltar ao início
        </Link>
      </div>
    </div>
  );
}
