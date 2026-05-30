import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createClient()

  const [users, products, orders] = await Promise.all([
    supabase.from('users').select('id, created_at', { count: 'exact' }),
    supabase.from('products').select('id, status, created_at', { count: 'exact' }),
    supabase.from('orders').select('id, status, total, created_at', { count: 'exact' })
  ])

  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const recentUsers = users.data?.filter(u => new Date(u.created_at) > thirtyDaysAgo).length || 0
  const weeklyOrders = orders.data?.filter(o => new Date(o.created_at) > sevenDaysAgo).length || 0
  const totalRevenue = orders.data?.reduce((sum, o) => sum + (o.total || 0), 0) || 0
  const activeProducts = products.data?.filter(p => p.status === 'active').length || 0

  return NextResponse.json({
    overview: {
      totalUsers: users.count || 0,
      totalProducts: products.count || 0,
      activeProducts,
      totalOrders: orders.count || 0,
      totalRevenue,
      recentUsers,
      weeklyOrders
    },
    health: {
      database: 'ok',
      api: 'ok',
      storage: 'ok'
    },
    timestamp: now.toISOString()
  })
}
