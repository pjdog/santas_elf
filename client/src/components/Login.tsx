import React from 'react';
import Button from '@mui/material/Button';
import GoogleIcon from '@mui/icons-material/Google';
import { Box, Typography } from '@mui/material';

const Login: React.FC = () => {
  const handleLogin = () => {
    window.location.href = '/auth/google';
  };

  return (
    <Box sx={{ textAlign: 'center' }}>
      <Button 
          variant="contained" 
          size="large"
          startIcon={<GoogleIcon />} 
          onClick={handleLogin}
          sx={{ 
            backgroundColor: '#fff',
            color: '#000',
            fontSize: '1rem',
            fontWeight: 600,
            py: 1.5,
            px: 4,
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            '&:hover': {
              backgroundColor: '#f5f5f5',
              boxShadow: '0 6px 16px rgba(0,0,0,0.15)',
            }
          }}
      >
        Continue with Google
      </Button>
      <Typography variant="caption" display="block" sx={{ mt: 2, color: 'text.secondary' }}>
        Secure access powered by Google OAuth
      </Typography>
    </Box>
  );
};

export default Login;