"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { EuroIcon } from "lucide-react";

type OfferDialogProps = {
  productId: number;
  onOfferSubmit: (price: string) => void;
};

export function OfferDialog({ productId, onOfferSubmit }: OfferDialogProps) {
  const [offerPrice, setOfferPrice] = useState("");
  const [open, setOpen] = useState(false);

  const handleSubmit = async () => {
    try {
      const response = await fetch("/api/offer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ offerPrice, productId }),
      });

      if (!response.ok) {
        throw new Error("Échec de la soumission de l'offre");
      }

      const data = await response.json();
      console.log("Offre soumise avec succès :", data);

      // Appeler le callback pour ajouter l'offre au chat
      onOfferSubmit(offerPrice);
      
      setOfferPrice(""); // Réinitialiser le champ après soumission
      setOpen(false); // Fermer le dialogue après soumission
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full flex-1 mr-2">
          <EuroIcon className="mr-2 h-4 w-4" /> Faire une offre
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
            value={offerPrice}
            onChange={(e) => setOfferPrice(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit}>Soumettre l&apos;offre</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
