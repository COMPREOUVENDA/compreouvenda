import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient, requireAdmin } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  // Esta rota expõe faturamento e volume de usuários — exige privilégio admin.
  const auth = await requireAdmin(req)
  if (auth instanceof NextResponse) return auth

  const supabase = getServiceClient()

  const [users, products, orders, partners, benefits, redemptions, campaigns] = await Promise.all([
    supabase.from('users').select('id, created_at', { count: 'exact' }),
    supabase.from('products').select('id, status, created_at', { count: 'exact' }),
    // `orders` não possui `status`/`total`: o schema real usa `payment_status`
    // e os valores decompostos (bruto, taxa da plataforma, doação).
    supabase
      .from('orders')
      .select('id, payment_status, gross_value, platform_fee, donation_value, created_at', { count: 'exact' }),
    // Clube de Benefícios: visão executiva consolidada no mesmo dashboard.
    supabase.from('partners').select('id, status, created_at'),
    supabase.from('benefits').select('id, status'),
    supabase.from('benefit_redemptions').select('id, status, user_id, purchase_value, is_new_customer, created_at'),
    supabase.from('partner_campaigns').select('id, status, amount_paid')
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

  // ─── Clube de Benefícios ───
  const partnerRows = partners.data ?? []
  const benefitRows = benefits.data ?? []
  const redemptionRows = redemptions.data ?? []
  const campaignRows = campaigns.data ?? []
  const validated = redemptionRows.filter(r => r.status === 'validated')
  const validated30d = validated.filter(r => new Date(r.created_at) > thirtyDaysAgo)

  const club = {
    totalPartners: partnerRows.length,
    activePartners: partnerRows.filter(p => p.status === 'approved').length,
    pendingPartners: partnerRows.filter(p => p.status === 'pending').length,
    newPartners: partnerRows.filter(p => new Date(p.created_at) > thirtyDaysAgo).length,
    publishedBenefits: benefitRows.filter(b => b.status === 'approved').length,
    pendingBenefits: benefitRows.filter(b => b.status === 'pending').length,
    redemptions: validated.length,
    redemptions30d: validated30d.length,
    clubUsers: new Set(validated.map(r => r.user_id).filter(Boolean)).size,
    newCustomers: validated.filter(r => r.is_new_customer).length,
    clubVolume: validated.reduce((sum, r) => sum + Number(r.purchase_value || 0), 0),
    activeCampaigns: campaignRows.filter(c => c.status === 'active').length,
    pendingCampaigns: campaignRows.filter(c => c.status === 'pending').length,
    adRevenue: campaignRows.reduce((sum, c) => sum + Number(c.amount_paid || 0), 0)
  }

  // Pendências que exigem ação do administrador, para atalho no dashboard.
  const pendingActions = [
    { id: 'partners', label: 'Parceiros aguardando análise', count: club.pendingPartners, href: '/admin/partners?status=pending' },
    { id: 'benefits', label: 'Benefícios aguardando aprovação', count: club.pendingBenefits, href: '/admin/benefits?status=pending' },
    { id: 'campaigns', label: 'Campanhas aguardando aprovação', count: club.pendingCampaigns, href: '/admin/campaigns?status=pending' }
  ].filter(a => a.count > 0)

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
      weeklyOrders,
      // Visão consolidada do ecossistema: marketplace + clube.
      ecosystemVolume: gmv + club.clubVolume,
      ecosystemRevenue: totalRevenue + club.adRevenue
    },
    club,
    pendingActions,
    health: {
      database: 'ok',
      api: 'ok',
      storage: 'ok'
    },
    timestamp: now.toISOString()
  })
}
