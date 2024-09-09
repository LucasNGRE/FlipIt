'use client';

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
import { ModeToggle } from './toggle.mode';

const Header = () => {
  const handleSearchClick = () => {
    console.log('Search clicked');
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
      <div className='hidden lg:flex flex-shrink-0'>
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
      <div className='flex items-center space-x-4'>
        <Link href="/login" passHref>
          <User className='text-2xl cursor-pointer'/>
        </Link>
        <Link href="/cart" passHref>
          <ShoppingCart className='text-2xl cursor-pointer' />
        </Link>
        <ModeToggle />
      </div>
    </div>
  );
};

export default Header;
