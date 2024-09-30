import ChatComponent from '@/components/chat/chat-component';
import ConversationList from '@/components/chat/conversation-list';
import React from 'react';
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Inbox | FlipIt",
  description: "Un espace",
};

const Inbox = () => {
  return (
    <div className="flex flex-col h-screen lg:flex-row p-2">
      {/* Liste de conversations (côté gauche) */}
      <div className="w-full h-full lg:w-1/4 bg-background border-b lg:border-r border-gray-300 overflow-y-auto">
        <ConversationList />
      </div>

      {/* Espace pour le chat, visible sur tous les écrans */}
      <div className="flex-grow bg-background border-b lg:border-r border-gray-300 overflow-y-auto">
        {/* Afficher le composant de chat seulement sur les écrans larges */}
        <div className="hidden lg:flex lg:flex-grow">
          <ChatComponent />
        </div>
      </div>

      {/* Placeholder ou espace de contenu */}
      <div className="lg:hidden flex-grow bg-background overflow-y-auto">
        {/* Optionnel : mettre un message ou autre contenu à afficher sur mobile */}
        <p className="text-center p-4">Sélectionnez une conversation pour commencer à discuter</p>
      </div>
    </div>
  );
};

export default Inbox;
