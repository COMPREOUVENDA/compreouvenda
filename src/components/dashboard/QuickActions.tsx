'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Package, Clock, CheckCircle, TrendingUp, Star, Wallet, Bell } from 'lucide-react'
import Link from 'next/link'

export function QuickActions() {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Link href="/product/new" className="flex items-center gap-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white p-4 rounded-xl shadow-md hover:shadow-lg transition">
        <Package size={24} />
        <div>
          <p className="font-semibold text-sm">Novo Anúncio</p>
          <p className="text-xs opacity-80">Vender produto</p>
        </div>
      </Link>
      <Link href="/orders" className="flex items-center gap-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 rounded-xl shadow-md hover:shadow-lg transition">
        <Clock size={24} />
        <div>
          <p className="font-semibold text-sm">Meus Pedidos</p>
          <p className="text-xs opacity-80">Acompanhar</p>
        </div>
      </Link>
      <Link href="/wallet" className="flex items-center gap-3 bg-gradient-to-r from-green-500 to-green-600 text-white p-4 rounded-xl shadow-md hover:shadow-lg transition">
        <Wallet size={24} />
        <div>
          <p className="font-semibold text-sm">Carteira</p>
          <p className="text-xs opacity-80">Saldo e saques</p>
        </div>
      </Link>
      <Link href="/settings/security" className="flex items-center gap-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white p-4 rounded-xl shadow-md hover:shadow-lg transition">
        <Bell size={24} />
        <div>
          <p className="font-semibold text-sm">Segurança</p>
          <p className="text-xs opacity-80">2FA e senha</p>
        </div>
      </Link>
    </div>
  )
}
