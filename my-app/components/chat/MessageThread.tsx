'use client'

import { useEffect, useRef, useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Send, ArrowLeft, ExternalLink, Tag, Check, X, ShoppingBag } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type MsgUser = { id: number; firstName: string; lastName: string; image: string | null }
type MsgProduct = { id: number; title: string; images: { url: string }[]; userId?: number }

type Message = {
  id: number
  content: string
  createdAt: string
  user: MsgUser
  product: MsgProduct | null
}

type Participant = { id: number; firstName: string; lastName: string; image: string | null }

type ConversationDetail = {
  id: number
  productId: number | null
  participants: Participant[]
  messages: Message[]
}

interface Props {
  conversationId: number
  currentUserId: number
  initialProductId?: number
  onBack?: () => void
}

function formatTime(date: string) {
  return new Date(date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function formatDateLabel(date: string) {
  const d = new Date(date)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return "Aujourd'hui"
  if (d.toDateString() === yesterday.toDateString()) return 'Hier'
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
}

function isSameDay(a: string, b: string) {
  return new Date(a).toDateString() === new Date(b).toDateString()
}

function isSameGroup(a: Message, b: Message) {
  if (a.user.id !== b.user.id) return false
  return Math.abs(new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) < 5 * 60 * 1000
}

// ── Offer card ───────────────────────────────────────────────────────────────
function OfferCard({
  offerId, price, isMe, isSeller, fromSeller, productId,
}: {
  offerId: number
  price: number
  isMe: boolean
  isSeller: boolean
  fromSeller: boolean
  productId: number | null
}) {
  const [status, setStatus] = useState<'pending' | 'accepted' | 'rejected' | null>(null)
  const [loading, setLoading] = useState(true)
  const [responding, setResponding] = useState(false)
  const [respondError, setRespondError] = useState('')
  const [expiresAt, setExpiresAt] = useState<Date | null>(null)
  const [timeLeft, setTimeLeft] = useState<string | null>(null)

  // Qui voit les boutons Accept/Décline ? L'autre partie (pas l'émetteur)
  const canRespond = fromSeller ? !isSeller : isSeller
  // Le bouton payer s'affiche à l'acheteur quand l'offre est acceptée et non expirée
  const isBuyer = !isSeller
  const canPay = isBuyer && status === 'accepted'

  const refetch = () => {
    fetch(`/api/offer/${offerId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d) {
          setStatus(d.status)
          setExpiresAt(d.expiresAt ? new Date(d.expiresAt) : null)
        }
      })
  }

  useEffect(() => {
    fetch(`/api/offer/${offerId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d) {
          setStatus(d.status)
          setExpiresAt(d.expiresAt ? new Date(d.expiresAt) : null)
        }
      })
      .finally(() => setLoading(false))

    const handler = (e: Event) => {
      const { offerId: id, status: s, expiresAt: exp } = (e as CustomEvent).detail
      if (id === offerId) {
        setStatus(s)
        setExpiresAt(exp ? new Date(exp) : null)
      } else if (s === 'accepted') {
        refetch()
      }
    }

    window.addEventListener('offer-status-changed', handler)
    window.addEventListener('offers-reset', refetch)
    return () => {
      window.removeEventListener('offer-status-changed', handler)
      window.removeEventListener('offers-reset', refetch)
    }
  }, [offerId])

  // Countdown ticker
  useEffect(() => {
    if (!expiresAt || status !== 'accepted') { setTimeLeft(null); return }
    const tick = () => {
      const diff = expiresAt.getTime() - Date.now()
      if (diff <= 0) { setStatus('rejected'); setTimeLeft(null); return }
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      setTimeLeft(h > 0 ? `${h}h ${m}min` : `${m}min`)
    }
    tick()
    const id = setInterval(tick, 60000)
    return () => clearInterval(id)
  }, [expiresAt, status])

  const respond = async (accepted: boolean) => {
    setResponding(true)
    setRespondError('')
    const res = await fetch('/api/offer/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: offerId, accepted }),
    })
    if (res.ok) {
      setStatus(accepted ? 'accepted' : 'rejected')
    } else {
      const data = await res.json().catch(() => ({}))
      setRespondError(data.error ?? 'Erreur')
    }
    setResponding(false)
  }

  const statusConfig = {
    pending:  { label: 'En attente',  bg: 'var(--paper-2)', border: 'var(--concrete-2)', dot: '#f59e0b' },
    accepted: { label: 'Acceptée',    bg: '#f0fdf4',        border: '#86efac',           dot: '#22c55e' },
    rejected: { label: 'Déclinée',    bg: '#fef2f2',        border: '#fca5a5',           dot: '#ef4444' },
  }
  const cfg = status ? statusConfig[status] : null

  const headerLabel = fromSeller
    ? (isMe ? 'Contre-offre envoyée' : 'Contre-offre reçue')
    : (isMe ? 'Offre envoyée' : 'Offre reçue')

  return (
    <div
      className="rounded-2xl overflow-hidden w-64"
      style={{ border: `1.5px solid ${cfg?.border ?? 'var(--concrete-2)'}` }}
    >
      {/* Header */}
      <div className="px-4 pt-3 pb-2 flex items-center gap-2" style={{ background: 'var(--ink)' }}>
        <Tag className="h-3.5 w-3.5 flex-shrink-0" style={{ color: 'var(--acid)' }} />
        <span className="font-mono text-[10px] uppercase tracking-[.12em]" style={{ color: 'var(--acid)' }}>
          {headerLabel}
        </span>
      </div>

      {/* Price */}
      <div className="px-4 py-3" style={{ background: cfg?.bg ?? 'var(--paper-2)' }}>
        <div className="font-display font-extrabold" style={{ fontSize: 28, letterSpacing: '-.02em', color: 'var(--ink)' }}>
          {Number(price).toFixed(0)} €
        </div>
        {loading ? (
          <div className="h-3 w-20 bg-muted rounded animate-pulse mt-1" />
        ) : (
          <div className="flex flex-col gap-0.5 mt-1">
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: cfg?.dot }} />
              <span className="font-mono text-[10px]" style={{ color: 'var(--concrete-4)' }}>
                {cfg?.label}
              </span>
            </div>
            {status === 'accepted' && timeLeft && (
              <span className="font-mono text-[10px]" style={{ color: '#f59e0b' }}>
                Expire dans {timeLeft}
              </span>
            )}
          </div>
        )}

        {/* Accept / Decline — only for the receiving party, only when pending */}
        {canRespond && status === 'pending' && !loading && (
          <>
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => respond(true)}
                disabled={responding}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-50"
                style={{ background: 'var(--acid)', color: 'var(--ink)' }}
              >
                <Check className="h-3.5 w-3.5" /> Accepter
              </button>
              <button
                onClick={() => respond(false)}
                disabled={responding}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold cursor-pointer border hover:bg-muted transition-colors disabled:opacity-50"
                style={{ borderColor: 'var(--concrete-2)', color: 'var(--concrete-4)' }}
              >
                <X className="h-3.5 w-3.5" /> Décliner
              </button>
            </div>
            {respondError && (
              <p className="text-[10px] text-red-500 mt-1.5 font-mono">{respondError}</p>
            )}
          </>
        )}

        {/* Pay button — only for the buyer when offer is accepted */}
        {canPay && productId && !loading && (
          <Link
            href={`/payment?productId=${productId}&offerId=${offerId}`}
            className="mt-3 flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold hover:opacity-90 transition-opacity"
            style={{ background: 'var(--ink)', color: 'var(--acid)' }}
          >
            <ShoppingBag className="h-3.5 w-3.5" /> Procéder au paiement
          </Link>
        )}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function MessageThread({ conversationId, currentUserId, initialProductId, onBack }: Props) {
  const [conversation, setConversation] = useState<ConversationDetail | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [offerOpen, setOfferOpen] = useState(false)
  const [offerPrice, setOfferPrice] = useState('')
  const [offerSending, setOfferSending] = useState(false)
  const [offerError, setOfferError] = useState('')
  const [productOwnerId, setProductOwnerId] = useState<number | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const offerRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => {
    setLoading(true)
    fetch(`/api/conversations/${conversationId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) { setConversation(data); setMessages(data.messages) }
      })
      .finally(() => setLoading(false))

    fetch(`/api/conversations/${conversationId}/read`, { method: 'POST' })
      .then(() => window.dispatchEvent(new CustomEvent('conversation-read')))
  }, [conversationId])

  useEffect(() => {
    let pusher: any, channel: any
    import('pusher-js').then(({ default: Pusher }) => {
      pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
        authEndpoint: '/api/pusher/auth',
      })
      channel = pusher.subscribe(`private-conversation-${conversationId}`)
      channel.bind('new-message', (msg: Message) => {
        setMessages(prev => [...prev, msg])
        fetch(`/api/conversations/${conversationId}/read`, { method: 'POST' })
          .then(() => window.dispatchEvent(new CustomEvent('conversation-read')))
      })
      channel.bind('offer-updated', (data: { offerId: number; status: string }) => {
        window.dispatchEvent(new CustomEvent('offer-status-changed', { detail: data }))
      })
      channel.bind('offers-reset', () => {
        window.dispatchEvent(new CustomEvent('offers-reset'))
      })
    })
    return () => {
      try { channel?.unsubscribe() } catch (_) {}
      try { pusher?.disconnect() } catch (_) {}
    }
  }, [conversationId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: messages.length > 3 ? 'smooth' : 'instant' })
  }, [messages])

  useEffect(() => {
    if (offerOpen) setTimeout(() => offerRef.current?.focus(), 50)
  }, [offerOpen])

  const productId = messages[0]?.product?.id ?? conversation?.productId ?? initialProductId ?? null
  const other = conversation?.participants.find(p => p.id !== currentUserId)
  const product = messages.find(m => m.product)?.product ?? null

  // Fetch product owner reliably
  useEffect(() => {
    if (!productId) return
    fetch(`/api/article/${productId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.userId) setProductOwnerId(d.userId) })
  }, [productId])

  const isSeller = productOwnerId !== null && productOwnerId === currentUserId
  const isBuyer = productOwnerId !== null && productOwnerId !== currentUserId

  const handleSend = async () => {
    if (!input.trim() || !productId || sending) return
    setSending(true)
    const content = input.trim()
    setInput('')
    try {
      await fetch(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, productId }),
      })
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  const handleSendOffer = async () => {
    const price = parseFloat(offerPrice)
    if (!price || price <= 0) { setOfferError('Prix invalide'); return }
    if (!productId) return
    setOfferSending(true)
    setOfferError('')
    try {
      // 1. Create the offer
      const offerRes = await fetch('/api/offer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offerPrice: price, productId }),
      })
      if (!offerRes.ok) {
        const err = await offerRes.json()
        setOfferError(err.error ?? 'Erreur')
        return
      }
      const offer = await offerRes.json()

      // 2. Send as a special message so it appears in the thread
      await fetch(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: `__OFFER__:${JSON.stringify({ offerId: offer.id, price, fromSeller: isSeller })}`,
          productId,
        }),
      })
      setOfferPrice('')
      setOfferOpen(false)
    } finally {
      setOfferSending(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-3 px-4 py-4 border-b border-border">
          <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
          <div className="space-y-2 flex-1">
            <div className="h-4 w-32 bg-muted rounded animate-pulse" />
            <div className="h-3 w-24 bg-muted rounded animate-pulse" />
          </div>
        </div>
        <div className="flex-1 px-6 py-4 space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : ''}`}>
              <div className="h-10 w-48 rounded-3xl bg-muted animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--paper)' }}>

      {/* ── Header ── */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border flex-shrink-0" style={{ background: 'var(--paper)' }}>
        {onBack && (
          <button
            onClick={onBack}
            className="md:hidden p-1.5 -ml-1 rounded-full hover:bg-muted transition-colors cursor-pointer text-muted-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}
        <button onClick={() => other && router.push(`/profile/${other.id}`)} className="cursor-pointer flex-shrink-0">
          <Avatar className="h-10 w-10 ring-2 ring-background shadow-sm hover:opacity-80 transition-opacity">
            <AvatarImage src={other?.image ?? undefined} />
            <AvatarFallback className="bg-muted text-foreground font-bold text-sm">
              {other?.firstName?.charAt(0)}
            </AvatarFallback>
          </Avatar>
        </button>
        <div className="flex-1 min-w-0 flex flex-col gap-0.5">
          <button
            onClick={() => other && router.push(`/profile/${other.id}`)}
            className="font-semibold text-sm leading-tight hover:opacity-70 transition-opacity cursor-pointer text-left w-fit"
          >
            {other ? `${other.firstName} ${other.lastName}` : '—'}
          </button>
          {product && (
            <Link
              href={`/article/${product.id}`}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <span className="truncate max-w-[180px]">{product.title}</span>
              <ExternalLink className="h-3 w-3 flex-shrink-0" />
            </Link>
          )}
        </div>
        <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
          {other && (
            <Link
              href={`/profile/${other.id}`}
              className="text-xs font-medium px-3 py-1.5 rounded-full border border-border hover:bg-muted transition-colors cursor-pointer"
            >
              Voir le profil
            </Link>
          )}
          {product && (
            <Link
              href={`/article/${product.id}`}
              className="text-xs font-medium px-3 py-1.5 rounded-full bg-muted border border-border hover:bg-muted/70 transition-colors cursor-pointer"
            >
              Voir l'annonce
            </Link>
          )}
        </div>
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-1">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-center py-12">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-1">
              <Send className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="font-semibold text-sm">Démarre la conversation</p>
            <p className="text-xs text-muted-foreground">Envoie ton premier message</p>
          </div>
        )}

        {messages.map((msg, i) => {
          const isMe = msg.user.id === currentUserId
          const prev = messages[i - 1] ?? null
          const next = messages[i + 1] ?? null
          const showDateSep = !prev || !isSameDay(prev.createdAt, msg.createdAt)

          // Parse offer messages
          const isOffer = msg.content.startsWith('__OFFER__:')
          let offerData: { offerId: number; price: number; fromSeller?: boolean } | null = null
          if (isOffer) {
            try { offerData = JSON.parse(msg.content.slice(10)) } catch (_) {}
          }

          const isGroupStart = !prev || !isSameGroup(prev, msg) || (messages[i - 1] && messages[i - 1].content.startsWith('__OFFER__:'))
          const isGroupEnd = !next || !isSameGroup(msg, next) || (messages[i + 1] && messages[i + 1].content.startsWith('__OFFER__:'))

          return (
            <div key={msg.id}>
              {showDateSep && (
                <div className="flex items-center gap-3 my-4">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-muted-foreground font-medium px-2">
                    {formatDateLabel(msg.createdAt)}
                  </span>
                  <div className="flex-1 h-px bg-border" />
                </div>
              )}

              <div className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'} ${isGroupStart ? 'mt-3' : 'mt-0.5'}`}>
                {!isMe && (
                  <div className="w-7 flex-shrink-0">
                    {isGroupEnd ? (
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={msg.user.image ?? undefined} />
                        <AvatarFallback className="text-xs bg-muted font-medium">
                          {msg.user.firstName?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                    ) : null}
                  </div>
                )}

                <div className={`flex flex-col gap-0.5 max-w-[68%] ${isMe ? 'items-end' : 'items-start'}`}>
                  {isOffer && offerData ? (
                    <OfferCard
                      offerId={offerData.offerId}
                      price={offerData.price}
                      isMe={isMe}
                      isSeller={isSeller}
                      fromSeller={offerData.fromSeller ?? false}
                      productId={productId}
                    />
                  ) : (
                    <div
                      className={`px-4 py-2.5 text-sm leading-relaxed break-words ${
                        isMe
                          ? `bg-foreground text-background shadow-sm ${
                              isGroupStart && isGroupEnd ? 'rounded-3xl' :
                              isGroupStart ? 'rounded-3xl rounded-br-lg' :
                              isGroupEnd ? 'rounded-3xl rounded-tr-lg' :
                              'rounded-3xl rounded-r-lg'
                            }`
                          : `bg-muted text-foreground ${
                              isGroupStart && isGroupEnd ? 'rounded-3xl' :
                              isGroupStart ? 'rounded-3xl rounded-bl-lg' :
                              isGroupEnd ? 'rounded-3xl rounded-tl-lg' :
                              'rounded-3xl rounded-l-lg'
                            }`
                      }`}
                    >
                      {msg.content}
                    </div>
                  )}
                  {isGroupEnd && (
                    <span className="text-[11px] text-muted-foreground/70 px-1">
                      {formatTime(msg.createdAt)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* ── Offer panel (slides up) ── */}
      {offerOpen && (
        <div
          className="flex-shrink-0 px-4 py-3 border-t"
          style={{ background: 'var(--paper-2)', borderColor: 'var(--concrete-2)' }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-[10px] uppercase tracking-[.12em]" style={{ color: 'var(--concrete-4)' }}>
              Proposer un prix
            </span>
            <button onClick={() => { setOfferOpen(false); setOfferError('') }} className="cursor-pointer" style={{ color: 'var(--concrete-3)' }}>
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm" style={{ color: 'var(--concrete-3)' }}>€</span>
              <input
                ref={offerRef}
                type="number"
                min="1"
                placeholder="0"
                value={offerPrice}
                onChange={e => { setOfferPrice(e.target.value); setOfferError('') }}
                onKeyDown={e => e.key === 'Enter' && handleSendOffer()}
                className="w-full rounded-xl border pl-8 pr-4 py-2.5 text-sm font-mono outline-none focus:border-foreground transition-colors"
                style={{ border: `1px solid ${offerError ? '#f87171' : 'var(--concrete-2)'}`, background: 'white' }}
              />
            </div>
            <button
              onClick={handleSendOffer}
              disabled={offerSending}
              className="rounded-xl px-5 py-2.5 text-sm font-bold cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-50"
              style={{ background: 'var(--ink)', color: 'var(--acid)' }}
            >
              {offerSending ? '...' : 'Envoyer'}
            </button>
          </div>
          {offerError && <p className="text-red-500 text-xs mt-1.5">{offerError}</p>}
        </div>
      )}

      {/* ── Input bar ── */}
      <div className="flex items-center gap-2 px-4 py-3 border-t border-border flex-shrink-0" style={{ background: 'var(--paper)' }}>
        {/* Offer button — buyer or seller */}
        {(isBuyer || isSeller) && (
          <button
            onClick={() => setOfferOpen(v => !v)}
            title="Faire une offre"
            className={`flex h-11 w-11 items-center justify-center rounded-2xl border transition-all cursor-pointer flex-shrink-0 ${
              offerOpen ? 'border-foreground bg-foreground text-background' : 'border-border hover:bg-muted'
            }`}
          >
            <Tag className="h-4 w-4" />
          </button>
        )}
        <div className="flex-1 relative">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Écris un message…"
            className="w-full rounded-2xl border border-border bg-muted/40 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-foreground/15 focus:border-foreground/20 transition-all placeholder:text-muted-foreground/60"
          />
        </div>
        <button
          onClick={handleSend}
          disabled={!input.trim() || sending}
          className="flex h-11 w-11 items-center justify-center rounded-2xl active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer flex-shrink-0"
          style={{ background: 'var(--acid)', color: 'var(--ink)' }}
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
