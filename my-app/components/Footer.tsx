'use client';

import React from 'react';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { Facebook, Instagram, Twitter } from 'lucide-react';
import TestButton from './TestButtonApi';

const Footer = () => {
  const { theme } = useTheme();

  // Define banner colors based on the current theme
  const bannerStyle = {
    backgroundColor: theme === 'dark' ? '#9ea09d' : '#000000',
    height: '1px',
    width: '100%',
  };

  return (
    <>
      <div style={bannerStyle}></div> {/* Dynamic Banner */}
      <footer className="w-full py-2 lg:py-4 flex flex-col lg:flex-row items-center justify-between bg-background text-foreground">
        {/* Left Section: FlipIt Text */}
        <div className="mb-4 lg:mb-0 lg:flex-1 flex justify-center lg:justify-start">
          <span className="text-xl lg:text-2xl font-extrabold tracking-wider">
            <Link href="/" className="hover:scale-110 transition-transform duration-300 ease-out transform-gpu will-change-transform">
              FlipIt
            </Link>
          </span>
        </div>
        <div>
          <TestButton />
        </div>

        {/* Center Section: Social Media Links */}
        <div className="lg:flex-1 flex justify-center">
          <div className="flex space-x-3 lg:space-x-4">
            <Link href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="hover:scale-110 transition-transform duration-300 ease-out transform-gpu will-change-transform">
              <Facebook className='w-5 h-5 lg:w-6 lg:h-6' />
            </Link>
            <Link href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="hover:scale-110 transition-transform duration-300 ease-out transform-gpu will-change-transform">
              <Twitter className='w-5 h-5 lg:w-6 lg:h-6' />
            </Link>
            <Link href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="hover:scale-110 transition-transform duration-300 ease-out transform-gpu will-change-transform">
              <Instagram className='w-5 h-5 lg:w-6 lg:h-6' />
            </Link>
          </div>
        </div>

        {/* Right Section: Contact, About Us, Privacy */}
        <div className="lg:flex-1 flex justify-center lg:justify-end">
          <div className="flex space-x-3 lg:space-x-4">
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
    </>
  );
};

export default Footer;
