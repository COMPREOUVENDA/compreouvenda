'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TrendingUp, Package, Users, DollarSign, Eye, ShoppingCart, MessageCircle, Star } from 'lucide-react'

interface Stats {
  totalUsers: number
  totalProducts: number
  totalOrders: number
  totalRevenue: number
  activeChats: number
  avgRating: number
  todayViews: number
  conversionRate: number
}

export function AdminAnalytics() {
  const supabase = createClient()
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

  async function loadStats() {
    const [users, products, orders, reviews] = await Promise.all([
      supabase.from('users').select('id', { count: 'exact', head: true }),
      supabase.from('products').select('id', { count: 'exact', head: true }),
      supabase.from('orders').select('id, total', { count: 'exact' }),
      supabase.from('reviews').select('rating')
    ])

    const totalRevenue = orders.data?.reduce((sum, o) => sum + (o.total || 0), 0) || 0
    const avgRating = reviews.data?.length 
      ? reviews.data.reduce((sum, r) => sum + r.rating, 0) / reviews.data.length 
      : 0

    setStats({
      totalUsers: users.count || 0,
      totalProducts: products.count || 0,
      totalOrders: orders.count || 0,
      totalRevenue,
      activeChats: 0,
      avgRating: Math.round(avgRating * 10) / 10,
      todayViews: 0,
      conversionRate: orders.count && products.count ? Math.round((orders.count / products.count) * 100) : 0
    })
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1,2,3,4,5,6,7,8].map(i => (
          <div key={i} className="bg-white rounded-xl p-4 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
            <div className="h-6 bg-gray-200 rounded w-2/3" />
          </div>
        ))}
      </div>
    )
  }

  const cards = [
    { icon: Users, label: 'Usuários', value: stats?.totalUsers || 0, color: 'text-blue-500', bg: 'bg-blue-50' },
    { icon: Package, label: 'Produtos', value: stats?.totalProducts || 0, color: 'text-purple-500', bg: 'bg-purple-50' },
    { icon: ShoppingCart, label: 'Pedidos', value: stats?.totalOrders || 0, color: 'text-green-500', bg: 'bg-green-50' },
    { icon: DollarSign, label: 'Receita', value: `R$ ${(stats?.totalRevenue || 0).toLocaleString('pt-BR')}`, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { icon: Star, label: 'Avaliação Média', value: stats?.avgRating || '-', color: 'text-amber-500', bg: 'bg-amber-50' },
    { icon: TrendingUp, label: 'Conversão', value: `${stats?.conversionRate || 0}%`, color: 'text-pink-500', bg: 'bg-pink-50' },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {cards.map((card, i) => (
        <div key={i} className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-8 h-8 ${card.bg} rounded-lg flex items-center justify-center`}>
              <card.icon size={16} className={card.color} />
            </div>
            <span className="text-xs text-gray-500">{card.label}</span>
          </div>
          <p className="text-xl font-bold text-gray-800">{card.value}</p>
        </div>
      ))}
    </div>
  )
}
