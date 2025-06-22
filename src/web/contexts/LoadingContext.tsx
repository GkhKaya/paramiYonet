import React, { createContext, useContext, useState } from 'react';
import { Box, LinearProgress, Backdrop, CircularProgress, Typography } from '@mui/material';

interface LoadingContextType {
  isLoading: boolean;
  loadingMessage: string;
  setLoading: (loading: boolean, message?: string) => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export const useLoading = () => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
};

interface LoadingProviderProps {
  children: React.ReactNode;
}

export const LoadingProvider: React.FC<LoadingProviderProps> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Yükleniyor...');

  const setLoading = (loading: boolean, message: string = 'Yükleniyor...') => {
    setIsLoading(loading);
    setLoadingMessage(message);
  };

  return (
    <LoadingContext.Provider value={{ isLoading, loadingMessage, setLoading }}>
      {children}
      
      {/* Global Loading Backdrop */}
      <Backdrop
        sx={{
          color: '#fff',
          zIndex: (theme) => theme.zIndex.drawer + 1,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
        }}
        open={isLoading}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <CircularProgress color="primary" size={60} />
          <Typography variant="h6" sx={{ color: 'white', textAlign: 'center' }}>
            {loadingMessage}
          </Typography>
        </Box>
      </Backdrop>
    </LoadingContext.Provider>
  );
};

// Loading Bar Component for top of screen
export const LoadingBar: React.FC<{ show: boolean }> = ({ show }) => {
  if (!show) return null;

  return (
    <Box sx={{ 
      position: 'fixed', 
      top: 0, 
      left: 0, 
      right: 0, 
      zIndex: (theme) => theme.zIndex.appBar + 1,
      height: 4 
    }}>
      <LinearProgress 
        sx={{
          height: 4,
          '& .MuiLinearProgress-bar': {
            backgroundColor: '#2196F3',
          },
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
        }}
      />
    </Box>
  );
}; 