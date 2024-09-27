'use client';

import React, { useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarTrigger,
} from "@/components/ui/menubar";
import { Input } from './ui/input';
import { Mail, Search, ShoppingCart, User } from 'lucide-react';
import { ModeToggle } from './toggle.mode';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { signOut, useSession } from 'next-auth/react';

const Header = () => {
  
  const [userData, setUserData] = React.useState(null)
  const [isConnected, setIsConnected] = React.useState(false)
  // Fetch user data on component mount
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await fetch('/api/user')
        if (!response.ok) return;
        const data = await response.json()
        setUserData(data);
        setIsConnected(true);

        console.log('User data:', data)
      } catch (error) {
        console.error('Erreur lors de la récupération des données utilisateur:', error)
      }
    }
    fetchUserData()
  }, [])

  const handleSearchClick = () => {
    console.log('Search clicked');
  };

  const handleLogout = async () => {
    await signOut({ redirect: false });
    // Rediriger l'utilisateur vers la page d'accueil après la déconnexion
    window.location.href = '/';
  };

  return (
    <div className='h-full w-full p-4 flex items-center justify-between'>
      {/* Icône burger pour petits écrans */}
      <div className='lg:hidden flex items-center'>
        <Menubar>
          <MenubarMenu>
            <MenubarTrigger>
              <div className='text-2xl cursor-pointer'>☰</div>
            </MenubarTrigger>
            <MenubarContent>
              <MenubarItem>Vêtements</MenubarItem>
              <MenubarItem>Chaussures</MenubarItem>
              <MenubarItem>Accessoires</MenubarItem>
              <MenubarItem>Skateboard</MenubarItem>
            </MenubarContent>
          </MenubarMenu>
        </Menubar>
      </div>

      {/* Logo à gauche pour grands écrans */}
      <div className="mb-4 lg:mb-0 lg:flex-1 flex justify-center lg:justify-start">
        <span className="text-2xl lg:text-3xl font-extrabold tracking-wider">
          <Link href="/" className="hover:scale-110 transition-transform duration-300 ease-out transform-gpu will-change-transform">
            FlipIt
          </Link>
        </span>
      </div>

      {/* Navbar pour grands écrans */}
      <div className='hidden lg:flex flex-grow justify-center'>
        <Menubar>
          <MenubarMenu>
            <MenubarTrigger>Vêtements</MenubarTrigger>
            <MenubarContent>
              <MenubarItem>T-shirts</MenubarItem>
              <MenubarItem>Hoodies</MenubarItem>
              <MenubarItem>Vestes</MenubarItem>
              <MenubarItem>Chemises</MenubarItem>
              <MenubarSeparator />
              <MenubarItem>Pantalons</MenubarItem>
              <MenubarItem>Shorts</MenubarItem>
            </MenubarContent>
          </MenubarMenu>

          <MenubarMenu>
            <MenubarTrigger>Chaussures</MenubarTrigger>
            <MenubarContent>
              <MenubarItem>Skate shoes</MenubarItem>
              <MenubarItem>Sneakers</MenubarItem>
            </MenubarContent>
          </MenubarMenu>
          
          <MenubarMenu>
            <MenubarTrigger>Accessoires</MenubarTrigger>
            <MenubarContent>
              <MenubarItem>Casquette</MenubarItem>
              <MenubarItem>Bonnet</MenubarItem>
              <MenubarItem>Lunettes de soleil</MenubarItem>
              <MenubarItem>Sac</MenubarItem>
              <MenubarItem>Sac à dos</MenubarItem>
            </MenubarContent>
          </MenubarMenu>

          <MenubarMenu>
            <MenubarTrigger>Skateboard</MenubarTrigger>
            <MenubarContent>
              <MenubarItem>Planches de skate</MenubarItem>
              <MenubarItem>Trucks</MenubarItem>
              <MenubarItem>Roues</MenubarItem>
              <MenubarItem>Roulements de skate</MenubarItem>
              <MenubarItem>Grips</MenubarItem>
              <MenubarItem>Visserie</MenubarItem>
            </MenubarContent>
          </MenubarMenu>
        </Menubar>
      </div>

      {/* Barre de recherche centrée */}
      <div className='flex-grow flex items-center justify-center mx-4'>
        <Input
          type="text"
          placeholder="Rechercher..."
          className="border p-2 rounded-lg w-full max-w-md"
        />
        <Search
          className='text-2xl cursor-pointer ml-2'
          onClick={handleSearchClick}
        />
      </div>

      {/* Icônes de connexion, panier et mode */}
      <div className='relative flex items-center space-x-4'>
        <DropdownMenu>
          <DropdownMenuTrigger>
            <User className='text-2xl cursor-pointer' />
          </DropdownMenuTrigger>
          <DropdownMenuContent className='w-48 rounded-lg shadow-lg'>
            {isConnected ? (
              <>
                <DropdownMenuItem asChild>
                  <Link href="/settings">Settings</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className='w-full text-left'
                  >
                    Logout
                  </button>
                </DropdownMenuItem>
              </>
            ) : (
              <DropdownMenuItem asChild>
                <Link href="/login">Login</Link>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        <Link href="/cart">
          <ShoppingCart className='text-2xl cursor-pointer' />
        </Link>
        <Link href="/inbox">
          <Mail className='text-2xl cursor-pointer' />
        </Link>
        <ModeToggle />
      </div>
    </div>
  );
};

export default Header;