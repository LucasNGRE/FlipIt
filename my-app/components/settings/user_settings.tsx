"use client"

import React, { useState, useEffect } from 'react'
import { User, ShoppingBag, CreditCard, Shield, Check, AlertCircle, Pencil, Trash2 } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type Section = 'Profil' | 'Annonces' | 'Transactions' | 'Sécurité'

const navItems: { id: Section; label: string; icon: React.ElementType }[] = [
  { id: 'Profil',       label: 'Profil',        icon: User },
  { id: 'Annonces',     label: 'Mes annonces',  icon: ShoppingBag },
  { id: 'Transactions', label: 'Transactions',  icon: CreditCard },
  { id: 'Sécurité',    label: 'Sécurité',      icon: Shield },
]

type Feedback = { type: 'success' | 'error'; message: string } | null

export default function Setting() {
  const [activeSection, setActiveSection] = useState<Section>('Profil')
  const [userData, setUserData] = useState({ firstName: '', lastName: '', email: '', bio: '' })
  const [products, setProducts] = useState<any[]>([])
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<Feedback>(null)

  useEffect(() => {
    fetch('/api/user')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.[0]) setUserData(data[0]) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (activeSection !== 'Annonces') return
    setLoadingProducts(true)
    fetch('/api/products/user')
      .then(r => r.ok ? r.json() : [])
      .then(setProducts)
      .catch(() => setProducts([]))
      .finally(() => setLoadingProducts(false))
  }, [activeSection])

  const showFeedback = (fb: Feedback) => {
    setFeedback(fb)
    setTimeout(() => setFeedback(null), 3500)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/user', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      })
      if (!res.ok) throw new Error()
      const updated = await res.json()
      setUserData(updated)
      showFeedback({ type: 'success', message: 'Profil mis à jour avec succès.' })
    } catch {
      showFeedback({ type: 'error', message: 'Erreur lors de la mise à jour.' })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (productId: number) => {
    try {
      const res = await fetch(`/api/items/${productId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setProducts(prev => prev.filter(p => p.id !== productId))
    } catch {
      showFeedback({ type: 'error', message: 'Impossible de supprimer cette annonce.' })
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="font-display text-3xl font-bold tracking-tight mb-8">Paramètres</h1>

      <div className="grid gap-8 md:grid-cols-[220px_1fr]">

        {/* Sidebar */}
        <nav className="flex flex-row md:flex-col gap-1 overflow-x-auto pb-2 md:pb-0">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveSection(id)}
              className={`flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors duration-150 whitespace-nowrap cursor-pointer text-left w-full ${
                activeSection === id
                  ? 'bg-brand text-white'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {label}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="min-w-0">

          {/* Feedback banner */}
          {feedback && (
            <div className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm mb-6 ${
              feedback.type === 'success'
                ? 'bg-brand-50 border border-brand-100 text-brand dark:bg-brand-800/20 dark:border-brand-800/40'
                : 'bg-red-50 border border-red-100 text-red-700 dark:bg-red-900/20 dark:border-red-900/40'
            }`}>
              {feedback.type === 'success'
                ? <Check className="h-4 w-4 flex-shrink-0" />
                : <AlertCircle className="h-4 w-4 flex-shrink-0" />
              }
              {feedback.message}
            </div>
          )}

          {/* ── Profil ── */}
          {activeSection === 'Profil' && (
            <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
              <h2 className="font-display text-xl font-semibold mb-1">Informations personnelles</h2>
              <p className="text-sm text-muted-foreground mb-6">Modifie ton prénom et ton nom de famille.</p>

              <form onSubmit={handleSave} className="space-y-4 max-w-md">
                <div className="space-y-1.5">
                  <Label htmlFor="firstName">Prénom</Label>
                  <Input
                    id="firstName"
                    name="firstName"
                    value={userData.firstName}
                    onChange={e => setUserData({ ...userData, firstName: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lastName">Nom</Label>
                  <Input
                    id="lastName"
                    name="lastName"
                    value={userData.lastName}
                    onChange={e => setUserData({ ...userData, lastName: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="bio">Description</Label>
                  <textarea
                    id="bio"
                    value={userData.bio ?? ''}
                    onChange={e => setUserData({ ...userData, bio: e.target.value })}
                    placeholder="Dis quelques mots sur toi, ton style, ce que tu vends…"
                    maxLength={300}
                    rows={4}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                  />
                  <p className="text-xs text-muted-foreground text-right">{(userData.bio ?? '').length}/300</p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Adresse e-mail</Label>
                  <Input
                    id="email"
                    value={userData.email}
                    disabled
                    className="opacity-60 cursor-not-allowed"
                  />
                  <p className="text-xs text-muted-foreground">L'e-mail ne peut pas être modifié.</p>
                </div>
                <Button
                  type="submit"
                  disabled={saving}
                  className="bg-brand hover:bg-brand-700 text-white cursor-pointer"
                >
                  {saving ? 'Enregistrement…' : 'Enregistrer'}
                </Button>
              </form>
            </div>
          )}

          {/* ── Annonces ── */}
          {activeSection === 'Annonces' && (
            <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
              <h2 className="font-display text-xl font-semibold mb-1">Mes annonces</h2>
              <p className="text-sm text-muted-foreground mb-6">Gérer tes articles en vente.</p>

              {loadingProducts ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="rounded-xl bg-muted animate-pulse h-24" />
                  ))}
                </div>
              ) : products.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  Aucune annonce pour le moment.
                </div>
              ) : (
                <div className="space-y-3">
                  {products.map(product => (
                    <div key={product.id} className="flex items-center gap-4 rounded-xl border border-border p-3">
                      {product.images?.[0]?.url && (
                        <img
                          src={product.images[0].url}
                          alt={product.images[0].altText || product.title}
                          className="h-14 w-14 rounded-lg object-cover flex-shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{product.title}</p>
                        <p className="text-sm text-muted-foreground">{Number(product.price).toFixed(0)} €</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => window.location.href = `/edit-product/${product.id}`}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border hover:bg-muted transition-colors cursor-pointer"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Transactions ── */}
          {activeSection === 'Transactions' && (
            <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
              <h2 className="font-display text-xl font-semibold mb-1">Transactions</h2>
              <p className="text-sm text-muted-foreground mb-6">Historique de tes achats et ventes.</p>
              <div className="text-center py-12 text-muted-foreground text-sm">
                Aucune transaction pour le moment.
              </div>
            </div>
          )}

          {/* ── Sécurité ── */}
          {activeSection === 'Sécurité' && (
            <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
              <h2 className="font-display text-xl font-semibold mb-1">Sécurité</h2>
              <p className="text-sm text-muted-foreground mb-6">Gère la sécurité de ton compte.</p>
              <div className="text-center py-12 text-muted-foreground text-sm">
                Bientôt disponible.
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
