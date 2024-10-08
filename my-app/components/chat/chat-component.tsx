"use client";

import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Truck, ShoppingCart } from "lucide-react";
import { OfferDialog } from "@/components/chat/offer-dialog"; // Importe le composant

type Message = {
  id: number; // Ajouter l'ID du message pour l'identifier dans l'état
  sender: "buyer" | "seller";
  content: string;
  timestamp: string;
  offerPrice?: string; // Ajout d'un champ pour le prix de l'offre
  offerAccepted?: boolean; // Pour suivre si l'offre a été acceptée
};

export default function ChatComponent() {
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, sender: "seller", content: "Hey there! Interested in my skateboard?", timestamp: "2:30 PM" },
    { id: 2, sender: "buyer", content: "Yeah! It looks sick. Is it still available?", timestamp: "2:32 PM" },
    { id: 3, sender: "seller", content: "It's in great condition. Barely used.", timestamp: "2:33 PM" },
  ]);

  const [inputMessage, setInputMessage] = useState("");

  const handleSendMessage = () => {
    if (inputMessage.trim()) {
      const newMessage: Message = {
        id: messages.length + 1, // Générer un nouvel ID pour le message
        sender: "buyer",
        content: inputMessage,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
      
      setMessages((prevMessages) => [...prevMessages, newMessage]);
      setInputMessage("");
    }
  };

  const handleOfferSubmit = (price: string) => {
    const newOfferMessage: Message = {
      id: messages.length + 1,
      sender: "buyer",
      content: `Je voudrais offrir $${price}.`,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      offerPrice: price,
    };

    setMessages((prevMessages) => [...prevMessages, newOfferMessage]);
  };

  const handleOfferResponse = async (index: number, accepted: boolean) => {
    const offerMessage = messages[index];

    if (offerMessage.offerPrice) {
      try {
        const response = await fetch(`/api/offer/status`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ id: offerMessage.id, accepted }), // Passez l'id et l'état d'acceptation
        });

        if (!response.ok) {
          throw new Error("Erreur lors de l'acceptation ou du refus de l'offre");
        }

        const updatedMessage = { ...offerMessage, offerAccepted: accepted };
        setMessages((prevMessages) => {
          const newMessages = [...prevMessages];
          newMessages[index] = updatedMessage;
          return newMessages;
        });
      } catch (error) {
        console.error(error);
      }
    }
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
            <div key={index} className={`flex mb-4 ${message.sender === "buyer" ? "justify-end" : "justify-start"}`}>
              <div className={`flex ${message.sender === "buyer" ? "flex-row-reverse" : "flex-row"} items-end`}>
                <Avatar className="w-8 h-8">
                  <AvatarImage src="/placeholder.svg?height=32&width=32" />
                  <AvatarFallback>{message.sender === "buyer" ? "B" : "S"}</AvatarFallback>
                </Avatar>
                <div className={`mx-2 p-3 rounded-lg ${message.sender === "buyer" ? "bg-secondary text-white" : "bg-secondary-foreground"}`}>
                  <p>{message.content}</p>
                  {message.offerPrice && !message.offerAccepted && (
                    <div className="flex space-x-2 mt-2">
                      <Button onClick={() => handleOfferResponse(index, true)} variant="outline">
                        Accepter
                      </Button>
                      <Button onClick={() => handleOfferResponse(index, false)} variant="outline">
                        Refuser
                      </Button>
                    </div>
                  )}
                  {message.offerAccepted !== undefined && (
                    <span className="text-xs opacity-50 mt-1 block">
                      {message.offerAccepted ? "Offre acceptée" : "Offre refusée"}
                    </span>
                  )}
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
            placeholder="Tapez votre message..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
          />
          <Button onClick={handleSendMessage}>Envoyer</Button>
        </div>
        <div className="flex justify-between w-full">
          <OfferDialog productId={4} onOfferSubmit={handleOfferSubmit} />
          <Button variant="default" className="flex-1 ml-2">
            <ShoppingCart className="mr-2 h-4 w-4" /> Acheter Maintenant
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
