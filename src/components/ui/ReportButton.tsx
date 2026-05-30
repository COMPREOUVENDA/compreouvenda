'use client'

import { useState } from 'react'
import { Flag, AlertTriangle } from 'lucide-react'

interface ReportButtonProps {
  itemId: string
  itemType: 'product' | 'user' | 'review'
}

const REASONS = [
  'Produto proibido',
  'Conteúdo ofensivo',
  'Fraude/golpe',
  'Informações falsas',
  'Spam',
  'Outro'
]

export function ReportButton({ itemId, itemType }: ReportButtonProps) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [details, setDetails] = useState('')
  const [sent, setSent] = useState(false)

  async function handleReport() {
    if (!reason) return
    // In production, this would send to an API
    console.log('Report:', { itemId, itemType, reason, details })
    setSent(true)
    setTimeout(() => { setOpen(false); setSent(false) }, 2000)
  }

  if (sent) {
    return (
      <div className="text-sm text-green-600 flex items-center gap-1">
        <AlertTriangle size={14} /> Denúncia enviada
      </div>
    )
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition"
      >
        <Flag size={14} /> Denunciar
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-lg">Denunciar</h3>
            <div className="space-y-2">
              {REASONS.map(r => (
                <label key={r} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="reason"
                    value={r}
                    checked={reason === r}
                    onChange={e => setReason(e.target.value)}
                    className="accent-purple-600"
                  />
                  <span className="text-sm">{r}</span>
                </label>
              ))}
            </div>
            <textarea
              placeholder="Detalhes adicionais (opcional)"
              value={details}
              onChange={e => setDetails(e.target.value)}
              className="w-full p-2 border rounded-lg text-sm h-20 resize-none"
            />
            <div className="flex gap-2">
              <button onClick={() => setOpen(false)} className="flex-1 py-2 border rounded-lg text-sm">Cancelar</button>
              <button
                onClick={handleReport}
                disabled={!reason}
                className="flex-1 py-2 bg-red-500 text-white rounded-lg text-sm disabled:opacity-50"
              >
                Enviar Denúncia
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
