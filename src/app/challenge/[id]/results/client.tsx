'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// Type definitions
type User = {
  id: string;
  email: string;
  codeforcesHandle: string;
};

type Problem = {
  id: string;
  contestId: number;
  index: string;
  title: string;
};

type Submission = {
  id: string;
  problemId: string;
  userId: string;
  submissionId: number;
  submissionTime: string;
  verdict: string;
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
  problems: Problem[];
  submissions: Submission[];
};

export default function ResultsPage({ id }: { id: string }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
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
    fetchChallenge(token, id);
  }, [router, id]);

  const fetchChallenge = async (token: string, challengeId: string) => {
    setLoading(true);
    
    try {
      const response = await fetch(`/api/challenges/${challengeId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch challenge results');
      }
      
      const data = await response.json();
      setChallenge(data.challenge);
    } catch (err) {
      setError('Error loading challenge results');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getSubmissionForProblem = (problemId: string, userId: string) => {
    if (!challenge) return null;
    
    const submission = challenge.submissions.find(
      sub => sub.problemId === problemId && sub.userId === userId && sub.verdict === 'OK'
    );
    
    return submission;
  };

  const renderStatusBadge = (status: string) => {
    const colors = {
      WAITING: 'bg-yellow-100 text-yellow-800',
      IN_PROGRESS: 'bg-blue-100 text-blue-800',
      FINISHED: 'bg-green-100 text-green-800'
    };
    
    const labels = {
      WAITING: 'Waiting',
      IN_PROGRESS: 'In Progress',
      FINISHED: 'Completed'
    };
    
    return (
      <span className={`text-sm px-2 py-1 rounded-full ${colors[status as keyof typeof colors]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  const renderWinnerSection = () => {
    if (!challenge || !challenge.winner) return null;
    
    const isWinner = user && challenge.winner.id === user.id;
    
    return (
      <div className={`text-center p-6 rounded-lg shadow-md mb-8 ${
        isWinner ? 'bg-green-50 dark:bg-green-900' : 'bg-white dark:bg-gray-800'
      }`}>
        <h3 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">
          {isWinner ? 'You Won! 🎉' : 'Challenge Results'}
        </h3>
        
        <p className="text-lg text-gray-700 dark:text-gray-300">
          {isWinner 
            ? 'Congratulations on your victory!' 
            : `Winner: ${challenge.winner.codeforcesHandle}`}
        </p>
      </div>
    );
  };

  const renderResultsTable = () => {
    if (!challenge || !challenge.problems || !challenge.joinedBy) return null;
    
    const creator = challenge.createdBy;
    const opponent = challenge.joinedBy;
    
    return (
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white dark:bg-gray-800 rounded-lg shadow-md">
          <thead>
            <tr className="bg-gray-100 dark:bg-gray-700">
              <th className="py-3 px-4 text-left text-gray-700 dark:text-gray-300 font-semibold">Problem</th>
              <th className="py-3 px-4 text-left text-gray-700 dark:text-gray-300 font-semibold">{creator.codeforcesHandle}</th>
              <th className="py-3 px-4 text-left text-gray-700 dark:text-gray-300 font-semibold">{opponent.codeforcesHandle}</th>
            </tr>
          </thead>
          <tbody>
            {challenge.problems.map((problem) => {
              const creatorSubmission = getSubmissionForProblem(problem.id, creator.id);
              const opponentSubmission = getSubmissionForProblem(problem.id, opponent.id);
              
              // Determine who solved it first or at all
              let creatorSolvedStatus = 'Not solved';
              let opponentSolvedStatus = 'Not solved';
              let creatorClasses = 'text-red-600 dark:text-red-400';
              let opponentClasses = 'text-red-600 dark:text-red-400';
              
              if (creatorSubmission) {
                creatorSolvedStatus = new Date(creatorSubmission.submissionTime).toLocaleTimeString();
                creatorClasses = 'text-green-600 dark:text-green-400';
              }
              
              if (opponentSubmission) {
                opponentSolvedStatus = new Date(opponentSubmission.submissionTime).toLocaleTimeString();
                opponentClasses = 'text-green-600 dark:text-green-400';
              }
              
              // Highlight winner for this problem
              if (creatorSubmission && opponentSubmission) {
                const creatorTime = new Date(creatorSubmission.submissionTime).getTime();
                const opponentTime = new Date(opponentSubmission.submissionTime).getTime();
                
                if (creatorTime < opponentTime) {
                  creatorClasses += ' font-bold';
                } else if (opponentTime < creatorTime) {
                  opponentClasses += ' font-bold';
                }
              } else if (creatorSubmission) {
                creatorClasses += ' font-bold';
              } else if (opponentSubmission) {
                opponentClasses += ' font-bold';
              }
              
              return (
                <tr key={problem.id} className="border-t border-gray-200 dark:border-gray-700">
                  <td className="py-3 px-4">
                    <div className="font-medium text-gray-900 dark:text-white">
                      {problem.index}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {problem.title}
                    </div>
                    <a 
                      href={`https://codeforces.com/problemset/problem/${problem.contestId}/${problem.index}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline"
                    >
                      View on Codeforces
                    </a>
                  </td>
                  <td className={`py-3 px-4 ${creatorClasses}`}>
                    {creatorSolvedStatus}
                  </td>
                  <td className={`py-3 px-4 ${opponentClasses}`}>
                    {opponentSolvedStatus}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const renderChallengeDetails = () => {
    if (!challenge) return null;
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Challenge Details</h3>
          <div className="space-y-2">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <span className="font-medium">Code:</span> {challenge.code}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <span className="font-medium">Difficulty Range:</span> {challenge.difficultyMin} - {challenge.difficultyMax}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <span className="font-medium">Problems:</span> {challenge.problemCount}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <span className="font-medium">Duration:</span> {challenge.durationMinutes} minutes
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <span className="font-medium">Status:</span> {renderStatusBadge(challenge.status)}
            </p>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Time Details</h3>
          <div className="space-y-2">
            {challenge.startTime && (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <span className="font-medium">Started:</span> {new Date(challenge.startTime).toLocaleString()}
              </p>
            )}
            {challenge.endTime && (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <span className="font-medium">Ended:</span> {new Date(challenge.endTime).toLocaleString()}
              </p>
            )}
            {challenge.startTime && challenge.endTime && (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <span className="font-medium">Actual Duration:</span> {' '}
                {Math.round((new Date(challenge.endTime).getTime() - new Date(challenge.startTime).getTime()) / 60000)} minutes
              </p>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
        <div className="max-w-4xl mx-auto pt-8">
          <p className="text-gray-600 dark:text-gray-400">Loading challenge results...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
        <div className="max-w-4xl mx-auto pt-8">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
          <Link
            href="/dashboard"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded shadow"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
        <div className="max-w-4xl mx-auto pt-8">
          <p className="text-gray-600 dark:text-gray-400">Challenge not found</p>
          <Link
            href="/dashboard"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded shadow mt-4 inline-block"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (challenge.status !== 'FINISHED') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
        <div className="max-w-4xl mx-auto pt-8">
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
            This challenge is not yet completed.
          </div>
          <Link
            href={`/challenge/${challenge.id}`}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded shadow mt-4 inline-block"
          >
            Go to Challenge Room
          </Link>
        </div>
      </div>
    );
  }

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
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          Challenge Results
        </h2>
        
        {renderWinnerSection()}
        {renderChallengeDetails()}
        
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Performance
        </h3>
        
        {renderResultsTable()}
        
        <div className="mt-8 flex justify-center">
          <Link
            href="/challenge/create"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded shadow"
          >
            Create Another Challenge
          </Link>
        </div>
      </main>
    </div>
  );
} 