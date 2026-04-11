import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30000, refetchOnWindowFocus: false },
    mutations: { retry: 0 }
  }
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          style: { fontSize: '14px', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.12)' },
          success: { iconTheme: { primary: '#0D1B8E', secondary: '#fff' } },
          error:   { iconTheme: { primary: '#D32F2F', secondary: '#fff' } }
        }}
      />
    </QueryClientProvider>
  </React.StrictMode>
);
