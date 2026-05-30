'use client'

import { createClient } from '@/lib/supabase/client'
import { Chrome } from 'lucide-react'

export function SocialLogin() {
  const supabase = createClient()

  async function loginWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    })
    if (error) console.error('Google login error:', error.message)
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-500">ou continue com</span>
        </div>
      </div>
      <button
        onClick={loginWithGoogle}
        className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
      >
        <Chrome size={20} className="text-red-500" />
        <span className="font-medium text-gray-700">Google</span>
      </button>
    </div>
  )
}
