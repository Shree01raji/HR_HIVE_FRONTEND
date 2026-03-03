import React, { useState } from 'react';

const Logo = ({ className = "", onClick, showTagline = true, size = "md", dark = false }) => {
  const [beeImageError, setBeeImageError] = useState(false);
  const sizeClasses = {
    sm: "w-10 h-10",
    md: "w-12 h-12",
    lg: "w-16 h-16",
    xl: "w-20 h-20"
  };

  const textSizeClasses = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-2xl",
    xl: "text-3xl"
  };

  const taglineSizeClasses = {
    sm: "text-[8px]",
    md: "text-[10px]",
    lg: "text-xs",
    xl: "text-sm"
  };

  return (
    <div 
      className={`flex items-center space-x-3 ${onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''} ${className}`}
      onClick={onClick}
    >
      {/* Hexagonal Logo SVG */}
      {/* <svg 
        width={size === "sm" ? 40 : size === "md" ? 48 : size === "lg" ? 64 : 80}
        height={size === "sm" ? 40 : size === "md" ? 48 : size === "lg" ? 64 : 80}
        viewBox="0 0 100 100"
        className="flex-shrink-0"
      > */}
        {/* Outer hexagon - dark blue or white outline */}
        {/* <polygon
          points="50,5 90,25 90,75 50,95 10,75 10,25"
          fill="none"
          stroke={dark ? "#ffffff" : "#1e3a8a"}
          strokeWidth="4"
        /> */}
        {/* Middle hexagon - dark blue or white outline */}
        {/* <polygon
          points="50,15 80,30 80,70 50,85 20,70 20,30"
          fill="none"
          stroke={dark ? "#ffffff" : "#1e3a8a"}
          strokeWidth="2.5"
        /> */}
        {/* Inner hexagon - dark blue or white outline */}
        {/* <polygon
          points="50,25 70,35 70,65 50,75 30,65 30,35"
          fill="none"
          stroke={dark ? "#ffffff" : "#1e3a8a"}
          strokeWidth="2"
        /> */}
        {/* Center hexagon - gold fill */}
        {/* <polygon
          points="50,35 60,40 60,60 50,65 40,60 40,40"
          fill="#d4af37"
          stroke={dark ? "#ffffff" : "#b8941f"}
          strokeWidth="1"
        />
      </svg> */}
      
      {/* Bee between logo and text */}
      {/* {!beeImageError ? (
        <img
          src="/images/bee.png"
          alt="Bee"
          className="flex-shrink-0"
          style={{ 
            width: size === "sm" ? '32px' : size === "md" ? '40px' : size === "lg" ? '48px' : '56px',
            height: size === "sm" ? '32px' : size === "md" ? '40px' : size === "lg" ? '48px' : '56px',
            objectFit: 'contain',
            display: 'block'
          }}
          onError={() => setBeeImageError(true)}
        />
      ) : (
        <div 
          className="flex-shrink-0 flex items-center justify-center"
          style={{ 
            width: size === "sm" ? '32px' : size === "md" ? '40px' : size === "lg" ? '48px' : '56px',
            height: size === "sm" ? '32px' : size === "md" ? '40px' : size === "lg" ? '48px' : '56px',
            fontSize: size === "sm" ? '24px' : size === "md" ? '32px' : size === "lg" ? '40px' : '48px'
          }}
        >
          🐝
        </div>
      )} */}
      
      {/* Text */}
      {/* <div className="flex flex-col"> */}
        {/* <span className={`font-serif font-bold ${dark ? 'text-white' : 'text-blue-900'} ${textSizeClasses[size]}`}>
          HR-Hive
        </span> */}
        {/* {showTagline && (
          <span className={`font-sans ${dark ? 'text-gray-200' : 'text-blue-900'} leading-tight ${taglineSizeClasses[size]}`}>
            Collaborative Intelligence<br />for the Future of HR
          </span>
        )} */}
      {/* </div> */}
    </div>
  );
};

export default Logo;

