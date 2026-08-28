'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, Eye, EyeOff, RefreshCw } from 'lucide-react'

export default function AdminLoginPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (res.ok) {
        router.push('/admin/disputes')
      } else {
        // Remonte le message renvoyé par l'API : un 429 de limitation de débit
        // doit être distingué d'un simple mot de passe erroné, sans quoi
        // l'utilisateur bloqué croit s'être trompé de saisie.
        const data = await res.json().catch(() => null)
        setError(data?.error ?? 'Mot de passe incorrect')
        setPassword('')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--paper)' }}>
      <div className="w-full max-w-xs">
        <div className="flex flex-col items-center mb-8">
          <div className="h-12 w-12 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'var(--ink)' }}>
            <Lock className="h-5 w-5" style={{ color: 'var(--acid)' }} />
          </div>
          <h1 className="font-display font-bold text-xl tracking-tight" style={{ color: 'var(--ink)' }}>
            Administration
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--concrete-4)' }}>Accès restreint</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="font-mono text-[11px] uppercase tracking-widest" style={{ color: 'var(--concrete-4)' }}>
              Mot de passe
            </label>
            <div className="relative">
              <input
                type={show ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoFocus
                className="w-full rounded-xl border px-4 py-3 pr-11 text-sm outline-none focus:ring-2"
                style={{ borderColor: error ? '#ef4444' : 'rgba(0,0,0,.12)', background: 'var(--snow)', color: 'var(--ink)' }}
                placeholder="••••••••••••"
              />
              <button
                type="button"
                onClick={() => setShow(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer p-1"
                style={{ color: 'var(--concrete-3)' }}
              >
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {error && <p className="text-xs font-semibold" style={{ color: '#ef4444' }}>{error}</p>}
          </div>

          <button
            type="submit"
            disabled={!password || loading}
            className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-40"
            style={{ background: 'var(--ink)', color: 'var(--paper)' }}
          >
            {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
            Accéder
          </button>
        </form>
      </div>
    </div>
  )
}
