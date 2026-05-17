'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { QrCode, RefreshCw, Clock, Loader2, AlertTriangle } from 'lucide-react';

interface Props {
  orderId: string;
  initialQRImageURL?: string;
  initialQRExpiresAt?: string;
  role: 'seller' | 'buyer';
}

export default function EscrowQRDisplay({ orderId, initialQRImageURL, initialQRExpiresAt, role }: Props) {
  const [qrImageURL, setQrImageURL] = useState(initialQRImageURL ?? '');
  const [qrExpiresAt, setQrExpiresAt] = useState(initialQRExpiresAt ?? '');
  const [timeLeft, setTimeLeft] = useState('');
  const [isExpired, setIsExpired] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!qrExpiresAt) return;
    const update = () => {
      const diff = new Date(qrExpiresAt).getTime() - Date.now();
      if (diff <= 0) {
        setIsExpired(true);
        setTimeLeft('Expirado');
      } else {
        const h = Math.floor(diff / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        setTimeLeft(`${h}h ${m}min`);
        setIsExpired(false);
      }
    };
    update();
    const timer = setInterval(update, 30000);
    return () => clearInterval(timer);
  }, [qrExpiresAt]);

  const regenerate = async () => {
    if (role !== 'seller') return;
    setRegenerating(true);
    setError('');
    try {
      const res = await fetch('/api/escrow/deliver', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, regenerate: true }),
      });
      const json = await res.json() as { qrImageURL?: string; qrExpiresAt?: string; error?: string };
      if (!res.ok) {
        setError(json.error ?? 'Erro ao regenerar QR');
      } else {
        if (json.qrImageURL) setQrImageURL(json.qrImageURL);
        if (json.qrExpiresAt) setQrExpiresAt(json.qrExpiresAt);
      }
    } catch {
      setError('Erro de conexão');
    } finally {
      setRegenerating(false);
    }
  };

  if (role === 'buyer') {
    return (
      <div className="bg-[#5B2D8E]/10 border border-[#5B2D8E]/30 rounded-2xl p-5 text-center">
        <QrCode className="w-10 h-10 text-[#5B2D8E] mx-auto mb-3" />
        <p className="font-semibold text-white mb-1">Confirme o recebimento</p>
        <p className="text-sm text-gray-400">
          Peça ao vendedor para mostrar o QR Code e escaneie com a câmera abaixo.
        </p>
      </div>
    );
  }

  // Seller view
  return (
    <div className="space-y-4">
      <div className="text-center">
        <p className="font-semibold text-white mb-0.5">QR Code de Confirmação</p>
        <p className="text-xs text-gray-500">Mostre este código ao comprador para confirmar a entrega</p>
      </div>

      {qrImageURL ? (
        <div className="flex flex-col items-center gap-3">
          <div className={`p-3 bg-white rounded-2xl ${isExpired ? 'opacity-40' : ''}`}>
            <Image
              src={qrImageURL}
              alt="QR Code de confirmação"
              width={200}
              height={200}
              className="rounded-lg"
              unoptimized
            />
          </div>

          {/* Expiry info */}
          <div className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full ${
            isExpired ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'
          }`}>
            <Clock className="w-3.5 h-3.5" />
            {isExpired ? 'QR Code expirado' : `Válido por mais ${timeLeft}`}
          </div>

          {isExpired && role === 'seller' && (
            <button
              onClick={regenerate}
              disabled={regenerating}
              className="flex items-center gap-2 px-4 py-2 bg-[#5B2D8E] hover:bg-[#4a2470] disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors"
            >
              {regenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Regenerar QR Code
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 py-6">
          <QrCode className="w-12 h-12 text-gray-600" />
          <p className="text-sm text-gray-500">QR Code não gerado ainda</p>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-xs text-red-400 bg-red-400/10 rounded-lg p-3">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="bg-gray-800 rounded-xl p-4">
        <p className="text-xs text-gray-400 font-semibold mb-2">Instruções para o vendedor:</p>
        <ol className="text-xs text-gray-500 space-y-1 list-decimal list-inside">
          <li>Mostre este QR Code ao comprador</li>
          <li>O comprador escaneará com o app</li>
          <li>Após validação, o pagamento é liberado automaticamente</li>
          <li>O QR Code expira em 24h — regenere se necessário</li>
        </ol>
      </div>
    </div>
  );
}
