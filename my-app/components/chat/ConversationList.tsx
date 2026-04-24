'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { MessageCircle } from 'lucide-react'

type Participant = { id: number; firstName: string; lastName: string; image: string | null }
type LastMessage = { content: string; createdAt: string; product: { id: number; title: string } | null }

export type Conversation = {
  id: number
  participants: Participant[]
  messages: LastMessage[]
  updatedAt: string
  unreadCount: number
}

interface Props {
  conversations: Conversation[]
  activeId: number | null
  currentUserId: number
  onSelect: (id: number) => void
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "À l'instant"
  if (mins < 60) return `${mins}min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}j`
  return new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

export default function ConversationList({ conversations, activeId, currentUserId: _currentUserId, onSelect }: Props) {
  const totalUnread = conversations.reduce((sum, c) => sum + (c.unreadCount ?? 0), 0)

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border flex-shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-base flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-brand" />
            Messages
          </h2>
          {totalUnread > 0 && (
            <span className="h-5 min-w-5 px-1.5 rounded-full bg-brand text-white text-xs font-bold flex items-center justify-center">
              {totalUnread > 99 ? '99+' : totalUnread}
            </span>
          )}
        </div>
      </div>

      {conversations.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 text-center px-6 py-16">
          <div className="h-14 w-14 rounded-2xl bg-brand/10 flex items-center justify-center mb-3">
            <MessageCircle className="h-7 w-7 text-brand/60" />
          </div>
          <p className="font-semibold text-sm">Aucun message</p>
          <p className="text-xs text-muted-foreground mt-1">Contacte un vendeur depuis une annonce</p>
        </div>
      ) : (
        <div className="overflow-y-auto flex-1 py-1">
          {conversations.map(conv => {
            const other = conv.participants[0]
            const last = conv.messages[0]
            const isActive = conv.id === activeId
            const hasUnread = (conv.unreadCount ?? 0) > 0

            return (
              <button
                key={conv.id}
                onClick={() => onSelect(conv.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left cursor-pointer transition-all duration-150 relative ${
                  isActive
                    ? 'bg-brand/8 before:absolute before:left-0 before:top-2 before:bottom-2 before:w-0.5 before:rounded-full before:bg-brand'
                    : hasUnread
                    ? 'bg-brand/4 hover:bg-brand/8'
                    : 'hover:bg-muted/60'
                }`}
              >
                {/* Avatar with unread badge */}
                <div className="relative flex-shrink-0">
                  <Avatar className={`h-11 w-11 transition-all ${isActive ? 'ring-2 ring-brand/30 ring-offset-1' : ''}`}>
                    <AvatarImage src={other?.image ?? undefined} />
                    <AvatarFallback className={`text-sm font-bold ${hasUnread ? 'bg-brand/15 text-brand' : 'bg-muted text-muted-foreground'}`}>
                      {other?.firstName?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  {hasUnread && (
                    <span className="absolute -top-0.5 -right-0.5 h-5 min-w-5 px-1 rounded-full bg-brand text-white text-[10px] font-bold flex items-center justify-center leading-none shadow-sm">
                      {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                    </span>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2 mb-0.5">
                    <span className={`text-sm truncate ${hasUnread ? 'font-bold text-foreground' : 'font-semibold text-foreground/90'}`}>
                      {other ? `${other.firstName} ${other.lastName}` : 'Utilisateur'}
                    </span>
                    {(last ?? conv.updatedAt) && (
                      <span className={`text-[11px] flex-shrink-0 tabular-nums ${hasUnread ? 'text-brand font-semibold' : 'text-muted-foreground/70'}`}>
                        {timeAgo(last?.createdAt ?? conv.updatedAt)}
                      </span>
                    )}
                  </div>

                  {last?.product && (
                    <p className="text-[11px] text-brand/80 truncate font-medium mb-0.5">
                      {last.product.title}
                    </p>
                  )}

                  {last ? (
                    <p className={`text-xs truncate leading-relaxed ${hasUnread ? 'text-foreground/80 font-medium' : 'text-muted-foreground'}`}>
                      {last.content}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground/60 italic">Nouvelle conversation</p>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
