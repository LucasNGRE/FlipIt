'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { X, Upload, Trash2, Save } from 'lucide-react'

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"

interface Product {
  id: string
  title: string
  brand: string
  price: number
  description: string
  size: string
  images: { url: string }[]
}

export default function EditProductPage() {
  const router = useRouter()
  const { id } = useParams()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [brand, setBrand] = useState('')
  const [price, setPrice] = useState(0)
  const [description, setDescription] = useState('')
  const [size, setSize] = useState('') // Ajout de l'état pour la taille
  const [photos, setPhotos] = useState<(string | { url: string })[]>([])
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await fetch(`/api/items/${id}`)
        if (!response.ok) {
          throw new Error('Failed to fetch product')
        }
        const data: Product = await response.json()
        setProduct(data)
        setTitle(data.title)
        setBrand(data.brand)
        setPrice(data.price)
        setDescription(data.description)
        setSize(data.size) // Initialisation de la taille
        setPhotos(data.images.map(image => image.url))
        setLoading(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred')
        setLoading(false)
      }
    }

    if (id) {
      fetchProduct()
    }
  }, [id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const updatedProduct = {
      id,
      title,
      brand,
      price,
      description,
      size, // Ajout de la taille dans l'objet à envoyer
      images: photos.map(photo => (typeof photo === 'object' ? photo.url : photo)) // Assure-toi que chaque image est une chaîne de caractères
    };

    try {
      const response = await fetch(`/api/items/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedProduct),
      });

      if (!response.ok) {
        throw new Error('Failed to update product');
      }

      router.push(`/article/${id}`);
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      setError('Erreur lors de la mise à jour du produit');
    }
  };

  const handleAddPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newPhotos = Array.from(e.target.files).map(file => URL.createObjectURL(file))
      setPhotos(prevPhotos => [...prevPhotos, ...newPhotos])
    }
  }

  const handleRemovePhoto = (index: number) => {
    setPhotos(prevPhotos => prevPhotos.filter((_, i) => i !== index))
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files) {
      const newPhotos = Array.from(e.dataTransfer.files).map(file => URL.createObjectURL(file))
      setPhotos(prevPhotos => [...prevPhotos, ...newPhotos])
    }
  }

  if (loading) return <div className="flex justify-center items-center h-screen">Chargement...</div>
  if (error) return <div className="flex justify-center items-center h-screen text-red-500">Erreur: {error}</div>

  return (
    <div className="container mx-auto p-4 max-w-3xl">
      <h1 className="text-3xl font-bold mb-6">Modifier l&apos;annonce</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Titre</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div>
                <Label htmlFor="brand">Marque</Label>
                <Input
                  id="brand"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  required
                />
              </div>

              <div>
                <Label htmlFor="price">Prix</Label>
                <Input
                  id="price"
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(parseFloat(e.target.value))}
                  required
                />
              </div>

              <div>
                <Label htmlFor="size">Taille</Label>
                <Input
                  id="size"
                  value={size}
                  onChange={(e) => setSize(e.target.value)} // Ajout du gestionnaire pour la taille
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  className="h-32"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <Label>Photos</Label>
            <div
              className={`mt-2 border-2 border-dashed rounded-lg p-4 text-center ${isDragging ? 'border-primary' : 'border-gray-300'}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-sm text-gray-600">Glissez et déposez des images ici, ou</p>
              <Input
                type="file"
                accept="image/*"
                multiple
                onChange={handleAddPhoto}
                className="hidden"
                id="file-upload"
              />
              <Label htmlFor="file-upload" className="mt-2 cursor-pointer inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/90">
                Sélectionnez des fichiers
              </Label>
            </div>

            {photos.length > 0 && (
              <div className="mt-4 grid grid-cols-3 gap-4">
                {photos.map((photo, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={typeof photo === 'string' ? photo : photo.url}
                      alt={`Product image ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                    <button
                      onClick={() => handleRemovePhoto(index)}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end space-x-4">
          <Button variant="outline" onClick={() => router.back()}>
            Annuler
          </Button>
          <Button type="submit">
            <Save className="mr-2 h-4 w-4" /> Sauvegarder
          </Button>
        </div>
      </form>
    </div>
  )
}
