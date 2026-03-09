import React from 'react';

interface MosaicLogoProps {
  className?: string;
  size?: number;
}

export const MosaicLogo: React.FC<MosaicLogoProps> = ({ className = "", size = 40 }) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Geometric Mosaic M */}
      <path d="M20 80L20 20L50 50L80 20L80 80" stroke="currentColor" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 20L35 35L20 50V20Z" fill="currentColor" fillOpacity="0.3" />
      <path d="M80 20L65 35L80 50V20Z" fill="currentColor" fillOpacity="0.3" />
      <path d="M50 50L35 35H65L50 50Z" fill="currentColor" fillOpacity="0.5" />
    </svg>
  );
};
