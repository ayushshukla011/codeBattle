'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSocket } from '@/lib/socket-context';
import { useToast } from '@/lib/toast-context';

// Types
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

interface ChallengeRoomProps {
  challenge: Challenge;
  currentUser: User;
  onSubmit: (problemId: string, submissionId: number) => Promise<void>;
  timeLeft: number | null;
}

export default function ChallengeRoom({ 
  challenge, 
  currentUser, 
  onSubmit,
  timeLeft: propTimeLeft
}: ChallengeRoomProps) {
  const [submissionInput, setSubmissionInput] = useState<string>('');
  const [selectedProblemId, setSelectedProblemId] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(propTimeLeft);
  const [copiedCode, setCopiedCode] = useState(false);
  const [startingChallenge, setStartingChallenge] = useState(false);
  
  // Socket context
  const { timeLeft: socketTimeLeft, solvedProblems } = useSocket();
  const { showToast } = useToast();
  
  // Use socket time if available
  useEffect(() => {
    if (socketTimeLeft !== null) {
      setTimeLeft(socketTimeLeft);
    } else if (propTimeLeft !== null) {
      setTimeLeft(propTimeLeft);
    }
  }, [socketTimeLeft, propTimeLeft]);
  
  // Show toast when opponent joins the challenge
  useEffect(() => {
    if (challenge.joinedBy && challenge.status === 'WAITING' && isCreator) {
      showToast(`${challenge.joinedBy.codeforcesHandle} has joined your challenge!`, 'info');
    }
  }, [challenge.joinedBy, challenge.status]);
  
  // Get the opponent
  const opponent = challenge.createdBy.id === currentUser.id 
    ? challenge.joinedBy 
    : challenge.createdBy;
  
  // Check if current user is the creator
  const isCreator = challenge.createdBy.id === currentUser.id;
  
  // Format time
  const formatTime = (seconds: number | null) => {
    if (seconds === null) return '--:--';
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  
  // Start the challenge
  const handleStartChallenge = async () => {
    if (!isCreator || challenge.status !== 'WAITING' || !challenge.joinedBy) {
      return;
    }
    
    setStartingChallenge(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Not authenticated');
      }
      
      console.log(`Starting challenge ${challenge.id}...`);
      
      const response = await fetch(`/api/challenges/${challenge.id}/start`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const data = await response.json();
        console.error('Error starting challenge:', data);
        throw new Error(data.error || 'Failed to start challenge');
      }
      
      showToast('Challenge started! Get ready to code!', 'success');
      
      // The challenge started successfully - refresh will happen via parent component
      // Force a reload to ensure the UI updates properly
      window.location.reload();
    } catch (err) {
      console.error('Start challenge error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to start challenge';
      setError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setStartingChallenge(false);
    }
  };
  
  // Get the submission time in the challenge
  const getSubmissionTimestamp = (submission: Submission) => {
    if (!challenge.startTime) return '';
    
    const startTime = new Date(challenge.startTime);
    const submissionTime = new Date(submission.submissionTime);
    const diffMs = submissionTime.getTime() - startTime.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffSecs = Math.floor((diffMs % 60000) / 1000);
    
    return `${diffMins.toString().padStart(2, '0')}:${diffSecs.toString().padStart(2, '0')}`;
  };
  
  // Get submission status for a problem
  const getSubmissionStatus = (problemId: string, userId: string) => {
    return challenge.submissions.find(
      sub => sub.problemId === problemId && sub.userId === userId && sub.verdict === 'OK'
    );
  };
  
  // Count solved problems
  const getSolvedCount = (userId: string) => {
    const uniqueProblemIds = new Set(
      challenge.submissions
        .filter(s => s.userId === userId && s.verdict === 'OK')
        .map(s => s.problemId)
    );
    
    return uniqueProblemIds.size;
  };
  
  // Get unsolved problems
  const getUnsolvedProblems = () => {
    const solvedProblemIds = new Set(
      challenge.submissions
        .filter(s => s.userId === currentUser.id && s.verdict === 'OK')
        .map(s => s.problemId)
    );
    
    return challenge.problems.filter(p => !solvedProblemIds.has(p.id));
  };
  
  // Extract submission ID from Codeforces URL
  const extractSubmissionId = (url: string): number | null => {
    // Match patterns like:
    // 1. https://codeforces.com/contest/123/submission/456789
    // 2. https://codeforces.com/problemset/submission/123/456789
    const submissionRegex = /\/submission\/(\d+)/;
    const match = url.match(submissionRegex);
    
    if (match && match[1]) {
      return parseInt(match[1], 10);
    }
    
    return null;
  };
  
  // Handle submission
  const handleSubmissionSubmit = async () => {
    if (!selectedProblemId) {
      setError('Please select a problem');
      showToast('Please select a problem', 'error');
      return;
    }
    
    if (!submissionInput.trim()) {
      setError('Please enter a submission ID or URL');
      showToast('Please enter a submission ID or URL', 'error');
      return;
    }
    
    // Extract submission ID from input
    let submissionId: number | null = null;
    
    // Check if input is a URL
    if (submissionInput.includes('codeforces.com')) {
      submissionId = extractSubmissionId(submissionInput);
    } else {
      // Attempt to parse as numeric ID
      const parsedId = parseInt(submissionInput.trim(), 10);
      if (!isNaN(parsedId)) {
        submissionId = parsedId;
      }
    }
    
    if (!submissionId) {
      setError('Invalid submission ID or URL');
      showToast('Invalid submission ID or URL', 'error');
      return;
    }
    
    setSubmitting(true);
    setError(null);
    
    try {
      await onSubmit(selectedProblemId, submissionId);
      setSubmissionInput('');
      setSelectedProblemId('');
      showToast('Submission recorded! Checking verdict...', 'info');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit solution';
      setError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setSubmitting(false);
    }
  };
  
  // Handle copy challenge code
  const handleCopyCode = () => {
    navigator.clipboard.writeText(challenge.code);
    setCopiedCode(true);
    showToast('Challenge code copied to clipboard!', 'success');
    setTimeout(() => setCopiedCode(false), 2000);
  };
  
  // Get problem URL
  const getProblemUrl = (problem: Problem) => {
    return `https://codeforces.com/problemset/problem/${problem.contestId}/${problem.index}`;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-blue-600 dark:bg-blue-800 p-4 text-white">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold">CodeBattle - Challenge Room</h2>
            <button 
              onClick={handleCopyCode}
              className="flex items-center space-x-1 bg-blue-700 hover:bg-blue-800 px-2 py-1 rounded text-sm"
              title="Copy challenge code"
            >
              <span>Code: {challenge.code}</span>
              {copiedCode ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              )}
            </button>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-mono text-lg">{formatTime(timeLeft)}</span>
            </div>
            {challenge.status === 'IN_PROGRESS' && (
              <Link 
                href="/dashboard"
                className={`text-sm px-3 py-1 bg-red-500 hover:bg-red-600 rounded-md ${timeLeft && timeLeft > 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={(e) => {
                  if (timeLeft && timeLeft > 0) {
                    e.preventDefault();
                    alert("You cannot leave until the challenge is over");
                  }
                }}
              >
                Leave
              </Link>
            )}
          </div>
        </div>
      </div>
      
      {/* Player Overview */}
      <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-700">
        <div className="flex items-center space-x-3">
          <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 p-1 rounded">🧑</span>
          <div>
            <p className="font-medium">You: {currentUser.codeforcesHandle}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Score: {getSolvedCount(currentUser.id)}/{challenge.problems.length}</p>
          </div>
        </div>
        
        {opponent && (
          <div className="flex items-center space-x-3">
            <span className="bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 p-1 rounded">👤</span>
            <div>
              <p className="font-medium">Opponent: {opponent.codeforcesHandle}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Score: {getSolvedCount(opponent.id)}/{challenge.problems.length}</p>
            </div>
          </div>
        )}
      </div>
      
      {/* Start challenge section - only shown to creator when in WAITING state */}
      {challenge.status === 'WAITING' && isCreator && opponent && (
        <div className="px-4 py-5 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
          <div className="text-center">
            {error && (
              <div className="mb-4 p-2 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 text-sm rounded">
                {error}
              </div>
            )}
            <p className="mb-4 text-gray-700 dark:text-gray-300">
              {opponent.codeforcesHandle} has joined your challenge. You can now start the battle!
            </p>
            <button
              onClick={handleStartChallenge}
              disabled={startingChallenge}
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
            >
              {startingChallenge ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Starting Challenge...
                </>
              ) : (
                <>Start Challenge</>
              )}
            </button>
          </div>
        </div>
      )}
      
      {/* Waiting for creator section - only shown to joiner when in WAITING state */}
      {challenge.status === 'WAITING' && !isCreator && (
        <div className="px-4 py-5 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className="animate-pulse flex space-x-4 items-center">
                <div className="h-3 w-3 bg-blue-600 rounded-full"></div>
                <div className="h-3 w-3 bg-blue-600 rounded-full"></div>
                <div className="h-3 w-3 bg-blue-600 rounded-full"></div>
              </div>
            </div>
            <p className="text-gray-700 dark:text-gray-300">
              Waiting for {challenge.createdBy.codeforcesHandle} to start the challenge...
            </p>
          </div>
        </div>
      )}
      
      {/* Problem Table - only shown when in progress or finished */}
      {challenge.status !== 'WAITING' && (
        <div className="px-4 py-5">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead>
                <tr>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">#</th>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Problem Title</th>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">You</th>
                  {opponent && (
                    <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Opponent</th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {challenge.problems.map((problem, index) => {
                  const yourSubmission = getSubmissionStatus(problem.id, currentUser.id);
                  const opponentSubmission = opponent 
                    ? getSubmissionStatus(problem.id, opponent.id) 
                    : null;
                  
                  return (
                    <tr key={problem.id}>
                      <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-200">
                        {index + 1}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm">
                        <a 
                          href={getProblemUrl(problem)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline dark:text-blue-400"
                        >
                          {problem.contestId}{problem.index} - {problem.title}
                        </a>
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm">
                        {yourSubmission ? (
                          <span className="text-green-600 dark:text-green-400 flex items-center">
                            ✅ {getSubmissionTimestamp(yourSubmission)}
                          </span>
                        ) : submitting && selectedProblemId === problem.id ? (
                          <span className="text-yellow-600 dark:text-yellow-400 flex items-center">
                            🔄 Submitting...
                          </span>
                        ) : (
                          <span className="text-red-600 dark:text-red-400">❌</span>
                        )}
                      </td>
                      {opponent && (
                        <td className="px-3 py-4 whitespace-nowrap text-sm">
                          {opponentSubmission ? (
                            <span className="text-green-600 dark:text-green-400 flex items-center">
                              ✅ {getSubmissionTimestamp(opponentSubmission)}
                            </span>
                          ) : (
                            <span className="text-red-600 dark:text-red-400">❌</span>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {/* Submission Section */}
      {challenge.status === 'IN_PROGRESS' && timeLeft && timeLeft > 0 ? (
        <div className="px-4 py-5 bg-gray-50 dark:bg-gray-700 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100">
            Submit Solution
          </h3>
          {error && (
            <div className="mt-2 p-2 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 text-sm rounded">
              {error}
            </div>
          )}
          <div className="mt-3 flex flex-col md:flex-row space-y-3 md:space-y-0 md:space-x-3">
            <div className="flex-1">
              <select
                value={selectedProblemId}
                onChange={(e) => setSelectedProblemId(e.target.value)}
                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block p-4 w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-md"
                disabled={submitting || getUnsolvedProblems().length === 0}
              >
                <option value="">Select a problem</option>
                {getUnsolvedProblems().map((problem) => (
                  <option key={problem.id} value={problem.id}>
                    {problem.contestId}{problem.index} - {problem.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-2 md:flex-1">
              <input
                type="text"
                value={submissionInput}
                onChange={(e) => setSubmissionInput(e.target.value)}
                placeholder="Paste Codeforces submission URL"
                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 p-4 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-md"
                disabled={submitting || !selectedProblemId}
              />
            </div>
            <div>
              <button
                onClick={handleSubmissionSubmit}
                disabled={submitting || !selectedProblemId || !submissionInput.trim()}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </div>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Enter the URL of your accepted Codeforces submission (e.g., https://codeforces.com/contest/123/submission/456789 or https://codeforces.com/problemset/submission/123/456789)
          </p>
        </div>
      ) : challenge.status === 'FINISHED' ? (
        <div className="px-4 py-5 bg-gray-50 dark:bg-gray-700 sm:px-6 text-center">
          <div className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">
            Challenge Completed!
          </div>
          <Link
            href={`/challenge/${challenge.id}/results`}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            View Results
          </Link>
        </div>
      ) : timeLeft === 0 ? (
        <div className="px-4 py-5 bg-gray-50 dark:bg-gray-700 sm:px-6 text-center">
          <div className="text-lg font-medium text-gray-900 dark:text-gray-100">
            Challenge Ended – Calculating Result...
          </div>
          <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            You will be redirected to the results page shortly.
          </div>
        </div>
      ) : null}
    </div>
  );
} 