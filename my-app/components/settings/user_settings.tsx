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

const Setting = () => {
  const [activeSection, setActiveSection] = useState('Profil')
  const [userData, setUserData] = useState({
    firstName: '',
    lastName: '',
    email: '',
  })

  // Fetch user data on component mount
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await fetch('/api/user')
        if (!response.ok) throw new Error('Network response was not ok')
        const data = await response.json()
        setUserData(data)
      } catch (error) {
        console.error('Erreur lors de la récupération des données utilisateur:', error)
      }
    }
    fetchUserData()
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUserData({
      ...userData,
      [e.target.name]: e.target.value,
    })
  }

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
              <form>
                <Input
                  name="firstName"
                  placeholder="Prénom"
                  value={userData.firstName}
                  onChange={handleInputChange}
                />
              </form>
            </CardContent>
            <CardContent>
              <form>
                <Input
                  name="lastName"
                  placeholder="Nom"
                  value={userData.lastName}
                  onChange={handleInputChange}
                />
              </form>
            </CardContent>
            <CardContent>
              <form>
                <Input
                  name="email"
                  placeholder="Email Address"
                  value={userData.email}
                  disabled
                />
              </form>
            </CardContent>
            <CardFooter className="border-t px-6 py-4">
              <Button>Save</Button>
            </CardFooter>
          </Card>
        )
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
              <CardDescription>Manage your listings here.</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Add content related to your listings here */}
            </CardContent>
          </Card>
        )
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
      <Header />
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
