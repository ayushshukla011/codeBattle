'use client';

import { useState, useEffect } from 'react';

// Type definition for Codeforces user data
type CodeforcesUser = {
  handle: string;
  rating: number;
  maxRating: number;
  rank: string;
  maxRank: string;
  titlePhoto: string;
  avatar: string;
  contestCount: number;
  lastContestDate: string | null;
  rankChange: number;
  ratingHistory: {
    contestId: number;
    contestName: string;
    rank: number;
    oldRating: number;
    newRating: number;
    date: string;
  }[];
};

export default function CodeforcesProfile() {
  const [userData, setUserData] = useState<CodeforcesUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setError('Not authenticated');
          setLoading(false);
          return;
        }

        const response = await fetch('/api/codeforces/user', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch Codeforces data');
        }

        const data = await response.json();
        setUserData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        console.error('Error fetching Codeforces user data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  // Function to get color based on rating
  const getRatingColor = (rating: number) => {
    if (rating < 1200) return 'text-gray-500'; // Newbie
    if (rating < 1400) return 'text-green-500'; // Pupil
    if (rating < 1600) return 'text-teal-500'; // Specialist
    if (rating < 1900) return 'text-blue-500'; // Expert
    if (rating < 2100) return 'text-purple-500'; // Candidate Master
    if (rating < 2400) return 'text-orange-500'; // Master
    if (rating < 2600) return 'text-orange-600'; // International Master
    if (rating < 3000) return 'text-red-500'; // Grandmaster
    return 'text-red-600'; // International Grandmaster or Legendary Grandmaster
  };

  if (loading) {
    return (
      <div className="animate-pulse bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-2"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Codeforces Profile</h3>
        <div className="p-4 border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 rounded-md text-red-600 dark:text-red-400">
          {error}
        </div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Codeforces Profile</h3>
        <p className="text-gray-600 dark:text-gray-400">No data available</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Codeforces Profile</h3>
      
      <div className="flex items-center space-x-4 mb-6">
        <img 
          src={userData.avatar || `https://userpic.codeforces.org/no-avatar.jpg`} 
          alt={`${userData.handle}'s avatar`}
          className="w-16 h-16 rounded-full border-2 border-gray-200 dark:border-gray-700"
        />
        <div>
          <h4 className="text-xl font-semibold">
            <a 
              href={`https://codeforces.com/profile/${userData.handle}`} 
              target="_blank"
              rel="noopener noreferrer"
              className={`${getRatingColor(userData.rating)} hover:underline`}
            >
              {userData.handle}
            </a>
          </h4>
          <p className="text-gray-600 dark:text-gray-400 capitalize">
            {userData.rank || 'Unrated'}
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
          <p className="text-sm text-gray-500 dark:text-gray-400">Current Rating</p>
          <p className={`text-xl font-bold ${getRatingColor(userData.rating)}`}>
            {userData.rating}
            {userData.rankChange !== 0 && (
              <span className={`ml-2 text-sm ${userData.rankChange > 0 ? 'text-green-500' : 'text-red-500'}`}>
                {userData.rankChange > 0 ? '+' : ''}{userData.rankChange}
              </span>
            )}
          </p>
        </div>
        
        <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
          <p className="text-sm text-gray-500 dark:text-gray-400">Max Rating</p>
          <p className={`text-xl font-bold ${getRatingColor(userData.maxRating)}`}>
            {userData.maxRating}
            {userData.maxRank && (
              <span className="ml-2 text-xs text-gray-500 dark:text-gray-400 capitalize">
                ({userData.maxRank})
              </span>
            )}
          </p>
        </div>
      </div>
      
      <div className="space-y-2 mb-6">
        <div className="flex justify-between">
          <p className="text-sm text-gray-600 dark:text-gray-400">Contests Participated</p>
          <p className="text-sm font-medium">{userData.contestCount}</p>
        </div>
        
        {userData.lastContestDate && (
          <div className="flex justify-between">
            <p className="text-sm text-gray-600 dark:text-gray-400">Last Contest</p>
            <p className="text-sm font-medium">
              {new Date(userData.lastContestDate).toLocaleDateString()}
            </p>
          </div>
        )}
      </div>
      
      {userData.ratingHistory && userData.ratingHistory.length > 0 && (
        <div>
          <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">Recent Contests</h4>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-2 px-3">Contest</th>
                  <th className="text-right py-2 px-3">Rank</th>
                  <th className="text-right py-2 px-3">Rating Δ</th>
                </tr>
              </thead>
              <tbody>
                {userData.ratingHistory.map((contest) => (
                  <tr 
                    key={`${contest.contestId}-${contest.date}`}
                    className="border-b border-gray-100 dark:border-gray-800"
                  >
                    <td className="py-2 px-3 truncate max-w-[180px]">
                      <a 
                        href={`https://codeforces.com/contest/${contest.contestId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline text-blue-600 dark:text-blue-400"
                      >
                        {contest.contestName}
                      </a>
                    </td>
                    <td className="text-right py-2 px-3">{contest.rank}</td>
                    <td className={`text-right py-2 px-3 ${
                      contest.newRating > contest.oldRating 
                        ? 'text-green-500' 
                        : contest.newRating < contest.oldRating 
                          ? 'text-red-500' 
                          : ''
                    }`}>
                      {contest.newRating - contest.oldRating > 0 ? '+' : ''}
                      {contest.newRating - contest.oldRating}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      <div className="mt-4 text-center">
        <a 
          href={`https://codeforces.com/profile/${userData.handle}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
        >
          View Full Profile on Codeforces
          <svg 
            className="ml-1 w-4 h-4" 
            fill="currentColor" 
            viewBox="0 0 20 20" 
            xmlns="http://www.w3.org/2000/svg"
          >
            <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd"></path>
          </svg>
        </a>
      </div>
    </div>
  );
} 