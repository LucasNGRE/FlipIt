'use client'

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
import { Bell, CirclePlus, Mail, Search, ShoppingCart, User } from 'lucide-react';
import { ModeToggle } from './toggle.mode';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

const Header = () => {
  const { data: session, status } = useSession(); // Récupère la session
  const router = useRouter(); // Initialize router
  const [userData, setUserData] = React.useState(null);

  useEffect(() => {
    const fetchUserData = async () => {
      if (status === 'authenticated') { // Vérifie si l'utilisateur est connecté
        try {
          const response = await fetch('/api/user');
          if (!response.ok) throw new Error('Erreur lors de la récupération des données utilisateur');
          const data = await response.json();
          setUserData(data);
        } catch (error) {
          console.error('Erreur lors de la récupération des données utilisateur:', error);
        }
      }
    };
    fetchUserData();
  }, [status]); // Effectue la récupération des données lorsque le statut change

  const handleSearchClick = () => {
    console.log('Search clicked');
  };

  // Function to handle user logout
  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push('/'); // Redirect to home after logout
  };

  return (
    <div className='w-full p-4 flex items-center justify-between'>
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
      <div className="hidden lg:flex flex-shrink-0">
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

      {/* Bouton "Poster une annonce" */}
      {status === 'authenticated' && (
        <div className='mx-4'>
          <Link href="/items/add-item">
            <button className='flex items-center px-2 py-2 bg-secondary/60 text-white cursor-pointer rounded-lg hover:bg-primary'>
              <CirclePlus className='mr-2' /> {/* L'icône est toujours visible */}
              <span className='hidden lg:block'>Ajouter un article</span> {/* Le texte est caché sur les petits écrans */}
            </button>
          </Link>
        </div>
      )}

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
            {status === 'authenticated' ? (
              <>
                <DropdownMenuItem asChild>
                  <Link href="/settings" className='cursor-pointer'>Settings</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className='w-full text-left cursor-pointer'
                  >
                    Logout
                  </button>
                </DropdownMenuItem>
              </>
            ) : (
              <DropdownMenuItem asChild>
                <Link href="/login" className='cursor-pointer'>Login</Link>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
          <Bell className='text-2xl cursor-pointer' />
        {status === 'authenticated' && (
          <Link href="/inbox">
            <Mail className='text-2xl cursor-pointer' />
          </Link>
        )}
        <ModeToggle />
      </div>
    </div>
  );
};

export default Header;
