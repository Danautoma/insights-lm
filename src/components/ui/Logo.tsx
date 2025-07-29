
import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const Logo = ({ size = 'md', className = '' }: LogoProps) => {
  return (
    <img 
      src="/dossie-ai-logo.png" 
      alt="Dossiê AI" 
      className={`h-8 w-auto object-contain ${className}`}
      style={{ height: '64px' }}
    />
  );
};

export default Logo;
