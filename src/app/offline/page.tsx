'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { WifiOff, RefreshCw, Home, Wifi } from 'lucide-react';

export default function OfflinePage() {
  const [retrying, setRetrying] = useState(false);
  const [dots, setDots] = useState('');

  // Animação de pontinhos no "Tentando reconectar..."
  useEffect(() => {
    const interval = setInterval(() => {
      setDots((d) => (d.length >= 3 ? '' : d + '.'));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Verificar automaticamente quando a conexão voltar
  useEffect(() => {
    const handleOnline = () => {
      window.location.reload();
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  function handleRetry() {
    setRetrying(true);
    setTimeout(() => {
      window.location.reload();
    }, 800);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-950/30 to-gray-900 flex flex-col items-center justify-center px-6 text-center">

      {/* Ícone animado */}
      <div className="relative mb-8">
        <div className="w-24 h-24 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
          <WifiOff className="w-10 h-10 text-purple-400" />
        </div>
        {/* Pulsar */}
        <div className="absolute inset-0 rounded-full border border-purple-500/20 animate-ping opacity-30" />
      </div>

      {/* Mensagem */}
      <h1 className="font-bold text-2xl text-white mb-3">
        Você está offline
      </h1>
      <p className="text-gray-400 text-sm leading-relaxed max-w-xs mb-2">
        Verifique sua conexão com a internet e tente novamente.
      </p>
      <p className="text-gray-500 text-xs mb-8">
        Monitorando conexão{dots}
      </p>

      {/* Dica de cache */}
      <div className="bg-purple-500/10 border border-purple-500/20 rounded-2xl px-5 py-4 max-w-xs mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Wifi className="w-4 h-4 text-purple-400" />
          <span className="text-purple-300 text-sm font-medium">Conteúdo em cache</span>
        </div>
        <p className="text-gray-400 text-xs leading-relaxed">
          Páginas visitadas recentemente ainda podem estar disponíveis. Tente navegar normalmente.
        </p>
      </div>

      {/* Botões */}
      <button
        onClick={handleRetry}
        disabled={retrying}
        className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white font-semibold px-6 py-3 rounded-2xl transition-all mb-3 w-full max-w-xs justify-center"
      >
        <RefreshCw className={`w-4 h-4 ${retrying ? 'animate-spin' : ''}`} />
        {retrying ? 'Reconectando...' : 'Tentar novamente'}
      </button>

      <Link
        href="/"
        className="flex items-center gap-2 text-gray-400 hover:text-white text-sm font-medium transition-colors"
      >
        <Home className="w-4 h-4" />
        Ir para o início
      </Link>

      {/* Brand dots */}
      <div className="mt-12 flex gap-2" aria-hidden="true">
        <div className="w-2 h-2 rounded-full bg-purple-500" />
        <div className="w-2 h-2 rounded-full bg-blue-500" />
        <div className="w-2 h-2 rounded-full bg-orange-500" />
        <div className="w-2 h-2 rounded-full bg-pink-500" />
      </div>

      <p className="text-gray-600 text-xs mt-4">COMPREOUVENDA.COM</p>
    </div>
  );
}
