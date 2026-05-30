'use client'

import { useState, useRef, useEffect } from 'react'
import { Bot, Send, X, MessageCircle } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export function Chatbot() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Olá! 👋 Sou o assistente do CompreOuVenda. Como posso ajudar?' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight
    }
  }, [messages])

  async function sendMessage() {
    if (!input.trim() || loading) return
    const userMsg = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setLoading(true)

    try {
      const res = await fetch('/api/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg, history: messages.slice(-6) })
      })
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply || 'Desculpe, não consegui processar sua pergunta.' }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Ops! Erro de conexão. Tente novamente.' }])
    }
    setLoading(false)
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-4 z-50 w-14 h-14 bg-purple-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-purple-700 transition-transform hover:scale-110"
        aria-label="Abrir chat assistente"
      >
        <MessageCircle size={24} />
      </button>
    )
  }

  return (
    <div className="fixed bottom-20 right-4 z-50 w-80 h-[28rem] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border">
      {/* Header */}
      <div className="bg-purple-600 text-white p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot size={20} />
          <span className="font-medium text-sm">Assistente IA</span>
        </div>
        <button onClick={() => setOpen(false)} className="hover:bg-purple-700 rounded p-1">
          <X size={18} />
        </button>
      </div>

      {/* Messages */}
      <div ref={messagesRef} className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm ${
              msg.role === 'user' 
                ? 'bg-purple-600 text-white rounded-br-md' 
                : 'bg-gray-100 text-gray-800 rounded-bl-md'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 px-4 py-2 rounded-2xl rounded-bl-md">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay:'0ms'}} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay:'150ms'}} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay:'300ms'}} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder="Digite sua dúvida..."
            className="flex-1 px-3 py-2 border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            className="w-9 h-9 bg-purple-600 text-white rounded-full flex items-center justify-center disabled:opacity-50"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
