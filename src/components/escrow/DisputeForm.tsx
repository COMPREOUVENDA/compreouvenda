'use client';

import { useState } from 'react';
import { AlertTriangle, Upload, Loader2, X } from 'lucide-react';

const DISPUTE_REASONS = [
  { value: 'not_received', label: 'Produto não recebido' },
  { value: 'not_as_described', label: 'Produto diferente do anunciado' },
  { value: 'damaged', label: 'Produto chegou danificado' },
  { value: 'incomplete', label: 'Produto incompleto ou faltando itens' },
  { value: 'fraud', label: 'Suspeita de fraude' },
  { value: 'other', label: 'Outro motivo' },
];

interface Props {
  orderId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function DisputeForm({ orderId, onSuccess, onCancel }: Props) {
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [evidenceUrls, setEvidenceUrls] = useState<string[]>([]);
  const [urlInput, setUrlInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const addEvidenceUrl = () => {
    const url = urlInput.trim();
    if (url && !evidenceUrls.includes(url) && evidenceUrls.length < 5) {
      setEvidenceUrls([...evidenceUrls, url]);
      setUrlInput('');
    }
  };

  const removeUrl = (url: string) => setEvidenceUrls(evidenceUrls.filter((u) => u !== url));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason) { setError('Selecione um motivo'); return; }
    if (description.trim().length < 20) { setError('Descrição muito curta (mínimo 20 caracteres)'); return; }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/escrow/dispute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, reason, description, evidenceUrls }),
      });
      const json = await res.json() as { error?: string };

      if (!res.ok) {
        setError(json.error ?? 'Erro ao abrir disputa');
      } else {
        onSuccess?.();
      }
    } catch {
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Warning banner */}
      <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
        <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
        <div className="text-sm">
          <p className="font-semibold text-amber-400">Abrir uma disputa</p>
          <p className="text-gray-400 mt-0.5">
            O pagamento ficará retido até a resolução. Nossa equipe analisará o caso em até 3 dias úteis.
          </p>
        </div>
      </div>

      {/* Reason */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">Motivo da disputa *</label>
        <select
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="w-full bg-gray-800 border border-gray-600 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#5B2D8E] appearance-none"
          required
        >
          <option value="">Selecione um motivo...</option>
          {DISPUTE_REASONS.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">Descrição detalhada *</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Descreva o problema com detalhes..."
          rows={4}
          maxLength={1000}
          className="w-full bg-gray-800 border border-gray-600 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#5B2D8E] resize-none"
          required
        />
        <p className="text-right text-xs text-gray-500 mt-1">{description.length}/1000</p>
      </div>

      {/* Evidence URLs */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">
          Evidências (links de fotos/vídeos — opcional)
        </label>
        <div className="flex gap-2">
          <input
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addEvidenceUrl(); } }}
            placeholder="https://..."
            className="flex-1 bg-gray-800 border border-gray-600 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#5B2D8E]"
          />
          <button
            type="button"
            onClick={addEvidenceUrl}
            disabled={!urlInput.trim() || evidenceUrls.length >= 5}
            className="px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 text-white rounded-xl transition-colors"
          >
            <Upload className="w-4 h-4" />
          </button>
        </div>
        {evidenceUrls.length > 0 && (
          <div className="mt-2 space-y-1">
            {evidenceUrls.map((url) => (
              <div key={url} className="flex items-center gap-2 bg-gray-800 rounded-lg px-3 py-1.5">
                <span className="flex-1 text-xs text-gray-400 truncate">{url}</span>
                <button type="button" onClick={() => removeUrl(url)}>
                  <X className="w-3.5 h-3.5 text-gray-500 hover:text-red-400" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-400 bg-red-400/10 rounded-lg px-3 py-2">{error}</p>
      )}

      <div className="flex gap-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl text-sm font-semibold transition-colors"
          >
            Cancelar
          </button>
        )}
        <button
          type="submit"
          disabled={loading}
          className="flex-1 py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
          Abrir Disputa
        </button>
      </div>
    </form>
  );
}
