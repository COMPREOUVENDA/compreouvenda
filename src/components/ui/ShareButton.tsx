'use client'

import { useState } from 'react'
import { Share2, Copy, CheckCircle } from 'lucide-react'

interface ShareButtonProps {
  title: string
  text: string
  url?: string
}

export function ShareButton({ title, text, url }: ShareButtonProps) {
  const [copied, setCopied] = useState(false)
  const shareUrl = url || (typeof window !== 'undefined' ? window.location.href : '')

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url: shareUrl })
      } catch {}
    } else {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <button
      onClick={handleShare}
      className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 bg-gray-100 rounded-full hover:bg-gray-200 transition"
    >
      {copied ? <CheckCircle size={16} className="text-green-500" /> : <Share2 size={16} />}
      {copied ? 'Copiado!' : 'Compartilhar'}
    </button>
  )
}
