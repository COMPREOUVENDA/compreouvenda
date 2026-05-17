import { useState } from 'react';
import { CheckCircle, XCircle, Download, Loader2 } from 'lucide-react';
import { X } from 'lucide-react';

interface BulkActionsProps {
  selectedCount: number;
  onApprove: (justification: string) => Promise<void>;
  onReject: (reason: string) => Promise<void>;
  onExport: () => void;
  onClearSelection: () => void;
}

export function BulkActions({
  selectedCount,
  onApprove,
  onReject,
  onExport,
  onClearSelection,
}: BulkActionsProps) {
  const [modal, setModal] = useState<'approve' | 'reject' | null>(null);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (selectedCount === 0) return null;

  const handleConfirm = async () => {
    if (!text.trim()) {
      setError(modal === 'reject' ? 'Motivo obrigatório' : 'Justificativa obrigatória');
      return;
    }
    setLoading(true);
    setError('');
    try {
      if (modal === 'approve') await onApprove(text);
      else if (modal === 'reject') await onReject(text);
      setModal(null);
      setText('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro na operação');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2 bg-gray-700/80 border border-brand-purple/30 rounded-2xl px-4 py-2">
        <span className="text-sm font-medium text-white">
          <span className="text-brand-purple font-bold">{selectedCount}</span> selecionado{selectedCount !== 1 ? 's' : ''}
        </span>
        <div className="w-px h-4 bg-gray-600" />
        <button
          onClick={() => { setModal('approve'); setText(''); setError(''); }}
          className="flex items-center gap-1.5 text-xs font-medium text-emerald-400 hover:text-emerald-300 px-2 py-1 rounded-lg hover:bg-emerald-500/10 transition-colors"
        >
          <CheckCircle className="w-3.5 h-3.5" />
          Aprovar
        </button>
        <button
          onClick={() => { setModal('reject'); setText(''); setError(''); }}
          className="flex items-center gap-1.5 text-xs font-medium text-red-400 hover:text-red-300 px-2 py-1 rounded-lg hover:bg-red-500/10 transition-colors"
        >
          <XCircle className="w-3.5 h-3.5" />
          Reprovar
        </button>
        <button
          onClick={onExport}
          className="flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-white px-2 py-1 rounded-lg hover:bg-gray-600 transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          Exportar
        </button>
        <button
          onClick={onClearSelection}
          className="p-1 text-gray-500 hover:text-white rounded-lg hover:bg-gray-600 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Confirmation Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm border border-gray-700">
            <div className="flex items-center justify-between p-5 border-b border-gray-700">
              <h2 className="font-bold text-white text-sm">
                {modal === 'approve'
                  ? `Aprovar ${selectedCount} usuário${selectedCount !== 1 ? 's' : ''}`
                  : `Reprovar ${selectedCount} usuário${selectedCount !== 1 ? 's' : ''}`}
              </h2>
              <button onClick={() => setModal(null)} className="p-1 hover:bg-gray-700 rounded-lg">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <label className="text-xs text-gray-400 font-semibold block">
                {modal === 'approve' ? 'Justificativa' : 'Motivo'}{' '}
                <span className="text-red-400">*</span>
              </label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={3}
                placeholder={modal === 'approve' ? 'Justificativa para aprovação...' : 'Motivo da reprovação...'}
                className="w-full bg-gray-700 border border-gray-600 rounded-xl px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-purple/50 resize-none"
              />
              {error && (
                <p className="text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{error}</p>
              )}
            </div>
            <div className="flex gap-3 p-5 border-t border-gray-700">
              <button
                onClick={() => setModal(null)}
                className="flex-1 px-4 py-2.5 bg-gray-700 text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-600 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirm}
                disabled={!text.trim() || loading}
                className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 ${
                  modal === 'approve'
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-red-600 hover:bg-red-700 text-white'
                }`}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : modal === 'approve' ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <XCircle className="w-4 h-4" />
                )}
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
