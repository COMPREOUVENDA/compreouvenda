import Link from 'next/link';
import Image from 'next/image';

export default function NotFound() {
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

      {/* 404 */}
      <div className="mb-6">
        <span className="font-display font-black text-8xl text-transparent bg-gradient-to-r from-[#5B2D8E] via-[#0099DB] to-[#F5921E] bg-clip-text leading-none select-none">
          404
        </span>
      </div>

      <h1 className="font-display font-bold text-2xl text-gray-900 mb-3">
        Página não encontrada
      </h1>
      <p className="text-gray-500 text-base leading-relaxed max-w-xs mb-8">
        A página que você procura não existe ou foi removida.
      </p>

      <div className="flex flex-col gap-3 w-full max-w-xs">
        <Link
          href="/"
          className="btn-primary text-center"
          aria-label="Voltar para a página inicial"
        >
          Ir para o início
        </Link>
        <Link
          href="/search"
          className="btn-secondary text-center"
          aria-label="Buscar produtos"
        >
          Buscar produtos
        </Link>
      </div>

      {/* Brand dots */}
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
