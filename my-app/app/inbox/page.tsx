import ChatComponent from '@/components/chat-component'
import ConversationList from '@/components/conversation-list'
import React from 'react'

const Inbox = () => {
  return (
    <div className="flex h-screen">
      {/* Conversation list (left side) */}
      <div className="w-1/4 bg-background border-r border-gray-300 overflow-y-auto">
        <ConversationList />
      </div>

      {/* Chat component (right side) */}
      <div className="w-3/4 flex flex-col bg-background">
        <ChatComponent />
      </div>
    </div>
  )
}

export default Inbox
