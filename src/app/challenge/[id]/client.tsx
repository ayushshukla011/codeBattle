'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSocket } from '@/lib/socket-context';
import ChallengeRoom from '@/app/components/ChallengeRoom';

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

// Client component
export default function ClientPage({ id }: { id: string }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [submissionInput, setSubmissionInput] = useState<Record<string, string>>({});
  const [serverTime, setServerTime] = useState<Date | null>(null);
  const [timeDiff, setTimeDiff] = useState<number>(0);
  const fetchTimeRef = useRef<number>(0);
  
  // Get socket context
  const { 
    joinChallengeRoom, 
    markProblemSolved, 
    timeLeft: socketTimeLeft, 
    solvedProblems,
    challengeEnded,
    winner: socketWinner,
    timeDiff: socketTimeDiff
  } = useSocket();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (!token || !storedUser) {
      router.push('/login');
      return;
    }
    
    setUser(JSON.parse(storedUser));
    fetchChallenge(token, id);

    // Setup polling for challenge updates when in waiting state
    const pollInterval = setInterval(() => {
      const currentToken = localStorage.getItem('token');
      if (currentToken && challenge?.status === 'WAITING') {
        fetchChallenge(currentToken, id, false);
      } else {
        clearInterval(pollInterval);
      }
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(pollInterval);
  }, [router, id, challenge?.status]);

  // Join socket room when challenge code is available
  useEffect(() => {
    if (challenge?.code && challenge.status === 'IN_PROGRESS') {
      joinChallengeRoom(challenge.code);
    }
  }, [joinChallengeRoom, challenge?.code, challenge?.status]);

  // Effect to update the UI when solved problems change via websocket
  useEffect(() => {
    if (challenge && solvedProblems.size > 0) {
      // Create a new challenge object with updated submissions
      const updatedChallenge = { ...challenge };
      
      // Update the submissions based on solved problems from socket
      solvedProblems.forEach((solvedInfo: { userId: string; time: Date | string }, problemId) => {
        // Check if this submission is already in our state
        const existingSubmission = challenge.submissions.find(
          sub => sub.problemId === problemId && sub.userId === solvedInfo.userId
        );
        
        if (!existingSubmission) {
          // Add a new submission to our state
          const newSubmission: Submission = {
            id: `temp-${Date.now()}`, // Temporary ID
            problemId,
            userId: solvedInfo.userId,
            submissionId: 0, // We don't know the actual submission ID
            submissionTime: solvedInfo.time instanceof Date 
              ? solvedInfo.time.toISOString() 
              : typeof solvedInfo.time === 'string' 
                ? solvedInfo.time 
                : new Date().toISOString(),
            verdict: 'OK'
          };
          
          updatedChallenge.submissions = [...updatedChallenge.submissions, newSubmission];
        }
      });
      
      setChallenge(updatedChallenge);
    }
  }, [challenge, solvedProblems]);
  
  // Effect to update UI when challenge ends via websocket
  useEffect(() => {
    if (challengeEnded && challenge) {
      // Update challenge status and winner
      setChallenge(prev => {
        if (!prev) return null;
        
        return {
          ...prev,
          status: 'FINISHED' as const,
          winner: socketWinner ? {
            id: socketWinner.id,
            email: socketWinner.email,
            codeforcesHandle: socketWinner.codeforcesHandle
          } : undefined
        };
      });
    }
  }, [challengeEnded, socketWinner, challenge]);
  
  // Use socket timeLeft if available
  useEffect(() => {
    if (socketTimeLeft !== null) {
      setTimeLeft(socketTimeLeft);
    }
  }, [socketTimeLeft]);

  // Combine server time synchronization methods
  useEffect(() => {
    // If socket provides a time difference, use it
    if (socketTimeDiff !== 0) {
      setTimeDiff(socketTimeDiff);
    }
  }, [socketTimeDiff]);
  
  // Calculate time left effect as a fallback
  useEffect(() => {
    if (!challenge || !challenge.startTime || challenge.status === 'FINISHED' || socketTimeLeft !== null) {
      return;
    }

    const calculateTimeLeft = () => {
      if (!serverTime) return;
      
      // Calculate current server time based on client time + time difference
      const currentServerTime = new Date(Date.now() + timeDiff);
      
      const startTime = new Date(challenge.startTime || new Date()).getTime();
      const endTime = startTime + (challenge.durationMinutes * 60 * 1000);
      const difference = endTime - currentServerTime.getTime();
      
      if (difference <= 0) {
        setTimeLeft(0);
        // Challenge ended
        if (challenge.status === 'IN_PROGRESS') {
          fetchChallenge(localStorage.getItem('token') || '', id);
        }
        return;
      }
      
      setTimeLeft(Math.floor(difference / 1000));
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [challenge, id, socketTimeLeft, serverTime, timeDiff]);

  const fetchChallenge = async (token: string, challengeId: string, showLoading = true) => {
    if (showLoading) {
      setLoading(true);
    }
    
    try {
      // Record fetch start time
      const fetchStartTime = Date.now();
      fetchTimeRef.current = fetchStartTime;
      
      const response = await fetch(`/api/challenges/${challengeId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch challenge');
      }
      
      const data = await response.json();
      
      // Only update state if this is the most recent fetch
      if (fetchStartTime === fetchTimeRef.current) {
        setChallenge(data.challenge);
        
        // If this is the first load and challenge is in progress, join the socket room
        if (data.challenge && data.challenge.status === 'IN_PROGRESS' && data.challenge.code) {
          joinChallengeRoom(data.challenge.code);
        }
        
        // If timeLeft is provided from the API and we don't have a socket time
        if (data.timeLeft !== undefined && socketTimeLeft === null) {
          setTimeLeft(data.timeLeft);
        }
        
        // Store server time and calculate time difference between client and server
        if (data.serverTime) {
          const serverTimeObj = new Date(data.serverTime);
          setServerTime(serverTimeObj);
          
          // Calculate the time difference (server time - client time)
          // Accounting for network latency by using the middle point of request and response
          const fetchEndTime = Date.now();
          const requestDuration = fetchEndTime - fetchStartTime;
          const approximateRequestTime = fetchStartTime + Math.floor(requestDuration / 2);
          const timeDifference = serverTimeObj.getTime() - approximateRequestTime;
          
          setTimeDiff(timeDifference);
        }
      }
    } catch (err) {
      setError('Error loading challenge');
      console.error(err);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  const handleSubmissionInputChange = (e: React.ChangeEvent<HTMLInputElement>, problemId: string) => {
    setSubmissionInput(prev => ({
      ...prev,
      [problemId]: e.target.value
    }));
  };

  const handleSubmissionSubmit = async (problemId: string, submissionId: number) => {
    const token = localStorage.getItem('token');
    if (!token || !user) {
      throw new Error("Not authenticated");
    }

    try {
      const response = await fetch(`/api/challenges/${id}/submissions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          problemId,
          submissionId
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit solution');
      }

      // Get the response data
      const data = await response.json();
      
      // Update local state with the new submission
      setChallenge(prev => {
        if (!prev) return null;
        
        const updatedSubmissions = [...prev.submissions];
        
        // Add the new submission if it doesn't exist
        if (!updatedSubmissions.find(s => s.id === data.submission.id)) {
          updatedSubmissions.push(data.submission);
        }
        
        return {
          ...prev,
          submissions: updatedSubmissions
        };
      });
      
      // Notify others via socket
      markProblemSolved(problemId);
      
      return data;
    } catch (err) {
      throw err;
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getProblemUrl = (problem: Problem) => {
    return `https://codeforces.com/problemset/problem/${problem.contestId}/${problem.index}`;
  };

  const getSubmissionStatus = (problemId: string, userId: string) => {
    if (!challenge) return null;
    
    const submission = challenge.submissions.find(
      sub => sub.problemId === problemId && sub.userId === userId && sub.verdict === 'OK'
    );
    
    return submission;
  };

  // Render loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
        <div className="max-w-4xl mx-auto pt-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  // Render error state
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

  // Render not found state
  if (!challenge || !user) {
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

  // Render main challenge room with our new component
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
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ChallengeRoom 
          challenge={challenge}
          currentUser={user}
          onSubmit={handleSubmissionSubmit}
          timeLeft={timeLeft}
        />
      </main>
    </div>
  );
} 