import React from 'react';

interface MosaicLogoProps {
  className?: string;
  size?: number;
}

export const MosaicLogo: React.FC<MosaicLogoProps> = ({ className = "", size = 40 }) => {
  return (
    <img 
      src="favicon-32x32.png" 
      alt="Mosaic Logo" 
      width={size} 
      height={size} 
      className={`object-cover ${className}`}
      referrerPolicy="no-referrer"
    />
  );
};
