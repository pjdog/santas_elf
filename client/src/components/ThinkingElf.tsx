import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Collapse from '@mui/material/Collapse';
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

interface ThinkingElfProps {
    message?: string; // Optional message to show (e.g. "Searching...")
    steps?: string[]; // Trace of steps taken
}

const ThinkingElf: React.FC<ThinkingElfProps> = ({ message, steps = [] }) => {
  const [expanded, setExpanded] = useState(false);
  const [lastStep, setLastStep] = useState<string>("");
  const isEmbedded = steps.length > 0; // If steps are provided, we assume it's embedded in a message

  // Auto-update the visible message to the latest "Action" if present
  useEffect(() => {
      if (steps.length > 0) {
          const last = steps[steps.length - 1];
          if (last.startsWith('Action:')) {
              setLastStep(last.replace('Action:', '').trim());
          } else if (last.startsWith('Thought:')) {
              setLastStep("Thinking...");
          }
      }
  }, [steps]);

  return (
    <Box
      sx={isEmbedded ? {
        display: 'flex',
        alignItems: 'center',
        mt: 1
      } : {
        position: 'absolute',
        left: 0,
        bottom: 100, 
        zIndex: 10,
        display: 'flex',
        alignItems: 'center',
        animation: `${peekIn} 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards`,
        pointerEvents: 'auto', 
      }}
    >
      {/* The Elf Container */}
      <Box sx={{ position: 'relative', animation: `${float} 2s ease-in-out infinite`, cursor: 'pointer' }} onClick={() => setExpanded(!expanded)}>
        <svg width={isEmbedded ? "40" : "80"} height={isEmbedded ? "40" : "80"} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
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
          maxWidth: 250,
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer' }} onClick={() => setExpanded(!expanded)}>
            <Box sx={{ display: 'flex', gap: 0.5 }}>
                <Box sx={{ width: 6, height: 6, bgcolor: '#34C759', borderRadius: '50%', animation: `${float} 1s infinite 0s` }} />
                <Box sx={{ width: 6, height: 6, bgcolor: '#FF3B30', borderRadius: '50%', animation: `${float} 1s infinite 0.2s` }} />
                <Box sx={{ width: 6, height: 6, bgcolor: '#34C759', borderRadius: '50%', animation: `${float} 1s infinite 0.4s` }} />
            </Box>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
                {lastStep || message || "Thinking..."}
            </Typography>
        </Box>

        {/* Expanded Reasoning Trace */}
        <Collapse in={expanded}>
            <Box sx={{ mt: 1, maxHeight: 200, overflowY: 'auto', borderTop: '1px solid #eee', pt: 1 }}>
                {steps.map((step, i) => (
                    <Typography key={i} variant="caption" display="block" sx={{ mb: 0.5, fontFamily: 'monospace', fontSize: '0.7rem', color: step.startsWith('Error') ? 'red' : 'text.secondary' }}>
                        {step}
                    </Typography>
                ))}
            </Box>
        </Collapse>
      </Box>
    </Box>
  );
};

export default ThinkingElf;