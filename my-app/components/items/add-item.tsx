"use client"

import { useState } from "react"
import { useRouter } from "next/router" // Pour redirection future
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { ImagePlus, X } from "lucide-react"
import Image from "next/image"

type FormData = {
  title: string
  brand: string
  price: string
  size: string
  condition: string
  photos: string[]
}

const TOTAL_STEPS = 7

export default function AddItem() {
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState<FormData>({
    title: "",
    brand: "",
    price: "",
    size: "",
    condition: "",
    photos: []
  })
//   const router = useRouter() // Ajout du hook pour redirection

  const updateFormData = (field: keyof FormData, value: string | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleNext = () => {
    if (step < TOTAL_STEPS) setStep(prev => prev + 1)
  }

  const handlePrevious = () => {
    if (step > 1) setStep(prev => prev - 1)
  }

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) {
      const newPhotos = Array.from(files).map(file => URL.createObjectURL(file))
      updateFormData("photos", [...formData.photos, ...newPhotos].slice(0, 3))
    }
  }

  const removePhoto = (index: number) => {
    const newPhotos = formData.photos.filter((_, i) => i !== index)
    updateFormData("photos", newPhotos)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      // Envoie des données au backend
      const response = await fetch('/api/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
  
      if (!response.ok) {
        throw new Error('Erreur lors de la publication de l\'annonce');
      }
  
      const result = await response.json();
      console.log('Annonce postée:', result);
  
      // Rediriger vers une page de confirmation ou profil
      // router.push("/profil"); // Décommente cela lorsque tu es prêt à rediriger
  
      // Optionnel : réinitialiser le formulaire si nécessaire
      // setFormData({
      //   title: "",
      //   brand: "",
      //   price: "",
      //   size: "",
      //   condition: "",
      //   photos: []
      // });
  
    } catch (error) {
      console.error('Erreur:', error);
      alert('Une erreur est survenue. Veuillez réessayer.');
    }
  }
  


  const progress = ((step - 1) / (TOTAL_STEPS - 1)) * 100

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-card rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Déposer votre annonce</h2>
      <Progress value={progress} className="mb-4" />
      <form onSubmit={handleSubmit}>
        <Card>
          <CardContent className="pt-6">
          {step === 1 && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Titre</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => updateFormData("title", e.target.value)}
                    placeholder="Entrez le titre de l&apos;annonce"
                    required
                  />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="brand">Marque</Label>
                  <Input
                    id="brand"
                    value={formData.brand}
                    onChange={(e) => updateFormData("brand", e.target.value)}
                    placeholder="Entrez la marque"
                    required
                  />
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="price">Prix</Label>
                  <Input
                    id="price"
                    type="number"
                    min="0"
                    value={formData.price}
                    onChange={(e) => updateFormData("price", e.target.value)}
                    placeholder="Entrez le prix"
                    required
                  />
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="size">Taille</Label>
                  <Input
                    id="size"
                    value={formData.size}
                    onChange={(e) => updateFormData("size", e.target.value)}
                    placeholder="Entrez la taille"
                    required
                  />
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="condition">État</Label>
                  <Select onValueChange={(value) => updateFormData("condition", value)} value={formData.condition}>
                    <SelectTrigger id="condition">
                      <SelectValue placeholder="Sélectionnez l'état" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">Neuf</SelectItem>
                      <SelectItem value="like-new">Comme neuf</SelectItem>
                      <SelectItem value="good">Bon état</SelectItem>
                      <SelectItem value="fair">État correct</SelectItem>
                      <SelectItem value="poor">Mauvais état</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {step === 6 && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="photo-upload">Télécharger des photos (Max 3)</Label>
                  <div className="mt-2 flex items-center space-x-4">
                    <Label htmlFor="photo-upload" className="cursor-pointer">
                      <div className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                        <ImagePlus className="w-8 h-8 text-gray-400" />
                      </div>
                      <Input
                        id="photo-upload"
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={handlePhotoUpload}
                        disabled={formData.photos.length >= 3}
                      />
                    </Label>
                    {formData.photos.map((photo, index) => (
                      <div key={index} className="relative">
                        <Image
                          src={photo}
                          alt={`Photo ${index + 1}`}
                          width={96} 
                          height={96} 
                          objectFit="cover"
                          className="rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => removePhoto(index)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                          aria-label={`Supprimer la photo ${index + 1}`}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {step === 7 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Vérifiez votre annonce</h3>
                <div>
                  <p><strong>Titre:</strong> {formData.title}</p>
                  <p><strong>Marque:</strong> {formData.brand}</p>
                  <p><strong>Prix:</strong> {formData.price} €</p>
                  <p><strong>Taille:</strong> {formData.size}</p>
                  <p><strong>État:</strong> {formData.condition}</p>
                  <p><strong>Photos:</strong> {formData.photos.length} téléchargées</p>
                </div>
                <div className="flex space-x-2">
                  {formData.photos.map((photo, index) => (
                    <Image
                      key={index}
                      src={photo}
                      alt={`Photo ${index + 1}`}
                      width={80}
                      height={80}
                      objectFit="cover"
                      className="rounded-lg"
                    />
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-6 flex justify-between">
          <Button type="button" onClick={handlePrevious} disabled={step === 1}>
            Précédent
          </Button>
          {step < TOTAL_STEPS ? (
            <Button type="button" onClick={handleNext}>
              Suivant
            </Button>
          ) : (
            <Button type="submit">Publier l&apos;annonce</Button>
          )}
        </div>
      </form>
    </div>
  )
}
