'use client'

import React from 'react';
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
import { Search, ShoppingCart, User } from 'lucide-react';

const Header = () => {
  const handleSearchClick = () => {
    console.log('Search clicked');
    // Ajoute ici la logique pour le clic sur l'icône de recherche
  };

  return (
    <div className='h-full w-full p-10 flex items-center'>
      {/* Logo à gauche */}
      <div className='flex-shrink-0'>
        <Link href="/" passHref>
          <Image 
            src="/logo.png" 
            alt="logo" 
            width={100} 
            height={100} 
            className="cursor-pointer"
          />
        </Link>
      </div>

      {/* Navbar centrée */}
      <div className='flex-grow flex justify-center'>
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

      {/* Barre de recherche et icônes à droite du logo */}
      <div className='flex-grow flex items-center justify-between mx-10'>
        {/* Barre de recherche */}
        <div className='flex flex-grow items-center space-x-2'>
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

        {/* Icônes de connexion et panier */}
        <div className='flex space-x-4'>
          <User className='text-2xl cursor-pointer' />
          <ShoppingCart className='text-2xl cursor-pointer' />
        </div>
      </div>

      
    </div>
  );
};

export default Header;
