'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import ConversationList, { type Conversation } from '@/components/chat/ConversationList'
import MessageThread from '@/components/chat/MessageThread'
import { MessageCircle } from 'lucide-react'

function ConversationListSkeleton() {
  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-4 border-b border-border">
        <div className="h-5 w-28 bg-muted rounded animate-pulse" />
      </div>
      <div className="p-3 space-y-1">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex items-center gap-3 px-2 py-3">
            <div className="h-11 w-11 rounded-full bg-muted animate-pulse flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 bg-muted rounded animate-pulse w-3/4" />
              <div className="h-3 bg-muted rounded animate-pulse w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function InboxContent() {
  const { status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeId, setActiveId] = useState<number | null>(null)
  const [currentUserId, setCurrentUserId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [showThread, setShowThread] = useState(false)
  const [activeProductId, setActiveProductId] = useState<number | null>(null)
  const [adminMessages, setAdminMessages] = useState<{ id: number; subject: string; body: string; read: boolean; createdAt: string }[]>([])
  const [showAdmin, setShowAdmin] = useState(false)

  const refreshConversations = () => {
    fetch('/api/conversations').then(r => r.ok ? r.json() : []).then(setConversations)
  }

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login?callbackUrl=/inbox')
  }, [status, router])

  useEffect(() => {
    if (status !== 'authenticated') return
    Promise.all([
      fetch('/api/user').then(r => r.ok ? r.json() : null),
      fetch('/api/conversations').then(r => r.ok ? r.json() : []),
      fetch('/api/user/messages').then(r => r.ok ? r.json() : []),
    ]).then(([userData, convData, msgData]) => {
      if (userData?.[0]) setCurrentUserId(userData[0].id)
      setConversations(convData)
      setAdminMessages(msgData)

      const cParam = searchParams.get('c')
      const pParam = searchParams.get('p')
      if (cParam) {
        setActiveId(parseInt(cParam))
        setShowThread(true)
        if (pParam) setActiveProductId(parseInt(pParam))
      } else if (convData.length > 0) {
        setActiveId(convData[0].id)
      }
    }).finally(() => setLoading(false))
  }, [status, searchParams])

  useEffect(() => {
    if (!currentUserId) return
    let pusher: any
    let channel: any
    import('pusher-js').then(({ default: Pusher }) => {
      pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
        authEndpoint: '/api/pusher/auth',
      })
      channel = pusher.subscribe(`private-user-${currentUserId}`)
      channel.bind('new-conversation-message', () => refreshConversations())
      channel.bind('admin-message', (data: { subject: string; body: string }) => {
        setAdminMessages(prev => [{ id: Date.now(), subject: data.subject, body: data.body, read: false, createdAt: new Date().toISOString() }, ...prev])
      })
    })
    return () => {
      try { channel?.unsubscribe() } catch (_) {}
      try { pusher?.disconnect() } catch (_) {}
    }
  }, [currentUserId])

  const handleSelect = (id: number) => {
    setActiveId(id)
    setShowAdmin(false)
    setShowThread(true)
    setActiveProductId(null)
    setConversations(prev => prev.map(c => c.id === id ? { ...c, unreadCount: 0 } : c))
  }

  const handleSelectAdmin = () => {
    setShowAdmin(true)
    setActiveId(null)
    setShowThread(true)
    adminMessages.filter(m => !m.read).forEach(m => {
      fetch('/api/user/messages', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: m.id }) })
    })
    setAdminMessages(prev => prev.map(m => ({ ...m, read: true })))
  }

  const unreadAdmin = adminMessages.filter(m => !m.read).length

  if (status === 'loading') {
    return (
      <div className="fixed inset-0 top-16 flex items-center justify-center bg-background">
        <div className="h-8 w-8 rounded-full border-2 border-foreground/20 border-t-foreground animate-spin" />
      </div>
    )
  }

  return (
    <div className="fixed inset-0 top-16 flex overflow-hidden border-t border-border z-10" style={{ background: 'var(--paper)' }}>

      {/* ── Panneau gauche — liste conversations ── */}
      <div
        className={`w-full sm:w-72 md:w-80 lg:w-96 flex-shrink-0 border-r border-border flex flex-col ${showThread ? 'hidden sm:flex' : 'flex'}`}
        style={{ background: 'var(--paper)' }}
      >
        {/* FlipIt official messages — épinglé en haut */}
        {!loading && adminMessages.length > 0 && (
          <button
            onClick={handleSelectAdmin}
            className="w-full flex items-center gap-3 px-4 py-3 border-b text-left transition-colors"
            style={{
              background: showAdmin ? 'rgba(202,255,0,.08)' : 'transparent',
              borderColor: 'rgba(0,0,0,.06)',
            }}
          >
            <div className="h-11 w-11 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm" style={{ background: 'var(--ink)', color: 'var(--acid)' }}>
              F
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-sm" style={{ color: 'var(--ink)' }}>FlipIt</p>
                {unreadAdmin > 0 && (
                  <span className="h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0" style={{ background: 'var(--ink)', color: 'var(--acid)' }}>
                    {unreadAdmin}
                  </span>
                )}
              </div>
              <p className="text-xs truncate mt-0.5" style={{ color: 'var(--concrete-4)' }}>
                {adminMessages[0]?.subject}
              </p>
            </div>
          </button>
        )}

        {loading ? (
          <ConversationListSkeleton />
        ) : (
          currentUserId && (
            <ConversationList
              conversations={conversations}
              activeId={showAdmin ? null : activeId}
              currentUserId={currentUserId}
              onSelect={handleSelect}
            />
          )
        )}
      </div>

      {/* ── Panneau droit — thread ── */}
      <div
        className={`flex-1 flex flex-col min-w-0 ${showThread ? 'flex' : 'hidden sm:flex'}`}
        style={{ background: 'var(--paper)' }}
      >
        {loading ? (
          <div className="flex flex-col h-full items-center justify-center gap-3 p-8">
            <div className="h-8 w-8 rounded-full border-2 border-foreground/20 border-t-foreground animate-spin" />
          </div>
        ) : showAdmin ? (
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-border flex-shrink-0">
              <button
                onClick={() => setShowThread(false)}
                className="sm:hidden p-1.5 rounded-lg hover:bg-black/5 transition-colors mr-1"
                style={{ color: 'var(--concrete-3)' }}
              >
                ←
              </button>
              <div className="h-9 w-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0" style={{ background: 'var(--ink)', color: 'var(--acid)' }}>
                F
              </div>
              <div>
                <p className="font-semibold text-sm" style={{ color: 'var(--ink)' }}>FlipIt</p>
                <p className="text-xs" style={{ color: 'var(--concrete-4)' }}>Messages officiels</p>
              </div>
            </div>
            {/* Messages list */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {adminMessages.map(msg => (
                <div key={msg.id} className="rounded-2xl p-4 max-w-lg" style={{ background: 'var(--paper-2)' }}>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <p className="font-semibold text-sm" style={{ color: 'var(--ink)' }}>{msg.subject}</p>
                    <span className="text-[10px] flex-shrink-0 mt-0.5" style={{ color: 'var(--concrete-4)' }}>
                      {new Date(msg.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--concrete-4)', lineHeight: '1.6' }}>{msg.body}</p>
                </div>
              ))}
            </div>
          </div>
        ) : activeId && currentUserId ? (
          <MessageThread
            key={activeId}
            conversationId={activeId}
            currentUserId={currentUserId}
            initialProductId={activeProductId ?? undefined}
            onBack={() => setShowThread(false)}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center px-8 gap-3">
            <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center">
              <MessageCircle className="h-8 w-8 text-muted-foreground/40" />
            </div>
            <div>
              <p className="font-semibold">Tes messages</p>
              <p className="text-sm text-muted-foreground mt-1">
                Contacte un vendeur depuis une annonce pour démarrer une conversation
              </p>
            </div>
          </div>
        )}
      </div>

    </div>
  )
}

export default function InboxPage() {
  return (
    <Suspense fallback={
      <div className="fixed inset-0 top-16 flex items-center justify-center bg-background">
        <div className="h-8 w-8 rounded-full border-2 border-foreground/20 border-t-foreground animate-spin" />
      </div>
    }>
      <InboxContent />
    </Suspense>
  )
}
