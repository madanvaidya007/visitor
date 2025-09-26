import React from 'react';

interface CustomLogoProps {
  className?: string;
  alt?: string;
}

export function CustomLogo({ className = "h-6 w-6", alt = "Logo" }: CustomLogoProps) {
  return (
    <img 
      src="https://i.postimg.cc/63zBmms0/image.png" 
      alt={alt}
      className={`${className} border-none outline-none`}
      style={{ objectFit: 'contain', border: 'none', outline: 'none' }}
    />
  );
}