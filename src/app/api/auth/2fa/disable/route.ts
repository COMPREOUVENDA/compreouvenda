import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { error } = await supabase.from('user_2fa').update({
    enabled: false
  }).eq('user_id', user.id)

  if (error) {
    return NextResponse.json({ success: false, error: error.message })
  }

  return NextResponse.json({ success: true })
}
