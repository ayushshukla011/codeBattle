'use client';

import React, { useEffect, useState } from 'react';
import { SocketProvider } from '@/lib/socket-context';
import { ToastProvider } from '@/lib/toast-context';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useState<string>('');
  
  useEffect(() => {
    // Get the user ID from localStorage by parsing the user object
    const storedUser = localStorage.getItem('user');
    let storedUserId = '';
    
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        storedUserId = user.id || '';
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    }
    
    setUserId(storedUserId);
    
    // Set up listener for auth changes
    const handleStorageChange = () => {
      const newStoredUser = localStorage.getItem('user');
      let newUserId = '';
      
      if (newStoredUser) {
        try {
          const user = JSON.parse(newStoredUser);
          newUserId = user.id || '';
        } catch (e) {
          console.error('Error parsing user data:', e);
        }
      }
      
      if (newUserId !== userId) {
        setUserId(newUserId);
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [userId]);
  
  // Only provide socket context if we have a user ID
  if (!userId) {
    return (
      <ToastProvider>
        {children}
      </ToastProvider>
    );
  }
  
  return (
    <ToastProvider>
      <SocketProvider userId={userId}>
        {children}
      </SocketProvider>
    </ToastProvider>
  );
} 