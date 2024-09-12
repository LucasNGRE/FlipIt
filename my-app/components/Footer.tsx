'use client';

import React from 'react';
import Link from 'next/link';

const Footer = () => {
  return (
    <footer className='w-full p-4 bg-gray-800 text-white flex flex-col lg:flex-row items-center justify-between'>
      {/* Left Section: FlipIt Text */}
      <div className='mb-4 lg:mb-0 lg:flex-1 flex justify-center lg:justify-start'>
        <span className='text-2xl lg:text-3xl font-extrabold tracking-wider'>FlipIt</span>
      </div>

      {/* Center Section: Social Media Links */}
      <div className='lg:flex-1 flex justify-center'>
        <div className='flex space-x-4'>
          <Link href="https://facebook.com" target="_blank" rel="noopener noreferrer" className='hover:scale-110 transition-transform duration-300 ease-out transform-gpu will-change-transform'>Facebook</Link>
          <Link href="https://twitter.com" target="_blank" rel="noopener noreferrer" className='hover:scale-110 transition-transform duration-300 ease-out transform-gpu will-change-transform'>Twitter</Link>
          <Link href="https://instagram.com" target="_blank" rel="noopener noreferrer" className='hover:scale-110 transition-transform duration-300 ease-out transform-gpu will-change-transform'>Instagram</Link>
        </div>
      </div>

      {/* Right Section: Contact, About Us, Privacy */}
      <div className='lg:flex-1 flex justify-center lg:justify-end'>
        <div className='flex space-x-4'>
          <Link href="/contact" className='hover:scale-110 transition-transform duration-300 ease-out transform-gpu will-change-transform'>Contact</Link>
          <Link href="/about" className='hover:scale-110 transition-transform duration-300 ease-out transform-gpu will-change-transform'>About Us</Link>
          <Link href="/privacy" className='hover:scale-110 transition-transform duration-300 ease-out transform-gpu will-change-transform'>Privacy Policy</Link>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
