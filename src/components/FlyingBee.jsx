import React from 'react';

const FlyingBee = ({ delay = 0, duration = 20, size = 'normal', flightPath = 1 }) => {
  const sizeMap = {
    small: { width: 60, height: 60 },
    normal: { width: 80, height: 80 },
    large: { width: 100, height: 100 }
  };

  const beeSize = sizeMap[size] || sizeMap.normal;
  
  // Try to load the bee image, fallback to SVG if not found
  // Supported formats: png, jpg, jpeg, svg, webp
  const beeImagePaths = [
    '/images/bee.png',
    '/images/bee.jpg',
    '/images/bee.jpeg',
    '/images/bee.svg',
    '/images/bee.webp'
  ];
  const [currentImageIndex, setCurrentImageIndex] = React.useState(0);
  const [imageError, setImageError] = React.useState(false);

  return (
    <div
      className="absolute pointer-events-none bee-container"
      style={{
        animation: `beeFlight${flightPath} ${duration}s ease-in-out infinite`,
        animationDelay: `${delay}s`,
        left: `${20 + Math.random() * 60}%`,
        top: `${10 + Math.random() * 70}%`,
        zIndex: 1
      }}
    >
      {!imageError && currentImageIndex < beeImagePaths.length ? (
        <img
          src={beeImagePaths[currentImageIndex]}
          alt="Flying Bee"
          width={beeSize.width}
          height={beeSize.height}
          className="bee-animation"
          style={{
            filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))',
            animation: `beeWobble 0.5s ease-in-out infinite alternate`,
            objectFit: 'contain'
          }}
          onError={() => {
            if (currentImageIndex < beeImagePaths.length - 1) {
              setCurrentImageIndex(currentImageIndex + 1);
            } else {
              setImageError(true);
            }
          }}
        />
      ) : (
        <svg
          width={beeSize.width}
          height={beeSize.height}
          viewBox="0 0 200 200"
          className="bee-animation"
          style={{
            filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))',
            animation: `beeWobble 0.5s ease-in-out infinite alternate`
          }}
        >
        {/* Wings - behind body, animated */}
        <g style={{ animation: `wingFlap 0.1s ease-in-out infinite`, transformOrigin: '100px 100px' }}>
          {/* Top wings */}
          <ellipse
            cx="90"
            cy="70"
            rx="20"
            ry="35"
            fill="rgba(173, 216, 230, 0.7)"
            stroke="rgba(173, 216, 230, 0.9)"
            strokeWidth="2"
          />
          <ellipse
            cx="110"
            cy="70"
            rx="20"
            ry="35"
            fill="rgba(173, 216, 230, 0.7)"
            stroke="rgba(173, 216, 230, 0.9)"
            strokeWidth="2"
          />
          {/* Bottom wings */}
          <ellipse
            cx="90"
            cy="130"
            rx="20"
            ry="35"
            fill="rgba(173, 216, 230, 0.7)"
            stroke="rgba(173, 216, 230, 0.9)"
            strokeWidth="2"
          />
          <ellipse
            cx="110"
            cy="130"
            rx="20"
            ry="35"
            fill="rgba(173, 216, 230, 0.7)"
            stroke="rgba(173, 216, 230, 0.9)"
            strokeWidth="2"
          />
        </g>
        
        {/* Bee body - segmented with stripes */}
        <ellipse
          cx="100"
          cy="100"
          rx="50"
          ry="35"
          fill="#FFD700"
          stroke="#FFA500"
          strokeWidth="3"
        />
        {/* Body segments */}
        <ellipse
          cx="130"
          cy="100"
          rx="30"
          ry="30"
          fill="#FFD700"
          stroke="#FFA500"
          strokeWidth="3"
        />
        <ellipse
          cx="70"
          cy="100"
          rx="25"
          ry="30"
          fill="#FFD700"
          stroke="#FFA500"
          strokeWidth="3"
        />
        
        {/* Black stripes */}
        <rect x="75" y="65" width="50" height="8" fill="#1a1a1a" rx="4" />
        <rect x="70" y="90" width="60" height="8" fill="#1a1a1a" rx="4" />
        <rect x="75" y="127" width="50" height="8" fill="#1a1a1a" rx="4" />
        
        {/* Head - round and yellow */}
        <circle cx="50" cy="100" r="28" fill="#FFD700" stroke="#FFA500" strokeWidth="3" />
        
        {/* Eyes - large black circles with white highlights */}
        <circle cx="42" cy="95" r="8" fill="#1a1a1a" />
        <circle cx="42" cy="105" r="8" fill="#1a1a1a" />
        <ellipse cx="44" cy="93" rx="3" ry="2" fill="#ffffff" />
        <ellipse cx="44" cy="103" rx="3" ry="2" fill="#ffffff" />
        
        {/* Cheeks - pink blush */}
        <circle cx="30" cy="100" r="6" fill="#FFB6C1" opacity="0.7" />
        <circle cx="65" cy="100" r="6" fill="#FFB6C1" opacity="0.7" />
        
        {/* Smile */}
        <path
          d="M 35 110 Q 50 115 65 110"
          fill="none"
          stroke="#1a1a1a"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        
        {/* Antennae */}
        <line x1="38" y1="75" x2="28" y2="65" stroke="#1a1a1a" strokeWidth="3" strokeLinecap="round" />
        <line x1="38" y1="125" x2="28" y2="135" stroke="#1a1a1a" strokeWidth="3" strokeLinecap="round" />
        <circle cx="28" cy="65" r="3" fill="#1a1a1a" />
        <circle cx="28" cy="135" r="3" fill="#1a1a1a" />
        
        {/* Legs - three visible on left side */}
        <line x1="70" y1="110" x2="55" y2="120" stroke="#1a1a1a" strokeWidth="4" strokeLinecap="round" />
        <line x1="70" y1="100" x2="55" y2="100" stroke="#1a1a1a" strokeWidth="4" strokeLinecap="round" />
        <line x1="70" y1="90" x2="55" y2="80" stroke="#1a1a1a" strokeWidth="4" strokeLinecap="round" />
        
        {/* Right side - holding bucket with boxing glove */}
        <g transform="translate(140, 95)">
          {/* Boxing glove - red with white cuff */}
          <ellipse
            cx="0"
            cy="0"
            rx="18"
            ry="22"
            fill="#FF0000"
            stroke="#CC0000"
            strokeWidth="2"
          />
          <rect x="-18" y="-8" width="36" height="12" fill="#FFFFFF" rx="6" />
          <line x1="-12" y1="-2" x2="12" y2="-2" stroke="#CC0000" strokeWidth="1" />
          
          {/* Bucket - light yellow with broken top */}
          <ellipse
            cx="0"
            cy="15"
            rx="12"
            ry="15"
            fill="#FFFFE0"
            stroke="#DDD"
            strokeWidth="2"
          />
          {/* Broken top edge */}
          <path
            d="M -12 8 Q -8 12 0 15 Q 8 12 12 8"
            fill="#E6E6FA"
            stroke="#DDD"
            strokeWidth="1.5"
          />
          <rect x="-12" y="8" width="24" height="2" fill="#FFFFE0" />
        </g>
      </svg>
      )}
    </div>
  );
};

export default FlyingBee;

