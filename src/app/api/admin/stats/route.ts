import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient, requireAdmin } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  // Esta rota expõe faturamento e volume de usuários — exige privilégio admin.
  const auth = await requireAdmin(req)
  if (auth instanceof NextResponse) return auth

  const supabase = getServiceClient()

  const [users, products, orders] = await Promise.all([
    supabase.from('users').select('id, created_at', { count: 'exact' }),
    supabase.from('products').select('id, status, created_at', { count: 'exact' }),
    // `orders` não possui `status`/`total`: o schema real usa `payment_status`
    // e os valores decompostos (bruto, taxa da plataforma, doação).
    supabase
      .from('orders')
      .select('id, payment_status, gross_value, platform_fee, donation_value, created_at', { count: 'exact' })
  ])

  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const PAID = ['paid', 'held', 'released']
  const paidOrders = orders.data?.filter(o => PAID.includes(o.payment_status)) ?? []

  const recentUsers = users.data?.filter(u => new Date(u.created_at) > thirtyDaysAgo).length || 0
  const weeklyOrders = orders.data?.filter(o => new Date(o.created_at) > sevenDaysAgo).length || 0
  // GMV = volume transacionado; revenue = o que a plataforma efetivamente retém.
  const gmv = paidOrders.reduce((sum, o) => sum + Number(o.gross_value || 0), 0)
  const totalRevenue = paidOrders.reduce((sum, o) => sum + Number(o.platform_fee || 0), 0)
  const totalDonated = paidOrders.reduce((sum, o) => sum + Number(o.donation_value || 0), 0)
  const activeProducts = products.data?.filter(p => p.status === 'active').length || 0

  return NextResponse.json({
    overview: {
      totalUsers: users.count || 0,
      totalProducts: products.count || 0,
      activeProducts,
      totalOrders: orders.count || 0,
      paidOrders: paidOrders.length,
      gmv,
      totalRevenue,
      totalDonated,
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
