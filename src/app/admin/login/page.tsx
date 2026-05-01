'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Eye, EyeOff, Mail, Lock, ShieldCheck } from 'lucide-react';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Image src="/logo-full.png" alt="compreOUvenda.com" width={280} height={90} className="mx-auto h-20 w-auto object-contain brightness-0 invert mb-4" priority />
          <p className="text-gray-500 text-sm mt-1">Painel Administrativo</p>
        </div>

        <div className="bg-gray-800 rounded-3xl p-8 border border-gray-700">
          <form className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="email"
                placeholder="E-mail administrativo"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3.5 pl-11 rounded-2xl bg-gray-700 border border-gray-600 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-purple/50 focus:border-brand-purple"
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3.5 pl-11 pr-11 rounded-2xl bg-gray-700 border border-gray-600 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-purple/50 focus:border-brand-purple"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <button type="submit" className="w-full bg-brand-purple text-white font-semibold py-3.5 rounded-2xl hover:bg-brand-purple/90 transition-colors">
              Acessar Painel
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
