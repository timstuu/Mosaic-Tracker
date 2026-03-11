import React, { useState } from 'react';

interface AppLogoProps {
  className?: string;
  size?: number;
}

export const AppLogo: React.FC<AppLogoProps> = ({ className = "h-10 w-10", size }) => {
  const [imageError, setImageError] = useState(false);

  if (imageError) {
    return (
      <div 
        className={`bg-blue-600 text-white font-bold flex items-center justify-center rounded-lg shadow-sm ${className}`}
        style={size ? { width: size, height: size } : {}}
      >
        M
      </div>
    );
  }

  return (
    <img 
      src="./apple-touch-icon.png" 
      alt="App Logo" 
      width={size} 
      height={size} 
      className={`object-cover ${className}`}
      onError={() => setImageError(true)}
      referrerPolicy="no-referrer"
    />
  );
};
