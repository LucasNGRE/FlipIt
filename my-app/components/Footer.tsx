'use client';

import React from 'react';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { Facebook, Instagram, Twitter } from 'lucide-react';

const Footer = () => {
  const { theme } = useTheme();

  // Define banner colors based on the current theme
  const bannerStyle = {
    backgroundColor: theme === 'dark' ? '#4a4a4a' : '#000000', // Dark or light color
    height: '1px', // Adjust the height as needed
    width: '100%', // Full width
  };

  return (
    <>
    <div style={bannerStyle}></div> {/* Dynamic Banner */}
    <footer className="w-full p-4 flex flex-col lg:flex-row items-center justify-between bg-background text-foreground">
      {/* Left Section: FlipIt Text */}
      <div className="mb-4 lg:mb-0 lg:flex-1 flex justify-center lg:justify-start">
        <span className="text-2xl lg:text-3xl font-extrabold tracking-wider">
          <Link href="/" className="hover:scale-110 transition-transform duration-300 ease-out transform-gpu will-change-transform">
            FlipIt
          </Link>
        </span>
      </div>

      {/* Center Section: Social Media Links */}
      <div className="lg:flex-1 flex justify-center">
        <div className="flex space-x-4">
          <Link href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="hover:scale-110 transition-transform duration-300 ease-out transform-gpu will-change-transform">
            <Facebook className='w-6 h-6' />
          </Link>
          <Link href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="hover:scale-110 transition-transform duration-300 ease-out transform-gpu will-change-transform">
            <Twitter className='w-6 h-6' />
          </Link>
          <Link href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="hover:scale-110 transition-transform duration-300 ease-out transform-gpu will-change-transform">
            <Instagram className='w-6 h-6' />
          </Link>
        </div>
      </div>

      {/* Right Section: Contact, About Us, Privacy */}
      <div className="lg:flex-1 flex justify-center lg:justify-end">
        <div className="flex space-x-4">
          <Link href="/contact" className="hover:scale-110 transition-transform duration-300 ease-out transform-gpu will-change-transform">
            Contact
          </Link>
          <Link href="/about" className="hover:scale-110 transition-transform duration-300 ease-out transform-gpu will-change-transform">
            About Us
          </Link>
          <Link href="/privacy" className="hover:scale-110 transition-transform duration-300 ease-out transform-gpu will-change-transform">
            Privacy Policy
          </Link>
        </div>
      </div>
    </footer>
    </>);
};

export default Footer;
