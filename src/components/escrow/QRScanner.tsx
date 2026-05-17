'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, CameraOff, Loader2, CheckCircle2, XCircle, KeyboardIcon } from 'lucide-react';

interface Props {
  orderId: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

type ScanState = 'idle' | 'scanning' | 'validating' | 'success' | 'error';

export default function QRScanner({ orderId, onSuccess, onError }: Props) {
  const [scanState, setScanState] = useState<ScanState>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [useManualInput, setUseManualInput] = useState(false);
  const [manualToken, setManualToken] = useState('');
  const [cameraError, setCameraError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number>(0);
  const jsQRRef = useRef<((data: Uint8ClampedArray, width: number, height: number) => { data: string } | null) | null>(null);

  // Dynamically load jsQR (installed via: npm install jsqr @types/jsqr)
  useEffect(() => {
    type JsQRFn = (data: Uint8ClampedArray, w: number, h: number) => { data: string } | null;
    // Use require to avoid TS module resolution errors before npm install
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const jsqr = require('jsqr') as { default?: JsQRFn } | JsQRFn;
      jsQRRef.current = (typeof jsqr === 'function' ? jsqr : (jsqr as { default?: JsQRFn }).default) ?? null;
    } catch {
      setCameraError(true);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  const startCamera = async () => {
    setCameraError(false);
    setScanState('scanning');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        scanFrame();
      }
    } catch {
      setCameraError(true);
      setScanState('idle');
      setUseManualInput(true);
    }
  };

  const scanFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const jsQR = jsQRRef.current;

    if (!video || !canvas || !jsQR || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animationRef.current = requestAnimationFrame(scanFrame);
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height);

    if (code) {
      stopCamera();
      validateToken(code.data);
    } else {
      animationRef.current = requestAnimationFrame(scanFrame);
    }
  }, [stopCamera]); // eslint-disable-line react-hooks/exhaustive-deps

  const validateToken = async (token: string) => {
    setScanState('validating');
    try {
      const res = await fetch('/api/escrow/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          qrToken: token,
          deviceFingerprint: navigator.userAgent.slice(0, 64),
        }),
      });
      const json = await res.json() as { error?: string };

      if (!res.ok) {
        setScanState('error');
        setErrorMessage(json.error ?? 'Erro ao validar QR Code');
        onError?.(json.error ?? 'Erro');
      } else {
        setScanState('success');
        onSuccess?.();
      }
    } catch {
      setScanState('error');
      setErrorMessage('Erro de conexão. Tente novamente.');
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualToken.trim()) validateToken(manualToken.trim());
  };

  const reset = () => {
    setScanState('idle');
    setErrorMessage('');
    setManualToken('');
  };

  // --- Render states ---

  if (scanState === 'success') {
    return (
      <div className="flex flex-col items-center gap-3 py-8">
        <CheckCircle2 className="w-16 h-16 text-emerald-400" />
        <p className="font-display font-bold text-xl text-white">Entrega Confirmada!</p>
        <p className="text-sm text-gray-400">O pagamento foi liberado ao vendedor.</p>
      </div>
    );
  }

  if (scanState === 'error') {
    return (
      <div className="flex flex-col items-center gap-3 py-8">
        <XCircle className="w-16 h-16 text-red-400" />
        <p className="font-display font-bold text-lg text-white">QR Code Inválido</p>
        <p className="text-sm text-gray-400 text-center">{errorMessage}</p>
        <button
          onClick={reset}
          className="mt-2 px-5 py-2 bg-[#5B2D8E] hover:bg-[#4a2470] text-white rounded-xl text-sm font-semibold transition-colors"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  if (scanState === 'validating') {
    return (
      <div className="flex flex-col items-center gap-3 py-8">
        <Loader2 className="w-12 h-12 text-[#F5921E] animate-spin" />
        <p className="text-sm text-gray-400">Validando QR Code...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {!useManualInput ? (
        <>
          {scanState === 'scanning' ? (
            <div className="relative rounded-2xl overflow-hidden bg-black aspect-square max-w-xs mx-auto">
              <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
              <canvas ref={canvasRef} className="hidden" />
              {/* Viewfinder overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-48 h-48 border-2 border-[#F5921E] rounded-xl opacity-80">
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-[#F5921E] rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-[#F5921E] rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-[#F5921E] rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-[#F5921E] rounded-br-lg" />
                </div>
              </div>
              <p className="absolute bottom-3 left-0 right-0 text-center text-xs text-white/70">
                Aponte para o QR Code do vendedor
              </p>
            </div>
          ) : (
            <button
              onClick={startCamera}
              className="w-full flex flex-col items-center gap-3 py-10 border-2 border-dashed border-[#5B2D8E]/50 rounded-2xl hover:border-[#5B2D8E] hover:bg-[#5B2D8E]/5 transition-all"
            >
              <Camera className="w-12 h-12 text-[#5B2D8E]" />
              <span className="font-semibold text-white">Escanear QR Code</span>
              <span className="text-xs text-gray-500">Toque para ativar a câmera</span>
            </button>
          )}

          {scanState !== 'scanning' && (
            <button
              onClick={() => setUseManualInput(true)}
              className="w-full flex items-center justify-center gap-2 py-3 text-sm text-gray-400 hover:text-white transition-colors"
            >
              <KeyboardIcon className="w-4 h-4" />
              Inserir código manualmente
            </button>
          )}

          {cameraError && (
            <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-400/10 rounded-lg p-3">
              <CameraOff className="w-4 h-4 shrink-0" />
              Câmera não disponível. Use o modo manual.
            </div>
          )}
        </>
      ) : (
        <form onSubmit={handleManualSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Código QR</label>
            <textarea
              value={manualToken}
              onChange={(e) => setManualToken(e.target.value)}
              placeholder="Cole aqui o conteúdo do QR Code"
              rows={3}
              className="w-full bg-gray-800 border border-gray-600 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#5B2D8E] resize-none font-mono"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={!manualToken.trim()}
              className="flex-1 py-2.5 bg-[#5B2D8E] hover:bg-[#4a2470] disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors"
            >
              Confirmar
            </button>
            <button
              type="button"
              onClick={() => setUseManualInput(false)}
              className="px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-xl text-sm transition-colors"
            >
              Câmera
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
