import { useState } from 'react';
import { CheckCircle, XCircle, FileText, Loader2, AlertTriangle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface DocumentViewerProps {
  userId: string;
  frontUrl?: string;
  backUrl?: string;
  selfieUrl?: string;
  onDocumentApproved?: () => void;
}

export function DocumentViewer({
  userId,
  frontUrl,
  backUrl,
  selfieUrl,
  onDocumentApproved,
}: DocumentViewerProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const updateKyc = async (status: 'approved' | 'rejected') => {
    setLoading(status);
    setMsg(null);
    try {
      const supabase = createClient();
      await supabase
        .from('users')
        .update({
          kyc_status: status,
          ...(status === 'approved' ? { verified_at: new Date().toISOString() } : {}),
        })
        .eq('id', userId);
      setMsg({
        text: status === 'approved' ? 'Documento aprovado' : 'Documento reprovado',
        type: status === 'approved' ? 'success' : 'error',
      });
      if (status === 'approved') onDocumentApproved?.();
    } catch {
      setMsg({ text: 'Erro ao atualizar documento', type: 'error' });
    } finally {
      setLoading(null);
    }
  };

  const docs = [
    { key: 'front', label: 'Documento (Frente)', url: frontUrl },
    { key: 'back', label: 'Documento (Verso)', url: backUrl },
    { key: 'selfie', label: 'Selfie', url: selfieUrl },
  ].filter((d) => d.url);

  if (docs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-8 text-gray-500">
        <FileText className="w-10 h-10 opacity-40" />
        <p className="text-sm">Nenhum documento enviado</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {docs.map((doc) => (
          <div key={doc.key} className="space-y-1.5">
            <p className="text-xs font-semibold text-gray-400">{doc.label}</p>
            <div className="bg-gray-700 rounded-xl overflow-hidden border border-gray-600 aspect-video flex items-center justify-center">
              {doc.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={doc.url}
                  alt={doc.label}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <AlertTriangle className="w-6 h-6 text-gray-500" />
              )}
            </div>
          </div>
        ))}
      </div>

      {msg && (
        <p className={`text-xs rounded-lg px-3 py-2 ${msg.type === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
          {msg.text}
        </p>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => updateKyc('approved')}
          disabled={!!loading}
          className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-xl transition-colors disabled:opacity-50"
        >
          {loading === 'approved' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
          Aprovar Documentos
        </button>
        <button
          onClick={() => updateKyc('rejected')}
          disabled={!!loading}
          className="flex items-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-xl transition-colors disabled:opacity-50"
        >
          {loading === 'rejected' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
          Reprovar Documentos
        </button>
      </div>
    </div>
  );
}
