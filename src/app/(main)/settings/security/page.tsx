'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Shield, Smartphone, Key, CheckCircle, AlertTriangle } from 'lucide-react'

export default function SecurityPage() {
  const supabase = createClient()
  const [user, setUser] = useState<any>(null)
  const [twoFAEnabled, setTwoFAEnabled] = useState(false)
  const [setupMode, setSetupMode] = useState(false)
  const [qrCode, setQrCode] = useState('')
  const [secret, setSecret] = useState('')
  const [verifyCode, setVerifyCode] = useState('')
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' })

  useEffect(() => {
    loadUser()
  }, [])

  async function loadUser() {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setUser(user)
      const { data } = await supabase
        .from('user_2fa')
        .select('enabled')
        .eq('user_id', user.id)
        .single()
      if (data) setTwoFAEnabled(data.enabled)
    }
  }

  async function setup2FA() {
    setLoading(true)
    try {
      const res = await fetch('/api/auth/2fa/setup', { method: 'POST' })
      const data = await res.json()
      if (data.qrCode) {
        setQrCode(data.qrCode)
        setSecret(data.secret)
        setSetupMode(true)
      }
    } catch (e) {
      setMessage('Erro ao configurar 2FA')
    }
    setLoading(false)
  }

  async function verify2FA() {
    setLoading(true)
    try {
      const res = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: verifyCode, secret })
      })
      const data = await res.json()
      if (data.success) {
        setTwoFAEnabled(true)
        setBackupCodes(data.backupCodes || [])
        setSetupMode(false)
        setMessage('2FA ativado com sucesso!')
      } else {
        setMessage('Código inválido. Tente novamente.')
      }
    } catch (e) {
      setMessage('Erro ao verificar código')
    }
    setLoading(false)
  }

  async function disable2FA() {
    if (!confirm('Tem certeza que deseja desativar a autenticação em dois fatores?')) return
    setLoading(true)
    try {
      const res = await fetch('/api/auth/2fa/disable', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        setTwoFAEnabled(false)
        setMessage('2FA desativado')
      }
    } catch (e) {
      setMessage('Erro ao desativar 2FA')
    }
    setLoading(false)
  }

  async function changePassword() {
    if (passwordForm.new !== passwordForm.confirm) {
      setMessage('As senhas não coincidem')
      return
    }
    if (passwordForm.new.length < 6) {
      setMessage('A senha deve ter pelo menos 6 caracteres')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password: passwordForm.new })
    if (error) {
      setMessage('Erro: ' + error.message)
    } else {
      setMessage('Senha alterada com sucesso!')
      setPasswordForm({ current: '', new: '', confirm: '' })
    }
    setLoading(false)
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Shield className="text-purple-600" /> Segurança
      </h1>

      {message && (
        <div className="p-3 rounded-lg bg-blue-50 text-blue-800 text-sm">
          {message}
        </div>
      )}

      {/* 2FA Section */}
      <div className="bg-white rounded-xl shadow p-6 space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Smartphone size={20} /> Autenticação em Dois Fatores (2FA)
        </h2>
        
        {twoFAEnabled ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle size={20} />
              <span className="font-medium">2FA está ativado</span>
            </div>
            <p className="text-sm text-gray-600">
              Sua conta está protegida com autenticação em dois fatores.
            </p>
            <button
              onClick={disable2FA}
              disabled={loading}
              className="px-4 py-2 text-sm text-red-600 border border-red-300 rounded-lg hover:bg-red-50"
            >
              Desativar 2FA
            </button>
          </div>
        ) : setupMode ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Escaneie o QR Code abaixo com seu app autenticador (Google Authenticator, Authy, etc.)
            </p>
            {qrCode && (
              <div className="flex justify-center">
                <img src={qrCode} alt="QR Code 2FA" className="w-48 h-48" />
              </div>
            )}
            <div className="text-xs text-gray-500 break-all">
              <strong>Chave manual:</strong> {secret}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Código de verificação</label>
              <input
                type="text"
                value={verifyCode}
                onChange={e => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="w-full p-3 border rounded-lg text-center text-2xl tracking-widest"
                maxLength={6}
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={verify2FA}
                disabled={loading || verifyCode.length !== 6}
                className="flex-1 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                Verificar e Ativar
              </button>
              <button
                onClick={() => setSetupMode(false)}
                className="px-4 py-2 border rounded-lg"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-amber-600">
              <AlertTriangle size={20} />
              <span className="text-sm">2FA não está ativado</span>
            </div>
            <p className="text-sm text-gray-600">
              Adicione uma camada extra de segurança à sua conta usando um app autenticador.
            </p>
            <button
              onClick={setup2FA}
              disabled={loading}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              Configurar 2FA
            </button>
          </div>
        )}

        {backupCodes.length > 0 && (
          <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <h3 className="font-medium text-amber-800 mb-2">⚠️ Códigos de Backup</h3>
            <p className="text-xs text-amber-700 mb-2">
              Guarde estes códigos em um local seguro. Cada um pode ser usado uma vez caso perca acesso ao app.
            </p>
            <div className="grid grid-cols-2 gap-1">
              {backupCodes.map((code, i) => (
                <code key={i} className="text-sm bg-white p-1 rounded text-center">{code}</code>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Change Password */}
      <div className="bg-white rounded-xl shadow p-6 space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Key size={20} /> Alterar Senha
        </h2>
        <div className="space-y-3">
          <input
            type="password"
            placeholder="Nova senha"
            value={passwordForm.new}
            onChange={e => setPasswordForm(p => ({ ...p, new: e.target.value }))}
            className="w-full p-3 border rounded-lg"
          />
          <input
            type="password"
            placeholder="Confirmar nova senha"
            value={passwordForm.confirm}
            onChange={e => setPasswordForm(p => ({ ...p, confirm: e.target.value }))}
            className="w-full p-3 border rounded-lg"
          />
          <button
            onClick={changePassword}
            disabled={loading || !passwordForm.new}
            className="w-full py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
          >
            Alterar Senha
          </button>
        </div>
      </div>
    </div>
  )
}
