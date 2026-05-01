'use client';

import { useState, useEffect } from 'react';
import { Sparkles, Film, Clock, CheckCircle, XCircle, RefreshCw, AlertTriangle, Upload, ChevronDown, Eye } from 'lucide-react';
import { PHOTO_LABELS } from '@/lib/constants';

type VideoStatus = 'idle' | 'uploading' | 'validating' | 'processing' | 'composing' | 'ready' | 'failed';

interface VideoGeneratorProps {
  photos: (File | null)[];
  productTitle?: string;
  onVideoReady?: (videoUrl: string, thumbnailUrl: string) => void;
}

const STATUS_CONFIG: Record<VideoStatus, { label: string; color: string; icon: typeof Clock }> = {
  idle: { label: 'Aguardando fotos', color: 'text-gray-400', icon: Clock },
  uploading: { label: 'Enviando fotos...', color: 'text-brand-blue', icon: Upload },
  validating: { label: 'Validando qualidade...', color: 'text-brand-orange', icon: AlertTriangle },
  processing: { label: 'Processando com IA...', color: 'text-brand-purple', icon: Sparkles },
  composing: { label: 'Compondo vídeo...', color: 'text-brand-blue', icon: Film },
  ready: { label: 'Vídeo pronto!', color: 'text-emerald-500', icon: CheckCircle },
  failed: { label: 'Falha na geração', color: 'text-red-500', icon: XCircle },
};

export default function VideoGenerator({ photos, productTitle, onVideoReady }: VideoGeneratorProps) {
  const [status, setStatus] = useState<VideoStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [videoType, setVideoType] = useState<'template' | 'pika' | 'runway'>('template');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const validPhotos = photos.filter(Boolean).length;
  const canGenerate = validPhotos >= 3;

  const simulateGeneration = async () => {
    setStatus('uploading');
    setProgress(0);
    setErrorMessage(null);

    // Simulate upload
    for (let i = 0; i <= 20; i++) {
      await new Promise((r) => setTimeout(r, 100));
      setProgress(i);
    }

    setStatus('validating');
    for (let i = 20; i <= 40; i++) {
      await new Promise((r) => setTimeout(r, 80));
      setProgress(i);
    }

    setStatus('processing');
    for (let i = 40; i <= 75; i++) {
      await new Promise((r) => setTimeout(r, 120));
      setProgress(i);
    }

    setStatus('composing');
    for (let i = 75; i <= 100; i++) {
      await new Promise((r) => setTimeout(r, 100));
      setProgress(i);
    }

    setStatus('ready');
    setPreviewUrl('/demo-video-placeholder');
    onVideoReady?.('/video-url', '/thumb-url');
  };

  const StatusIcon = STATUS_CONFIG[status].icon;

  return (
    <div className="space-y-4">
      {/* Video Type Selector */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { type: 'template' as const, label: 'Modelo', desc: 'Grátis · Zoom & transições', badge: null },
          { type: 'pika' as const, label: 'Pika IA', desc: 'Premium · Clipes realistas', badge: 'PRO' },
          { type: 'runway' as const, label: 'Runway', desc: 'Avançado · Alta qualidade', badge: 'PRO+' },
        ].map((vt) => (
          <button
            key={vt.type}
            onClick={() => setVideoType(vt.type)}
            className={`relative p-3 rounded-2xl border-2 text-left transition-all ${
              videoType === vt.type
                ? 'border-brand-purple bg-brand-purple/5'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            {vt.badge && (
              <span className="absolute -top-2 -right-2 bg-brand-gold text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                {vt.badge}
              </span>
            )}
            <span className="font-display font-semibold text-sm block">{vt.label}</span>
            <span className="text-[10px] text-gray-400">{vt.desc}</span>
          </button>
        ))}
      </div>

      {/* Photo Validation Summary */}
      <div className="bg-gray-50 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Fotos para o vídeo</span>
          <span className={`text-xs font-bold ${validPhotos >= 3 ? 'text-emerald-500' : 'text-gray-400'}`}>
            {validPhotos}/8 enviadas
          </span>
        </div>
        <div className="grid grid-cols-8 gap-1.5">
          {PHOTO_LABELS.map((label, i) => (
            <div key={i} className="text-center">
              <div className={`aspect-square rounded-lg flex items-center justify-center text-[10px] ${
                photos[i]
                  ? 'bg-emerald-100 text-emerald-600'
                  : i < 3
                  ? 'bg-red-50 text-red-400 border border-dashed border-red-200'
                  : 'bg-gray-100 text-gray-300'
              }`}>
                {photos[i] ? '✓' : (i + 1)}
              </div>
              <span className="text-[8px] text-gray-400 mt-0.5 block truncate">{label.split(' ')[0]}</span>
            </div>
          ))}
        </div>
        {validPhotos < 3 && (
          <p className="text-xs text-red-400 mt-2">⚠️ Mínimo de 3 fotos necessárias para gerar o vídeo</p>
        )}
      </div>

      {/* Generation Status */}
      {status !== 'idle' && (
        <div className="bg-gray-50 rounded-2xl p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className={`${STATUS_CONFIG[status].color}`}>
              <StatusIcon className="w-5 h-5 animate-pulse" />
            </div>
            <div className="flex-1">
              <span className={`text-sm font-semibold ${STATUS_CONFIG[status].color}`}>
                {STATUS_CONFIG[status].label}
              </span>
              {productTitle && (
                <span className="block text-xs text-gray-400">{productTitle}</span>
              )}
            </div>
            {status === 'ready' && (
              <span className="text-xs text-emerald-500 font-bold">20s</span>
            )}
          </div>

          {/* Progress bar */}
          {status !== 'ready' && status !== 'failed' && (
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-gradient-brand rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          {/* Error */}
          {status === 'failed' && errorMessage && (
            <div className="bg-red-50 rounded-xl p-3 mt-2">
              <p className="text-xs text-red-600">{errorMessage}</p>
            </div>
          )}

          {/* Preview */}
          {status === 'ready' && (
            <div className="mt-3 relative aspect-[9/16] max-w-[200px] mx-auto rounded-2xl overflow-hidden bg-gray-900">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-white">
                  <Film className="w-8 h-8 mx-auto mb-2 opacity-60" />
                  <span className="text-xs opacity-60">Pré-visualização</span>
                </div>
              </div>
              <div className="absolute bottom-2 left-2 right-2 flex gap-1">
                <button className="flex-1 bg-white/20 backdrop-blur-sm rounded-lg py-1.5 text-white text-xs font-medium flex items-center justify-center gap-1">
                  <Eye className="w-3 h-3" /> Ver
                </button>
                <button className="flex-1 bg-white/20 backdrop-blur-sm rounded-lg py-1.5 text-white text-xs font-medium flex items-center justify-center gap-1">
                  <RefreshCw className="w-3 h-3" /> Refazer
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Generate Button */}
      <button
        onClick={canGenerate ? simulateGeneration : undefined}
        disabled={!canGenerate || (status !== 'idle' && status !== 'ready' && status !== 'failed')}
        className={`w-full py-3.5 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
          canGenerate
            ? 'bg-gradient-brand text-white shadow-lg shadow-brand-purple/20 hover:opacity-90 active:scale-[0.98]'
            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
        }`}
      >
        <Sparkles className="w-4 h-4" />
        {status === 'idle'
          ? `Gerar Vídeo ${videoType === 'template' ? '(Grátis)' : videoType === 'pika' ? '(Pika IA)' : '(Runway)'}`
          : status === 'ready'
          ? 'Gerar Novamente'
          : status === 'failed'
          ? 'Tentar Novamente'
          : 'Gerando...'}
      </button>

      {videoType !== 'template' && (
        <p className="text-xs text-center text-gray-400">
          💎 Vídeos premium consomem créditos do plano PRO
        </p>
      )}
    </div>
  );
}
