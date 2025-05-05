'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function JoinByCodePage({ params }: { params: { code: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const joinChallenge = async () => {
      const token = localStorage.getItem('token');
      
      if (!token) {
        router.push('/login');
        return;
      }
      
      try {
        const response = await fetch(`/api/challenges/join`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ code: params.code })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to join challenge');
        }

        // Challenge joined successfully
        router.push(`/challenge/${data.challenge.id}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to join challenge');
        setLoading(false);
      }
    };

    joinChallenge();
  }, [router, params.code]);

  if (loading && !error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-8 max-w-md w-full text-center">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Joining Challenge</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Please wait while we connect you to challenge: {params.code}
          </p>
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-8 max-w-md w-full">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Unable to Join Challenge</h2>
          
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
          
          <div className="flex flex-col space-y-3">
            <Link
              href="/challenge/join"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md shadow text-center"
            >
              Try Different Code
            </Link>
            
            <Link
              href="/dashboard"
              className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 font-medium rounded-md text-center"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return null;
} 