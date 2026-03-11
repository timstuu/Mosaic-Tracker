import React from 'react';

interface MosaicLogoProps {
  className?: string;
  size?: number;
}

export const MosaicLogo: React.FC<MosaicLogoProps> = ({ className = "", size = 40 }) => {
  return (
    <img 
      src="/logo.svg" 
      alt="Mosaic Logo" 
      width={size} 
      height={size} 
      className={`object-cover ${className}`}
      referrerPolicy="no-referrer"
    />
  );
};
