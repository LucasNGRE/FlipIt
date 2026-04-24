'use client'

import { useEffect, useRef, useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Send, ArrowLeft, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type MsgUser = { id: number; firstName: string; lastName: string; image: string | null }
type MsgProduct = { id: number; title: string; images: { url: string }[] }

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

export default function MessageThread({ conversationId, currentUserId, initialProductId, onBack }: Props) {
  const [conversation, setConversation] = useState<ConversationDetail | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => {
    setLoading(true)
    fetch(`/api/conversations/${conversationId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setConversation(data)
          setMessages(data.messages)
        }
      })
      .finally(() => setLoading(false))

    fetch(`/api/conversations/${conversationId}/read`, { method: 'POST' })
      .then(() => window.dispatchEvent(new CustomEvent('conversation-read')))
  }, [conversationId])

  useEffect(() => {
    let pusher: any
    let channel: any
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
    })
    return () => {
      try { channel?.unsubscribe() } catch (_) {}
      try { pusher?.disconnect() } catch (_) {}
    }
  }, [conversationId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: messages.length > 3 ? 'smooth' : 'instant' })
  }, [messages])

  const productId = messages[0]?.product?.id ?? conversation?.productId ?? initialProductId ?? null
  const other = conversation?.participants.find(p => p.id !== currentUserId)
  const product = messages.find(m => m.product)?.product ?? null

  const handleSend = async () => {
    if (!input.trim() || !productId || sending) return
    setSending(true)
    const optimisticContent = input.trim()
    setInput('')
    try {
      await fetch(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: optimisticContent, productId }),
      })
    } finally {
      setSending(false)
      inputRef.current?.focus()
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
    <div className="flex flex-col h-full bg-background">

      {/* ── Header ── */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-background/95 backdrop-blur-sm flex-shrink-0">
        {onBack && (
          <button
            onClick={onBack}
            className="md:hidden p-1.5 -ml-1 rounded-full hover:bg-muted transition-colors cursor-pointer text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}
        <button
          onClick={() => other && router.push(`/profile/${other.id}`)}
          className="cursor-pointer flex-shrink-0 rounded-full focus:outline-none focus:ring-2 focus:ring-brand/40"
        >
          <Avatar className="h-10 w-10 ring-2 ring-background shadow-sm hover:opacity-80 transition-opacity">
            <AvatarImage src={other?.image ?? undefined} />
            <AvatarFallback className="bg-brand/10 text-brand font-bold text-sm">
              {other?.firstName?.charAt(0)}
            </AvatarFallback>
          </Avatar>
        </button>
        <div className="flex-1 min-w-0 flex flex-col gap-0.5">
          <button
            onClick={() => other && router.push(`/profile/${other.id}`)}
            className="font-semibold text-sm leading-tight hover:text-brand transition-colors cursor-pointer text-left w-fit"
          >
            {other ? `${other.firstName} ${other.lastName}` : '—'}
          </button>
          {product && (
            <Link
              href={`/article/${product.id}`}
              className="inline-flex items-center gap-1 text-xs text-brand hover:text-brand/80 transition-colors mt-0.5"
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
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border border-border hover:bg-muted transition-colors cursor-pointer"
            >
              Voir le profil
            </Link>
          )}
          {product && (
            <Link
              href={`/article/${product.id}`}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-brand/8 border border-brand/20 text-brand hover:bg-brand/15 transition-colors cursor-pointer"
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
            <div className="h-12 w-12 rounded-full bg-brand/10 flex items-center justify-center mb-1">
              <Send className="h-5 w-5 text-brand" />
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
          const isGroupStart = !prev || !isSameGroup(prev, msg)
          const isGroupEnd = !next || !isSameGroup(msg, next)

          return (
            <div key={msg.id}>
              {/* Date separator */}
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
                {/* Avatar — only shown for last message in group */}
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
                  <div
                    className={`px-4 py-2.5 text-sm leading-relaxed break-words ${
                      isMe
                        ? `bg-brand text-white shadow-sm shadow-brand/20 ${
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

      {/* ── Input ── */}
      <div className="flex items-end gap-3 px-4 py-3 border-t border-border bg-background flex-shrink-0">
        <div className="flex-1 relative">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Écris un message…"
            className="w-full rounded-2xl border border-border bg-muted/40 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand/40 transition-all placeholder:text-muted-foreground/60"
          />
        </div>
        <button
          onClick={handleSend}
          disabled={!input.trim() || sending}
          className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand text-white hover:bg-brand/90 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer flex-shrink-0 shadow-sm shadow-brand/30"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
