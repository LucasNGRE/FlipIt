import ChatComponent from '@/components/chat/chat-component';
import ConversationList from '@/components/chat/conversation-list';
import React from 'react';

const Inbox = () => {
  return (
    <div className="flex flex-col h-screen lg:flex-row">
      {/* Liste de conversations (côté gauche) */}
      <div className="w-full lg:w-1/4 bg-background border-b lg:border-r border-gray-300 overflow-y-auto lg:h-auto">
        <ConversationList />
      </div>

      {/* Composant de chat (côté droit) */}
      <div className="lg:w-3/4 flex flex-col bg-background lg:h-auto">
        {/* Afficher le composant de chat uniquement sur les écrans plus grands */}
        <div className="hidden lg:block">
          <ChatComponent />
        </div>
      </div>
    </div>
  );
};

export default Inbox;
