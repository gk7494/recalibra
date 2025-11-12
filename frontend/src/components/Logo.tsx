import React from 'react';
import './Logo.css';
import '../App.css';

const Logo: React.FC = () => {
  return (
    <div className="logo-container">
      <svg 
        className="logo-icon" 
        viewBox="0 0 32 32" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect 
          width="32" 
          height="32" 
          rx="6" 
          fill="#0066cc"
        />
        <path 
          d="M16 8 L24 16 L16 24 L8 16 Z" 
          fill="white" 
          opacity="0.95"
        />
        <circle 
          cx="16" 
          cy="16" 
          r="3" 
          fill="#0066cc"
        />
      </svg>
      <div className="logo-text">
        <span className="logo-name">Recalibra</span>
        <span className="logo-tagline" style={{ display: 'none' }}></span>
      </div>
    </div>
  );
};

export default Logo;

