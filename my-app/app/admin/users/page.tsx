'use client'

import { useEffect, useState } from 'react'
import { Users, Ban, CheckCircle, MessageSquare, X, RefreshCw } from 'lucide-react'

interface User {
  id: number
  firstName: string
  lastName: string
  email: string
  image: string | null
  createdAt: string
  suspended: boolean
  suspendedReason: string | null
  stripeAccountId: string | null
  _count: { products: number; ordersBuyer: number; ordersSeller: number }
}

interface MessageModal { userId: number; name: string }

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [suspendLoading, setSuspendLoading] = useState<number | null>(null)
  const [messageModal, setMessageModal] = useState<MessageModal | null>(null)
  const [msgSubject, setMsgSubject] = useState('')
  const [msgBody, setMsgBody] = useState('')
  const [msgLoading, setMsgLoading] = useState(false)
  const [msgSent, setMsgSent] = useState(false)

  useEffect(() => {
    fetch('/api/admin/users')
      .then(r => r.ok ? r.json() : [])
      .then(setUsers)
      .finally(() => setLoading(false))
  }, [])

  const filtered = users.filter(u => {
    const q = search.toLowerCase()
    return !q || `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(q)
  })

  const toggleSuspend = async (u: User) => {
    const reason = u.suspended ? '' : prompt('Raison de la suspension (optionnel) :') ?? ''
    setSuspendLoading(u.id)
    try {
      const res = await fetch(`/api/admin/users/${u.id}/suspend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suspend: !u.suspended, reason }),
      })
      if (res.ok) {
        const updated = await res.json()
        setUsers(prev => prev.map(x => x.id === u.id ? { ...x, suspended: updated.suspended, suspendedReason: updated.suspendedReason } : x))
      }
    } finally {
      setSuspendLoading(null)
    }
  }

  const sendMessage = async () => {
    if (!messageModal || !msgSubject || !msgBody) return
    setMsgLoading(true)
    try {
      const res = await fetch(`/api/admin/users/${messageModal.userId}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: msgSubject, body: msgBody }),
      })
      if (res.ok) { setMsgSent(true); setTimeout(() => { setMessageModal(null); setMsgSent(false); setMsgSubject(''); setMsgBody('') }, 1200) }
    } finally {
      setMsgLoading(false)
    }
  }

  return (
    <div className="px-8 py-10">
      <div className="mb-6">
        <h1 className="font-display font-bold text-2xl tracking-tight" style={{ color: 'var(--ink)' }}>Utilisateurs</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--concrete-4)' }}>{users.length} membre{users.length !== 1 ? 's' : ''}</p>
      </div>

      <input type="text" value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Rechercher par nom ou email…"
        className="w-full max-w-sm rounded-xl border px-4 py-2.5 text-sm mb-6 outline-none focus:ring-2"
        style={{ borderColor: 'rgba(0,0,0,.12)', background: 'var(--snow)', color: 'var(--ink)' }}
      />

      {loading ? (
        <div className="space-y-2">{[1,2,3,4,5].map(i => <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: 'var(--paper-2)' }} />)}</div>
      ) : (
        <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'rgba(0,0,0,.06)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'var(--paper-2)', borderBottom: '1px solid rgba(0,0,0,.06)' }}>
                {['Utilisateur', 'Email', 'Annonces', 'Achats', 'Ventes', 'Stripe', 'Inscrit', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--concrete-4)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((u, i) => (
                <tr key={u.id} style={{ background: i % 2 === 0 ? 'var(--snow)' : 'var(--paper)', borderBottom: '1px solid rgba(0,0,0,.04)', opacity: u.suspended ? 0.6 : 1 }}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {u.image
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={u.image} alt="" className="h-7 w-7 rounded-full object-cover flex-shrink-0" />
                        : <div className="h-7 w-7 rounded-full flex-shrink-0 flex items-center justify-center" style={{ background: 'var(--paper-2)' }}><Users className="h-3.5 w-3.5" style={{ color: 'var(--concrete-3)' }} /></div>
                      }
                      <div>
                        <span className="font-semibold" style={{ color: 'var(--ink)' }}>{u.firstName} {u.lastName}</span>
                        {u.suspended && <span className="ml-1.5 text-[10px] font-bold rounded-full px-1.5 py-0.5" style={{ background: '#fee2e2', color: '#991b1b' }}>Suspendu</span>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--concrete-4)' }}>{u.email}</td>
                  <td className="px-4 py-3 font-mono text-center" style={{ color: 'var(--ink)' }}>{u._count.products}</td>
                  <td className="px-4 py-3 font-mono text-center" style={{ color: 'var(--ink)' }}>{u._count.ordersBuyer}</td>
                  <td className="px-4 py-3 font-mono text-center" style={{ color: 'var(--ink)' }}>{u._count.ordersSeller}</td>
                  <td className="px-4 py-3">
                    <span className="text-[11px] font-semibold rounded-full px-2 py-0.5" style={{ background: u.stripeAccountId ? '#d1fae5' : 'var(--paper-2)', color: u.stripeAccountId ? '#065f46' : 'var(--concrete-4)' }}>
                      {u.stripeAccountId ? 'Configuré' : 'Non'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--concrete-3)' }}>
                    {new Date(u.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => { setMessageModal({ userId: u.id, name: `${u.firstName} ${u.lastName}` }); setMsgSubject(''); setMsgBody(''); setMsgSent(false) }}
                        className="h-7 w-7 rounded-lg flex items-center justify-center cursor-pointer hover:bg-blue-50 transition-colors"
                        title="Envoyer un message">
                        <MessageSquare className="h-3.5 w-3.5" style={{ color: '#1e40af' }} />
                      </button>
                      <button onClick={() => toggleSuspend(u)} disabled={suspendLoading === u.id}
                        className="h-7 w-7 rounded-lg flex items-center justify-center cursor-pointer transition-colors disabled:opacity-50"
                        style={{ background: u.suspended ? '#d1fae5' : '#fee2e2' }}
                        title={u.suspended ? 'Lever la suspension' : 'Suspendre'}>
                        {suspendLoading === u.id
                          ? <RefreshCw className="h-3.5 w-3.5 animate-spin" style={{ color: '#6b7280' }} />
                          : u.suspended
                            ? <CheckCircle className="h-3.5 w-3.5" style={{ color: '#065f46' }} />
                            : <Ban className="h-3.5 w-3.5" style={{ color: '#991b1b' }} />
                        }
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-sm" style={{ color: 'var(--concrete-4)' }}>{search ? `Aucun résultat pour « ${search} »` : 'Aucun utilisateur'}</p>
            </div>
          )}
        </div>
      )}

      {/* Message modal */}
      {messageModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 px-4" style={{ background: 'rgba(10,10,10,.55)', backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) setMessageModal(null) }}>
          <div className="w-full max-w-md rounded-2xl p-6 space-y-4" style={{ background: 'var(--snow)' }}>
            <div className="flex items-center justify-between">
              <h2 className="font-display font-bold text-lg" style={{ color: 'var(--ink)' }}>Message à {messageModal.name}</h2>
              <button onClick={() => setMessageModal(null)} className="rounded-lg p-1.5 cursor-pointer hover:bg-black/5"><X className="h-4 w-4" style={{ color: 'var(--concrete-3)' }} /></button>
            </div>

            {msgSent ? (
              <div className="py-6 text-center">
                <CheckCircle className="h-10 w-10 mx-auto mb-2" style={{ color: '#065f46' }} />
                <p className="font-semibold text-sm" style={{ color: 'var(--ink)' }}>Message envoyé</p>
              </div>
            ) : (
              <>
                <div className="space-y-1.5">
                  <label className="font-mono text-[11px] uppercase tracking-widest" style={{ color: 'var(--concrete-4)' }}>Sujet</label>
                  <input type="text" value={msgSubject} onChange={e => setMsgSubject(e.target.value)}
                    placeholder="Objet du message…"
                    className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-2"
                    style={{ borderColor: 'rgba(0,0,0,.12)', background: 'var(--paper)', color: 'var(--ink)' }} />
                </div>
                <div className="space-y-1.5">
                  <label className="font-mono text-[11px] uppercase tracking-widest" style={{ color: 'var(--concrete-4)' }}>Message</label>
                  <textarea value={msgBody} onChange={e => setMsgBody(e.target.value)} rows={4}
                    placeholder="Votre message…"
                    className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-2 resize-none"
                    style={{ borderColor: 'rgba(0,0,0,.12)', background: 'var(--paper)', color: 'var(--ink)' }} />
                </div>
                <div className="flex gap-3 pt-1">
                  <button onClick={() => setMessageModal(null)}
                    className="flex-1 rounded-xl py-3 text-sm font-semibold border cursor-pointer hover:bg-black/5 transition-colors"
                    style={{ borderColor: 'rgba(0,0,0,.12)', color: 'var(--concrete-4)' }}>Annuler</button>
                  <button onClick={sendMessage} disabled={!msgSubject || !msgBody || msgLoading}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-40"
                    style={{ background: 'var(--ink)', color: 'var(--paper)' }}>
                    {msgLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
                    Envoyer
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
