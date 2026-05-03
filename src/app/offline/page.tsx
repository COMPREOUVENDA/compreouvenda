import Link from 'next/link';
import Image from 'next/image';

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6 text-center">
      {/* Logo */}
      <div className="mb-8">
        <Image
          src="/logo-full.png"
          alt="COMPREOUVENDA.COM"
          width={220}
          height={60}
          className="h-14 w-auto object-contain mx-auto"
        />
      </div>

      {/* Offline illustration */}
      <div className="w-24 h-24 rounded-full bg-brand-purple/10 flex items-center justify-center mb-6">
        <svg
          className="w-12 h-12 text-brand-purple"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M18.364 5.636a9 9 0 010 12.728M15.536 8.464a5 5 0 010 7.072M12 13a1 1 0 100-2 1 1 0 000 2zm-3.536-1.464a5 5 0 007.072 0M5.636 5.636a9 9 0 000 12.728"
          />
          <line x1="3" y1="3" x2="21" y2="21" strokeLinecap="round" strokeWidth={1.5} />
        </svg>
      </div>

      {/* Message */}
      <h1 className="font-display font-bold text-2xl text-gray-900 mb-3">
        Você está sem conexão
      </h1>
      <p className="text-gray-500 text-base leading-relaxed max-w-xs mb-8">
        Verifique sua internet e tente novamente. Algumas páginas já visitadas ainda estão disponíveis.
      </p>

      {/* Retry button */}
      <button
        onClick={() => window.location.reload()}
        className="btn-primary mb-4"
        aria-label="Tentar reconectar"
      >
        Tentar novamente
      </button>

      <Link
        href="/"
        className="text-brand-blue text-sm font-medium hover:underline"
        aria-label="Ir para a página inicial"
      >
        Ir para o início
      </Link>

      {/* Brand colors accent */}
      <div className="mt-12 flex gap-2" aria-hidden="true">
        <div className="w-3 h-3 rounded-full bg-brand-purple" />
        <div className="w-3 h-3 rounded-full bg-brand-blue" />
        <div className="w-3 h-3 rounded-full bg-brand-orange" />
        <div className="w-3 h-3 rounded-full bg-brand-pink" />
        <div className="w-3 h-3 rounded-full bg-brand-gold" />
      </div>
    </div>
  );
}
