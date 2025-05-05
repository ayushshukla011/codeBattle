'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function CreateChallengePage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    difficultyMin: 800,
    difficultyMax: 1600,
    problemCount: 3,
    durationMinutes: 60
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'problemCount' ? parseInt(value) : parseInt(value)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    // Validation
    if (formData.difficultyMin > formData.difficultyMax) {
      setError('Minimum difficulty cannot be greater than maximum difficulty');
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        router.push('/login');
        return;
      }
      
      const response = await fetch('/api/challenges', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create challenge');
      }

      // Challenge created successfully
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create challenge');
    } finally {
      setLoading(false);
    }
  };

  const difficulties = [
    { value: 800, label: '800 (Div. 2, A)' },
    { value: 1000, label: '1000 (Div. 2, A-B)' },
    { value: 1200, label: '1200 (Div. 2, B)' },
    { value: 1400, label: '1400 (Div. 2, B-C)' },
    { value: 1600, label: '1600 (Div. 2, C)' },
    { value: 1800, label: '1800 (Div. 2, C-D)' },
    { value: 2000, label: '2000 (Div. 1, A)' },
    { value: 2200, label: '2200 (Div. 1, A-B)' },
    { value: 2400, label: '2400 (Div. 1, B)' },
    { value: 2600, label: '2600 (Div. 1, C)' },
    { value: 2800, label: '2800 (Div. 1, D)' },
    { value: 3000, label: '3000+ (Div. 1, D-E)' }
  ];

  const durations = [
    { value: 30, label: '30 minutes' },
    { value: 45, label: '45 minutes' },
    { value: 60, label: '1 hour' },
    { value: 90, label: '1.5 hours' },
    { value: 120, label: '2 hours' },
    { value: 180, label: '3 hours' }
  ];

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
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Create a New Challenge</h2>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6 space-y-6">
          <div>
            <label htmlFor="difficultyMin" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Minimum Difficulty
            </label>
            <select
              id="difficultyMin"
              name="difficultyMin"
              value={formData.difficultyMin}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:text-white"
            >
              {difficulties.map((diff) => (
                <option key={`min-${diff.value}`} value={diff.value}>
                  {diff.label}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label htmlFor="difficultyMax" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Maximum Difficulty
            </label>
            <select
              id="difficultyMax"
              name="difficultyMax"
              value={formData.difficultyMax}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:text-white"
            >
              {difficulties.map((diff) => (
                <option key={`max-${diff.value}`} value={diff.value}>
                  {diff.label}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label htmlFor="problemCount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Number of Problems
            </label>
            <select
              id="problemCount"
              name="problemCount"
              value={formData.problemCount}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:text-white"
            >
              {[1, 2, 3, 4, 5].map((count) => (
                <option key={count} value={count}>
                  {count} problem{count > 1 ? 's' : ''}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label htmlFor="durationMinutes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Duration
            </label>
            <select
              id="durationMinutes"
              name="durationMinutes"
              value={formData.durationMinutes}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:text-white"
            >
              {durations.map((duration) => (
                <option key={duration.value} value={duration.value}>
                  {duration.label}
                </option>
              ))}
            </select>
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
              {loading ? 'Creating...' : 'Create Challenge'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
} 