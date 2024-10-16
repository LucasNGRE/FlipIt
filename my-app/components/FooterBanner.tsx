"use client";
import { useTheme } from 'next-themes';
import React, { useEffect, useState } from 'react';

const FooterBanner = () => {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Ensures the component waits for the theme to be available on the client
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null; // Prevents rendering until the theme is mounted
  }

  const bannerStyle = {
    backgroundColor: theme === 'dark' ? '#9ea09d' : '#000000',
    height: '1px',
    width: '100%',
  };

  return <div style={bannerStyle}></div>;
};

export default FooterBanner;
