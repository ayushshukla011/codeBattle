'use client';

import React, { useEffect, useState } from 'react';
import { SocketProvider } from '@/lib/socket-context';
import { ToastProvider } from '@/lib/toast-context';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useState<string>('');
  
  useEffect(() => {
    // Get the user ID from localStorage or session
    // This assumes that your authentication system stores the user ID somewhere
    const storedUserId = localStorage.getItem('userId') || '';
    setUserId(storedUserId);
    
    // Set up listener for auth changes
    const handleStorageChange = () => {
      const newUserId = localStorage.getItem('userId') || '';
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