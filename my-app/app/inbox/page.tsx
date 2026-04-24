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
    ]).then(([userData, convData]) => {
      if (userData?.[0]) setCurrentUserId(userData[0].id)
      setConversations(convData)

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
    })
    return () => {
      try { channel?.unsubscribe() } catch (_) {}
      try { pusher?.disconnect() } catch (_) {}
    }
  }, [currentUserId])

  const handleSelect = (id: number) => {
    setActiveId(id)
    setShowThread(true)
    setActiveProductId(null)
    setConversations(prev => prev.map(c => c.id === id ? { ...c, unreadCount: 0 } : c))
  }

  if (status === 'loading') {
    return (
      <div className="fixed inset-0 top-16 flex items-center justify-center bg-background">
        <div className="h-8 w-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="fixed inset-0 top-16 flex overflow-hidden bg-background border-t border-border">

      {/* ── Panneau gauche — liste conversations ── */}
      <div className={`w-full sm:w-72 md:w-80 lg:w-96 flex-shrink-0 border-r border-border bg-background flex flex-col ${
        showThread ? 'hidden sm:flex' : 'flex'
      }`}>
        {loading ? (
          <ConversationListSkeleton />
        ) : (
          currentUserId && (
            <ConversationList
              conversations={conversations}
              activeId={activeId}
              currentUserId={currentUserId}
              onSelect={handleSelect}
            />
          )
        )}
      </div>

      {/* ── Panneau droit — thread ── */}
      <div className={`flex-1 flex flex-col bg-background min-w-0 ${
        showThread ? 'flex' : 'hidden sm:flex'
      }`}>
        {loading ? (
          <div className="flex flex-col h-full items-center justify-center gap-3 p-8">
            <div className="h-8 w-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
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
            <div className="h-16 w-16 rounded-2xl bg-brand/8 flex items-center justify-center">
              <MessageCircle className="h-8 w-8 text-brand/40" />
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
        <div className="h-8 w-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
      </div>
    }>
      <InboxContent />
    </Suspense>
  )
}
