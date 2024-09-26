"use client";

import { useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { MessageCircle } from 'lucide-react'

type Conversation = {
  id: string
  name: string
  lastMessage: string
  timestamp: string
  unread: boolean
}

export default function ConversationList() {
  const [conversations, setConversations] = useState<Conversation[]>([
    { id: '1', name: 'Tony Hawk', lastMessage: "Hey, is the board still available?", timestamp: "2:30 PM", unread: true },
    { id: '2', name: 'Rodney Mullen', lastMessage: "Thanks for the offer!", timestamp: "Yesterday", unread: false },
    { id: '3', name: 'Nyjah Huston', lastMessage: "Can you do $50?", timestamp: "2 days ago", unread: false },
  ])

  const [activeConversation, setActiveConversation] = useState<string | null>(null)

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="bg-primary text-white">
        <CardTitle className="flex items-center">
          <MessageCircle className="mr-2" />
          Conversations
        </CardTitle>
      </CardHeader>
      {/* Add padding here to create space between the title and the first conversation */}
      <CardContent className="p-0">
        <ScrollArea className="h-[400px]">
          <div className="space-y-4 p-4">
            {conversations.map((conversation) => (
              <Button
                key={conversation.id}
                variant="ghost"
                className={`w-full justify-start px-4 py-3 rounded-lg ${activeConversation === conversation.id ? 'bg-gray-100' : ''}`}
                onClick={() => setActiveConversation(conversation.id)}
              >
                <Avatar className="w-10 h-10 mr-3">
                  <AvatarImage src={`/placeholder.svg?height=40&width=40`} />
                  <AvatarFallback>{conversation.name[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">{conversation.name}</span>
                    <span className="text-xs text-gray-500">{conversation.timestamp}</span>
                  </div>
                  <p className="text-sm text-gray-600 truncate">{conversation.lastMessage}</p>
                </div>
                {conversation.unread && (
                  <div className="w-2 h-2 bg-blue-500 rounded-full ml-2"></div>
                )}
              </Button>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
