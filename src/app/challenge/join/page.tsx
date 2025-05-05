'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function JoinChallengePage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!code || code.trim().length === 0) {
      setError('Please enter a challenge code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        router.push('/login');
        return;
      }
      
      const response = await fetch(`/api/challenges/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ code })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to join challenge');
      }

      // Challenge joined successfully
      router.push(`/challenge/${data.challenge.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join challenge');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">CodeBattle</h1>
          
          <Link
            href="/dashboard"
            className="text-blue-600 hover:text-blue-700 dark:text-blue-500 dark:hover:text-blue-400"
          >
            Back to Dashboard
          </Link>
        </div>
      </header>
      
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Join a Challenge</h2>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6 space-y-6">
          <p className="text-gray-600 dark:text-gray-400">
            Enter the challenge code provided by your friend to join their challenge.
          </p>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="code" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Challenge Code
              </label>
              <input
                id="code"
                name="code"
                type="text"
                required
                placeholder="e.g. ABC123"
                value={code}
                onChange={handleChange}
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:text-white uppercase font-mono text-xl tracking-wider text-center"
                maxLength={6}
              />
            </div>
            
            <div className="flex items-center space-x-4 pt-4">
              <Link
                href="/dashboard"
                className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 font-medium rounded-md"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md shadow focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? 'Joining...' : 'Join Challenge'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
} 