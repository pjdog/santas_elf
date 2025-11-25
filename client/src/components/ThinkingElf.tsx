import React from 'react';
import Box from '@mui/material/Box';
import { keyframes } from '@mui/system';

const peekIn = keyframes`
  0% { transform: translateX(-100%) rotate(-10deg); }
  60% { transform: translateX(10px) rotate(5deg); }
  80% { transform: translateX(-5px) rotate(0deg); }
  100% { transform: translateX(0) rotate(0deg); }
`;

const float = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-5px); }
`;

const ThinkingElf: React.FC = () => {
  return (
    <Box
      sx={{
        position: 'absolute',
        left: 0,
        bottom: 100, // Positioned above the chat input
        zIndex: 10,
        display: 'flex',
        alignItems: 'center',
        animation: `${peekIn} 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards`,
        pointerEvents: 'none', // Let clicks pass through
      }}
    >
      {/* The Elf Container */}
      <Box sx={{ position: 'relative', animation: `${float} 2s ease-in-out infinite` }}>
        <svg width="80" height="80" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Hat */}
            <path d="M20 60 C 20 60, 10 20, 50 10 C 50 10, 90 20, 80 60 Z" fill="#FF3B30" />
            <circle cx="90" cy="55" r="8" fill="#fff" /> {/* Pom pom */}
            <rect x="15" y="55" width="70" height="15" rx="7" fill="#fff" /> {/* Brim */}
            
            {/* Face */}
            <path d="M25 65 L25 80 Q50 95 75 80 L75 65 Z" fill="#F5D0C5" />
            
            {/* Ears */}
            <path d="M25 70 L15 65 L25 60 Z" fill="#F5D0C5" />
            <path d="M75 70 L85 65 L75 60 Z" fill="#F5D0C5" />

            {/* Eyes */}
            <circle cx="40" cy="75" r="3" fill="#1D1D1F" />
            <circle cx="60" cy="75" r="3" fill="#1D1D1F" />
            
            {/* Smile */}
            <path d="M45 85 Q50 88 55 85" stroke="#1D1D1F" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </Box>

      {/* Thought Bubble */}
      <Box
        sx={{
          ml: 1,
          bgcolor: '#fff',
          borderRadius: '12px 12px 12px 0',
          px: 2,
          py: 1,
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          border: '1px solid rgba(0,0,0,0.05)',
        }}
      >
        <Box sx={{ display: 'flex', gap: 0.5 }}>
            <Box sx={{ width: 6, height: 6, bgcolor: '#34C759', borderRadius: '50%', animation: `${float} 1s infinite 0s` }} />
            <Box sx={{ width: 6, height: 6, bgcolor: '#FF3B30', borderRadius: '50%', animation: `${float} 1s infinite 0.2s` }} />
            <Box sx={{ width: 6, height: 6, bgcolor: '#34C759', borderRadius: '50%', animation: `${float} 1s infinite 0.4s` }} />
        </Box>
      </Box>
    </Box>
  );
};

export default ThinkingElf;
