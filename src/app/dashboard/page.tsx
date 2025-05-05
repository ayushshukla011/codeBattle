'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import CodeforcesProfile from '../components/CodeforcesProfile';

// Type definitions
type User = {
  id: string;
  email: string;
  codeforcesHandle: string;
};

type Challenge = {
  id: string;
  code: string;
  difficultyMin: number;
  difficultyMax: number;
  problemCount: number;
  durationMinutes: number;
  status: 'WAITING' | 'IN_PROGRESS' | 'FINISHED';
  startTime?: string;
  endTime?: string;
  createdBy: User;
  joinedBy?: User;
  winner?: User;
};

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (!token || !storedUser) {
      router.push('/login');
      return;
    }
    
    setUser(JSON.parse(storedUser));
    fetchChallenges(token);
    
    // Set up periodic refresh for challenges
    const interval = setInterval(() => {
      const currentToken = localStorage.getItem('token');
      if (currentToken) {
        fetchChallenges(currentToken, false);
      }
    }, 5000); // Refresh every 5 seconds
    
    return () => clearInterval(interval);
  }, [router]);

  const fetchChallenges = async (token: string, showLoading = true) => {
    if (showLoading) {
      setLoading(true);
    }
    
    try {
      const response = await fetch('/api/challenges', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch challenges');
      }
      
      const data = await response.json();
      setChallenges(data.challenges || []);
    } catch (err) {
      setError('Error loading challenges');
      console.error(err);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  const formatStatus = (status: string) => {
    switch (status) {
      case 'WAITING': return 'Waiting for opponent';
      case 'IN_PROGRESS': return 'In progress';
      case 'FINISHED': return 'Completed';
      default: return status;
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">CodeBattle</h1>
          
          {user && (
            <div className="flex items-center space-x-4">
              <span className="text-gray-700 dark:text-gray-300">
                {user.codeforcesHandle}
              </span>
              <button 
                onClick={handleLogout}
                className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 rounded"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid gap-8 grid-cols-1 lg:grid-cols-3">
          {/* Left column for profile */}
          <div className="lg:col-span-1">
            <CodeforcesProfile />
          </div>
          
          {/* Right column for challenges */}
          <div className="lg:col-span-2">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">My Challenges</h2>
              <div className="flex space-x-3">
                <Link
                  href="/challenge/join"
                  className="px-4 py-2 border border-blue-600 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900 font-medium rounded-md"
                >
                  Join Challenge
                </Link>
                <Link
                  href="/challenge/create"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded shadow"
                >
                  Create Challenge
                </Link>
              </div>
            </div>

            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}

            {loading ? (
              <p className="text-gray-600 dark:text-gray-400">Loading challenges...</p>
            ) : challenges.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600 dark:text-gray-400 mb-4">You don't have any challenges yet</p>
                <Link
                  href="/challenge/create"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded shadow"
                >
                  Create Your First Challenge
                </Link>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2">
                {challenges.map((challenge) => (
                  <div 
                    key={challenge.id} 
                    className="bg-white dark:bg-gray-800 rounded-lg shadow p-6"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                        Challenge: {challenge.code}
                      </h3>
                      <span className={`text-sm px-2 py-1 rounded-full ${
                        challenge.status === 'WAITING' 
                          ? 'bg-yellow-100 text-yellow-800' 
                          : challenge.status === 'IN_PROGRESS'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-green-100 text-green-800'
                      }`}>
                        {formatStatus(challenge.status)}
                      </span>
                    </div>
                    
                    <div className="space-y-2 mb-4">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        <span className="font-medium">Difficulty:</span> {challenge.difficultyMin} - {challenge.difficultyMax}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        <span className="font-medium">Problems:</span> {challenge.problemCount}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        <span className="font-medium">Duration:</span> {challenge.durationMinutes} min
                      </p>
                    </div>
                    
                    <Link
                      href={`/challenge/${challenge.id}`}
                      className="block w-full text-center py-2 px-4 border border-blue-600 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900 font-medium rounded-md"
                    >
                      {challenge.status === 'WAITING' ? 'View Challenge' : 
                      challenge.status === 'IN_PROGRESS' ? 'Go to Challenge Room' : 
                      'View Results'}
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
} 