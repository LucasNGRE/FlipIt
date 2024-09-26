"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"; // Assurez-vous que ces composants existent dans ton projet
import { DollarSign } from "lucide-react";

type OfferDialogProps = {
  onOfferSubmit: (price: string) => void; // Callback pour gérer la soumission du prix
};

export function OfferDialog({ onOfferSubmit }: OfferDialogProps) {
  const [price, setPrice] = useState("");

  const handleSubmit = () => {
    onOfferSubmit(price);
    setPrice(""); // Reset le champ après soumission
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex-1 mr-2">
          <DollarSign className="mr-2 h-4 w-4" /> Make an Offer
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Proposez votre prix</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Input
            type="number"
            placeholder="Entrez votre prix"
            min="0"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit}>Soumettre l&apos;offre</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
