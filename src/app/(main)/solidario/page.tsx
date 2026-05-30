'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Heart, TrendingUp, Award, Users } from 'lucide-react'
import Link from 'next/link'

interface Charity {
  id: string
  name: string
  description: string
  logo_url: string
  category: string
  total_received: number
  supporters: number
}

export default function SolidarioPage() {
  const supabase = createClient()
  const [charities, setCharities] = useState<Charity[]>([])
  const [stats, setStats] = useState({ totalDonated: 0, totalCharities: 0, totalDonors: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const { data } = await supabase
      .from('charities')
      .select('*')
      .eq('active', true)
      .order('total_received', { ascending: false })

    if (data) {
      setCharities(data)
      setStats({
        totalDonated: data.reduce((sum, c) => sum + (c.total_received || 0), 0),
        totalCharities: data.length,
        totalDonors: data.reduce((sum, c) => sum + (c.supporters || 0), 0)
      })
    }
    setLoading(false)
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* Hero */}
      <div className="bg-gradient-to-br from-pink-500 to-purple-600 rounded-2xl p-6 text-white text-center">
        <Heart className="mx-auto mb-3" size={48} fill="white" />
        <h1 className="text-2xl font-bold">Módulo Solidário</h1>
        <p className="mt-2 opacity-90">
          A cada venda, parte do valor é destinada a instituições beneficentes. 
          Compre e venda com propósito!
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl shadow p-4 text-center">
          <TrendingUp className="mx-auto text-green-500 mb-1" size={24} />
          <p className="text-lg font-bold text-green-600">
            R$ {stats.totalDonated.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-gray-500">Total doado</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4 text-center">
          <Award className="mx-auto text-purple-500 mb-1" size={24} />
          <p className="text-lg font-bold text-purple-600">{stats.totalCharities}</p>
          <p className="text-xs text-gray-500">Instituições</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4 text-center">
          <Users className="mx-auto text-blue-500 mb-1" size={24} />
          <p className="text-lg font-bold text-blue-600">{stats.totalDonors}</p>
          <p className="text-xs text-gray-500">Apoiadores</p>
        </div>
      </div>

      {/* How it works */}
      <div className="bg-white rounded-xl shadow p-5">
        <h2 className="font-semibold text-lg mb-3">Como funciona</h2>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <span className="w-7 h-7 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">1</span>
            <p className="text-sm text-gray-700">Ao criar um anúncio, o vendedor pode ativar a opção solidária e escolher uma instituição.</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="w-7 h-7 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">2</span>
            <p className="text-sm text-gray-700">Quando o produto é vendido, 2% do valor é automaticamente destinado à instituição escolhida.</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="w-7 h-7 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">3</span>
            <p className="text-sm text-gray-700">As doações são transparentes e rastreáveis. Todos podem ver o impacto gerado.</p>
          </div>
        </div>
      </div>

      {/* Charities list */}
      <div>
        <h2 className="font-semibold text-lg mb-3">Instituições Parceiras</h2>
        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="bg-white rounded-xl shadow p-4 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gray-200 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-1/3" />
                    <div className="h-3 bg-gray-200 rounded w-2/3" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : charities.length > 0 ? (
          <div className="space-y-3">
            {charities.map(charity => (
              <div key={charity.id} className="bg-white rounded-xl shadow p-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center">
                    <Heart size={20} className="text-pink-500" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium">{charity.name}</h3>
                    <p className="text-xs text-gray-500">{charity.category}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-green-600">
                      R$ {(charity.total_received || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-gray-400">{charity.supporters || 0} apoiadores</p>
                  </div>
                </div>
                {charity.description && (
                  <p className="text-sm text-gray-600 mt-2">{charity.description}</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow p-8 text-center">
            <Heart size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">Instituições parceiras serão adicionadas em breve!</p>
            <p className="text-sm text-gray-400 mt-1">Quer cadastrar sua instituição? Entre em contato.</p>
          </div>
        )}
      </div>

      {/* CTA */}
      <div className="bg-gradient-to-r from-orange-400 to-pink-500 rounded-xl p-5 text-center text-white">
        <h3 className="font-bold text-lg">Venda com propósito!</h3>
        <p className="text-sm opacity-90 mt-1">Ative o módulo solidário no seu próximo anúncio</p>
        <Link
          href="/product/new"
          className="inline-block mt-3 px-6 py-2 bg-white text-pink-600 font-semibold rounded-full hover:shadow-lg transition"
        >
          Anunciar Agora
        </Link>
      </div>
    </div>
  )
}
