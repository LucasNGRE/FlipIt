"use client";

import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Truck, DollarSign, ShoppingCart } from 'lucide-react';
import { OfferDialog } from '@/components/chat/offer-dialog'; // Importe le composant

type Message = {
  sender: 'buyer' | 'seller';
  content: string;
  timestamp: string;
};

export default function ChatComponent() {
  const [messages, setMessages] = useState<Message[]>([
    { sender: 'seller', content: "Hey there! Interested in my skateboard?", timestamp: "2:30 PM" },
    { sender: 'buyer', content: "Yeah! It looks sick. Is it still available?", timestamp: "2:32 PM" },
    { sender: 'seller', content: "It's in great condition. Barely used.", timestamp: "2:33 PM" },
  ]);
  
  const [inputMessage, setInputMessage] = useState('');
  
  const handleSendMessage = () => {
    if (inputMessage.trim()) {
      setMessages([...messages, {
        sender: 'buyer',
        content: inputMessage,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
      setInputMessage('');
    }
  };

  const handleOfferSubmit = (price: string) => {
    setMessages([...messages, {
      sender: 'buyer',
      content: `I would like to offer $${price}.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }]);
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="bg-primary text-white">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center">
            <Truck className="mr-2" />
            Article
          </span>
          <span className="text-sm font-normal">Vendeur</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[400px] p-4">
          {messages.map((message, index) => (
            <div key={index} className={`flex ${message.sender === 'buyer' ? 'justify-end' : 'justify-start'} mb-4`}>
              <div className={`flex ${message.sender === 'buyer' ? 'flex-row-reverse' : 'flex-row'} items-end`}>
                <Avatar className="w-8 h-8">
                  <AvatarImage src={message.sender === 'buyer' ? "/placeholder.svg?height=32&width=32" : "/placeholder.svg?height=32&width=32"} />
                  <AvatarFallback>{message.sender === 'buyer' ? 'B' : 'S'}</AvatarFallback>
                </Avatar>
                <div className={`mx-2 p-3 rounded-lg ${message.sender === 'buyer' ? 'bg-secondary text-white' : 'bg-secondary-foreground'}`}>
                  <p>{message.content}</p>
                  <span className="text-xs opacity-50 mt-1 block">{message.timestamp}</span>
                </div>
              </div>
            </div>
          ))}
        </ScrollArea>
      </CardContent>
      <CardFooter className="flex flex-col space-y-4">
        <div className="flex w-full space-x-2">
          <Input 
            placeholder="Type your message..." 
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          />
          <Button onClick={handleSendMessage}>Send</Button>
        </div>
        <div className="flex justify-between w-full">
          {/* Utilisation du composant Dialog ici */}
          <OfferDialog onOfferSubmit={handleOfferSubmit} />
          <Button variant="default" className="flex-1 ml-2">
            <ShoppingCart className="mr-2 h-4 w-4" /> Buy Now
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}