import React from 'react';

const HoneycombBackground = () => {
  return (
    <div 
      className="fixed inset-0 pointer-events-none z-0"
      style={{ 
        background: 'linear-gradient(135deg, rgba(0,0,0,0.02) 0%, rgba(0,0,0,0.05) 100%)'
      }}
    >
      {/* SVG Honeycomb Pattern - Gold Style */}
      <svg 
        width="100%" 
        height="100%" 
        className="absolute inset-0"
        style={{ opacity: 0.12 }}
      >
        <defs>
          {/* Gold gradient */}
          <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFD700" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#FFA500" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#FFD700" stopOpacity="0.8" />
          </linearGradient>
          
          {/* Pattern with multiple hexagons */}
          <pattern 
            id="honeycombPattern" 
            x="0" 
            y="0" 
            width="120" 
            height="104" 
            patternUnits="userSpaceOnUse"
          >
            {/* Multiple hexagons to create honeycomb effect */}
            {/* Center hexagon */}
            <path 
              d="M60,0 L120,26 L120,78 L60,104 L0,78 L0,26 Z" 
              fill="none" 
              stroke="url(#goldGradient)" 
              strokeWidth="1.2"
            />
            {/* Right hexagon */}
            <path 
              d="M150,26 L210,52 L210,104 L150,130 L90,104 L90,52 Z" 
              fill="none" 
              stroke="url(#goldGradient)" 
              strokeWidth="1.2"
            />
            {/* Left hexagon */}
            <path 
              d="M-30,26 L30,52 L30,104 L-30,130 L-90,104 L-90,52 Z" 
              fill="none" 
              stroke="url(#goldGradient)" 
              strokeWidth="1.2"
            />
            {/* Top hexagon */}
            <path 
              d="M60,-52 L120,-26 L120,26 L60,52 L0,26 L0,-26 Z" 
              fill="none" 
              stroke="url(#goldGradient)" 
              strokeWidth="1.2"
            />
            {/* Bottom hexagon */}
            <path 
              d="M60,104 L120,130 L120,182 L60,208 L0,182 L0,130 Z" 
              fill="none" 
              stroke="url(#goldGradient)" 
              strokeWidth="1.2"
            />
            
            {/* Dots/Nodes at hexagon vertices with glow effect */}
            <circle cx="60" cy="52" r="2" fill="#FFD700" opacity="0.7">
              <animate attributeName="opacity" values="0.5;0.9;0.5" dur="3s" repeatCount="indefinite" />
            </circle>
            <circle cx="120" cy="26" r="2" fill="#FFD700" opacity="0.7">
              <animate attributeName="opacity" values="0.5;0.9;0.5" dur="2.5s" repeatCount="indefinite" />
            </circle>
            <circle cx="120" cy="78" r="2" fill="#FFD700" opacity="0.7">
              <animate attributeName="opacity" values="0.5;0.9;0.5" dur="3.5s" repeatCount="indefinite" />
            </circle>
            <circle cx="0" cy="26" r="2" fill="#FFD700" opacity="0.7">
              <animate attributeName="opacity" values="0.5;0.9;0.5" dur="2.8s" repeatCount="indefinite" />
            </circle>
            <circle cx="0" cy="78" r="2" fill="#FFD700" opacity="0.7">
              <animate attributeName="opacity" values="0.5;0.9;0.5" dur="3.2s" repeatCount="indefinite" />
            </circle>
            
            {/* Connection lines between hexagons */}
            <line x1="120" y1="26" x2="150" y2="26" stroke="url(#goldGradient)" strokeWidth="0.8" opacity="0.5" />
            <line x1="120" y1="78" x2="150" y2="104" stroke="url(#goldGradient)" strokeWidth="0.8" opacity="0.5" />
            <line x1="0" y1="26" x2="-30" y2="26" stroke="url(#goldGradient)" strokeWidth="0.8" opacity="0.5" />
            <line x1="0" y1="78" x2="-30" y2="104" stroke="url(#goldGradient)" strokeWidth="0.8" opacity="0.5" />
            <line x1="60" y1="0" x2="60" y2="-52" stroke="url(#goldGradient)" strokeWidth="0.8" opacity="0.5" />
            <line x1="60" y1="104" x2="60" y2="156" stroke="url(#goldGradient)" strokeWidth="0.8" opacity="0.5" />
            
            {/* Some filled hexagons for depth */}
            <path 
              d="M60,52 L90,39 L90,65 L60,78 L30,65 L30,39 Z" 
              fill="url(#goldGradient)" 
              opacity="0.15"
            />
            
            {/* Parallel diagonal lines for dynamic effect */}
            <line x1="20" y1="0" x2="100" y2="104" stroke="#FFD700" strokeWidth="0.5" opacity="0.3" />
            <line x1="40" y1="0" x2="120" y2="104" stroke="#FFD700" strokeWidth="0.5" opacity="0.3" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#honeycombPattern)" />
      </svg>
    </div>
  );
};

export default HoneycombBackground;

