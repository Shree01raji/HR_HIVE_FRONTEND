import React from 'react';

const SittingBee = () => {
  const [imageError, setImageError] = React.useState(false);
  const beeImagePaths = [
    '/images/bee.png',
    '/images/bee.jpg',
    '/images/bee.jpeg',
    '/images/bee.svg',
    '/images/bee.webp'
  ];
  const [currentImageIndex, setCurrentImageIndex] = React.useState(0);

  return (
    <div
      className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
      style={{
        animation: `beeSit 3s ease-in-out infinite`,
        zIndex: 10
      }}
    >
      {!imageError && currentImageIndex < beeImagePaths.length ? (
        <img
          src={beeImagePaths[currentImageIndex]}
          alt="Sitting Bee"
          width="50"
          height="50"
          style={{
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))',
            objectFit: 'contain',
            transform: 'rotate(-15deg)'
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
          width="50"
          height="50"
          viewBox="0 0 200 200"
          style={{
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))',
            transform: 'rotate(-15deg)'
          }}
        >
          {/* Simplified sitting bee */}
          <circle cx="100" cy="120" r="30" fill="#FFD700" stroke="#FFA500" strokeWidth="2" />
          <rect x="85" y="95" width="30" height="6" fill="#1a1a1a" rx="3" />
          <rect x="85" y="110" width="30" height="6" fill="#1a1a1a" rx="3" />
          <circle cx="80" cy="120" r="20" fill="#FFD700" stroke="#FFA500" strokeWidth="2" />
          <circle cx="72" cy="115" r="5" fill="#1a1a1a" />
          <circle cx="72" cy="125" r="5" fill="#1a1a1a" />
          <circle cx="65" cy="120" r="3" fill="#FFB6C1" opacity="0.7" />
          <ellipse cx="90" cy="85" rx="8" ry="12" fill="rgba(173, 216, 230, 0.6)" />
          <ellipse cx="110" cy="85" rx="8" ry="12" fill="rgba(173, 216, 230, 0.6)" />
        </svg>
      )}
    </div>
  );
};

export default SittingBee;

