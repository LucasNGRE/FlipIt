"use client"

import React, { useState, useEffect } from 'react'
import Header from '@/components/Header'
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import Link from 'next/link'

const Setting = () => {
  const [activeSection, setActiveSection] = useState('Profil')
  const [userData, setUserData] = useState({
    firstName: '',
    lastName: '',
    email: '',
  })

  const [products, setProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState<boolean>(false);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [updateMessage, setUpdateMessage] = useState<string | null>(null);
  
 // Fetch user data on component mount
 useEffect(() => {
  const fetchUserData = async () => {
    try {
      const response = await fetch('/api/user');
      if (!response.ok) throw new Error('La réponse du réseau n\'était pas correcte');
      const data = await response.json();
      console.log('Données utilisateur :', data);
      // Assurez-vous de prendre le premier utilisateur du tableau
      setUserData(data[0]); // Utiliser data[0] pour accéder au premier utilisateur
    } catch (error) {
      console.error('Erreur lors de la récupération des données utilisateur :', error);
    }
  };
  fetchUserData();
}, []);

  useEffect(() => {
    if (activeSection === 'Annonces') {
      const fetchUserProducts = async () => {
        setLoadingProducts(true);
        setProductsError(null);
        try {
          const response = await fetch('/api/products');
          if (!response.ok) throw new Error('Failed to fetch products');
          const data = await response.json();
          setProducts(data);
        } catch (error) {
          console.error('Erreur lors de la récupération des annonces:', error);
          setProductsError('Erreur lors de la récupération des annonces.');
        } finally {
          setLoadingProducts(false);
        }
      };
      fetchUserProducts();
    }
  }, [activeSection]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUserData({
      ...userData,
      [e.target.name]: e.target.value,
    })
  }
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/user', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      if (!response.ok) throw new Error('Failed to update user data');
      const updatedUser = await response.json();
      setUserData(updatedUser);
      setUpdateMessage('Données mises à jour avec succès !');
      // Disparaître le message après 3 secondes
      setTimeout(() => {
        setUpdateMessage(null); // Réinitialiser le message
    }, 3000);
    } catch (error) {
      console.error('Erreur lors de la mise à jour des données utilisateur:', error);
      setUpdateMessage('Erreur lors de la mise à jour des données utilisateur.');
    }
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'Profil':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Profil</CardTitle>
              <CardDescription>Manage your profile information.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSave}>
                <Input className='mb-4'
                  name="firstName"
                  placeholder="Prénom"
                  value={userData.firstName}
                  onChange={handleInputChange}
                  required
                />
                <Input className='mb-4'
                  name="lastName"
                  placeholder="Nom"
                  value={userData.lastName}
                  onChange={handleInputChange}
                  required
                />
                <Input className='mb-4'
                  name="email"
                  placeholder="Email Address"
                  value={userData.email}
                  disabled
                />
                <CardFooter className="border-t px-6 py-4">
                  <Button type="submit">Save</Button>
                </CardFooter>
              </form>
              {updateMessage && <p>{updateMessage}</p>}
            </CardContent>
          </Card>
        );
      case 'Paramètres de compte':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Paramètres de compte</CardTitle>
              <CardDescription>Update your account settings here.</CardDescription>
            </CardHeader>
            <CardContent>
              <form>
                <Input placeholder="Email Address" />
              </form>
            </CardContent>
            <CardFooter className="border-t px-6 py-4">
              <Button>Save</Button>
            </CardFooter>
          </Card>
        )
      case 'Annonces':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Mes Annonces</CardTitle>
              <CardDescription>Gère vos annonces ici.</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingProducts ? (
                <p>Chargement des annonces...</p>
              ) : productsError ? (
                <p>{productsError}</p>
              ) : products.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {products.map((product) => (
                    <Card key={product.id} className="shadow-lg">
                      <CardHeader>
                        <CardTitle className="text-lg font-bold">{product.title}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-gray-600 mb-2">{product.description}</p>
                        <p className="text-xl font-semibold text-primary mb-4">Prix: {product.price} €</p>
                      </CardContent>
                      <CardFooter className="flex justify-between">
                        <Link href={`/payment?amount=${product.price}&currency=EUR`}>
                          <Button variant="default" className="mr-2">
                            Acheter
                          </Button>
                        </Link>
                        <Link href="/inbox">
                          <Button variant="outline">
                            Message
                          </Button>
                        </Link>
                      </CardFooter>

                    </Card>
                  ))}
                </div>
              ) : (
                <p>Aucune annonce trouvée.</p>
              )}
            </CardContent>
          </Card>
        );
      case 'Transactions':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Mes Transactions</CardTitle>
              <CardDescription>Track your transactions here.</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Add content related to your transactions here */}
            </CardContent>
          </Card>
        )
      case 'Sécurité':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Sécurité</CardTitle>
              <CardDescription>Manage your security settings.</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Add content related to security settings here */}
            </CardContent>
          </Card>
        )
      default:
        return null
    }
  }

  return (
    <div>

      <main className="flex min-h-[calc(100vh_-_theme(spacing.16))] flex-1 flex-col gap-4 bg-muted/40 p-4 md:gap-8 md:p-10">
        <div className="mx-auto grid w-full max-w-6xl gap-2">
          <h1 className="text-3xl font-semibold">Settings</h1>
        </div>
        <div className="mx-auto grid w-full max-w-6xl items-start gap-6 md:grid-cols-[180px_1fr] lg:grid-cols-[250px_1fr]">
          <nav className="grid gap-4 text-sm text-muted-foreground">
            <button onClick={() => setActiveSection('Profil')} className={activeSection === 'Profil' ? 'font-semibold text-primary' : ''}>
              Profil
            </button>
            <button onClick={() => setActiveSection('Paramètres de compte')} className={activeSection === 'Paramètres de compte' ? 'font-semibold text-primary' : ''}>
              Paramètres de compte
            </button>
            <button onClick={() => setActiveSection('Annonces')} className={activeSection === 'Annonces' ? 'font-semibold text-primary' : ''}>
              Annonces
            </button>
            <button onClick={() => setActiveSection('Transactions')} className={activeSection === 'Transactions' ? 'font-semibold text-primary' : ''}>
              Transactions
            </button>
            <button onClick={() => setActiveSection('Sécurité')} className={activeSection === 'Sécurité' ? 'font-semibold text-primary' : ''}>
              Sécurité
            </button>
          </nav>
          <div className="grid gap-6">
            {renderContent()}
          </div>
        </div>
      </main>
    </div>
  )
}

export default Setting
