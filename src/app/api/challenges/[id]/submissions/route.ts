import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { emitChallengeEnd } from '@/lib/socket';

// Validation schema for submissions
const submissionSchema = z.object({
  problemId: z.string(),
  submissionId: z.number()
});

// Function to verify submission with Codeforces API
async function verifyCodeforcesSubmission(submissionId: number, problemId: string, userId: string, challengeId: string) {
  try {
    // First, get the user's codeforces handle
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { codeforcesHandle: true }
    });
    
    if (!user || !user.codeforcesHandle) {
      throw new Error('User not found or missing Codeforces handle');
    }
    
    // Get the problem details
    const problem = await prisma.problem.findUnique({
      where: { id: problemId },
      select: { contestId: true, index: true }
    });
    
    if (!problem) {
      throw new Error('Problem not found');
    }
    
    // Get the challenge to check start time - the server time is the source of truth
    const challenge = await prisma.challenge.findUnique({
      where: { id: challengeId },
      select: { startTime: true, status: true }
    });
    
    if (!challenge) {
      throw new Error('Challenge not found');
    }
    
    if (challenge.status !== 'IN_PROGRESS') {
      throw new Error('Challenge is not in progress');
    }
    
    if (!challenge.startTime) {
      throw new Error('Challenge has not started yet');
    }
    
    const startTime = new Date(challenge.startTime);
    
    // Fetch the submission from Codeforces API
    const response = await fetch(`https://codeforces.com/api/user.status?handle=${user.codeforcesHandle}&count=30`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch submissions from Codeforces');
    }
    
    const data = await response.json();
    
    if (data.status !== 'OK') {
      throw new Error('Codeforces API error: ' + data.comment);
    }
    
    // Find the submission with the matching ID
    const submission = data.result.find((sub: any) => sub.id === submissionId);
    
    if (!submission) {
      throw new Error('Submission not found on Codeforces');
    }
    
    // Verify that the submission is for the correct problem
    if (submission.problem.contestId !== problem.contestId || 
        submission.problem.index !== problem.index) {
      throw new Error('Submission is for a different problem');
    }
    
    // Verify that the submission is from the claimed user
    if (submission.author.members[0].handle.toLowerCase() !== user.codeforcesHandle.toLowerCase()) {
      throw new Error('Submission is not from your Codeforces handle');
    }
    
    // Verify that the submission was made after the challenge started
    const submissionTime = new Date(submission.creationTimeSeconds * 1000);
    if (submissionTime < startTime) {
      throw new Error('Submission was made before the challenge started');
    }
    
    // Verify that the submission was accepted
    if (submission.verdict !== 'OK') {
      throw new Error(`Submission verdict is ${submission.verdict}, not OK`);
    }
    
    // If we reach here, the submission is valid
    return {
      valid: true,
      submissionTime,
      verdict: submission.verdict
    };
  } catch (error) {
    console.error('Verification error:', error);
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Verification failed'
    };
  }
}

// POST handler to submit a solution
export const POST = withAuth(async (req: NextRequest, user) => {
  try {
    // Get challenge ID from the URL
    const pathParts = req.nextUrl.pathname.split('/');
    const challengeId = pathParts[pathParts.length - 2]; // Get the second-to-last part
    
    if (!challengeId) {
      return NextResponse.json(
        { error: 'Challenge ID is required' },
        { status: 400 }
      );
    }
    
    // Parse and validate the request body
    const body = await req.json();
    const validation = submissionSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.format() },
        { status: 400 }
      );
    }
    
    const { problemId, submissionId } = body;
    
    // Fetch the challenge to check if it's in progress
    const challenge = await prisma.challenge.findUnique({
      where: { id: challengeId },
      include: {
        problems: true
      }
    });
    
    if (!challenge) {
      return NextResponse.json(
        { error: 'Challenge not found' },
        { status: 404 }
      );
    }
    
    // Check if the user is a participant in this challenge
    if (challenge.createdById !== user.id && challenge.joinedById !== user.id) {
      return NextResponse.json(
        { error: 'You are not a participant in this challenge' },
        { status: 403 }
      );
    }
    
    // Check if the challenge is in progress
    if (challenge.status !== 'IN_PROGRESS') {
      return NextResponse.json(
        { error: 'Challenge is not in progress' },
        { status: 400 }
      );
    }
    
    // Check if the problem belongs to this challenge
    const problemBelongsToChallenge = challenge.problems.some(p => p.id === problemId);
    if (!problemBelongsToChallenge) {
      return NextResponse.json(
        { error: 'Problem does not belong to this challenge' },
        { status: 400 }
      );
    }
    
    // Check if the user has already submitted a correct solution for this problem
    const existingSubmission = await prisma.submission.findFirst({
      where: {
        problemId,
        userId: user.id,
        verdict: 'OK'
      }
    });
    
    if (existingSubmission) {
      return NextResponse.json(
        { error: 'You have already solved this problem' },
        { status: 400 }
      );
    }
    
    // Verify the submission with Codeforces API
    const verification = await verifyCodeforcesSubmission(
      submissionId,
      problemId,
      user.id,
      challengeId
    );
    
    if (!verification.valid) {
      return NextResponse.json(
        { error: verification.error || 'Invalid submission' },
        { status: 400 }
      );
    }
    
    // Create the submission record
    const submission = await prisma.submission.create({
      data: {
        problemId,
        challengeId,
        userId: user.id,
        submissionId,
        submissionTime: verification.submissionTime as Date,
        verdict: verification.verdict
      }
    });
    
    // Instead of using Socket.IO directly, we emit via API response
    // This is because the client will use this response to update the UI and trigger a Socket.IO event
    // The client-side implementation will handle sending the solvedUpdate event
    
    // Check if all problems have been solved
    const userSolvedProblems = await prisma.submission.count({
      where: {
        challengeId,
        userId: user.id,
        verdict: 'OK'
      }
    });
    
    // If all problems are solved, check if we need to end the challenge
    if (userSolvedProblems === challenge.problems.length) {
      // Only end if created by this user or both users have completed
      let shouldEndChallenge = challenge.createdById === user.id;
      
      if (!shouldEndChallenge && challenge.joinedById) {
        const opponentSolvedProblems = await prisma.submission.count({
          where: {
            challengeId,
            userId: challenge.joinedById,
            verdict: 'OK'
          }
        });
        
        shouldEndChallenge = opponentSolvedProblems === challenge.problems.length;
      }
      
      if (shouldEndChallenge) {
        // Determine winner
        let winnerId: string | null = null;
        
        if (challenge.joinedById) {
          // Get all submissions for this challenge
          const allSubmissions = await prisma.submission.findMany({
            where: {
              challengeId,
              verdict: 'OK'
            },
            orderBy: {
              submissionTime: 'asc'
            }
          });
          
          // Count problems solved first by each user
          const scoreMap = new Map<string, number>();
          challenge.problems.forEach(problem => {
            const firstToSolve = allSubmissions.find(s => s.problemId === problem.id);
            if (firstToSolve) {
              const currentScore = scoreMap.get(firstToSolve.userId) || 0;
              scoreMap.set(firstToSolve.userId, currentScore + 1);
            }
          });
          
          // Determine winner based on most problems solved first
          const creatorScore = scoreMap.get(challenge.createdById) || 0;
          const opponentScore = scoreMap.get(challenge.joinedById) || 0;
          
          if (creatorScore > opponentScore) {
            winnerId = challenge.createdById;
          } else if (opponentScore > creatorScore) {
            winnerId = challenge.joinedById;
          } else {
            // In case of a tie, the first to complete all problems wins
            const userLastSubmission = allSubmissions
              .filter(s => s.userId === user.id)
              .sort((a, b) => new Date(b.submissionTime).getTime() - new Date(a.submissionTime).getTime())[0];
              
            const opponentLastSubmission = allSubmissions
              .filter(s => s.userId === challenge.joinedById)
              .sort((a, b) => new Date(b.submissionTime).getTime() - new Date(a.submissionTime).getTime())[0];
              
            if (userLastSubmission && opponentLastSubmission) {
              winnerId = new Date(userLastSubmission.submissionTime) < new Date(opponentLastSubmission.submissionTime)
                ? user.id : challenge.joinedById;
            }
          }
        } else {
          // Single player - they win
          winnerId = user.id;
        }
        
        // Update challenge as finished
        await prisma.challenge.update({
          where: { id: challengeId },
          data: {
            status: 'FINISHED',
            endTime: new Date(),
            winnerId
          }
        });
        
        // Emit the end challenge event
        await emitChallengeEnd(challengeId);
      }
    }
    
    // Return the submission
    return NextResponse.json({
      message: 'Submission successful',
      submission,
      problemSolved: {
        userId: user.id,
        problemId,
        time: verification.submissionTime
      }
    });
    
  } catch (error) {
    console.error('Submission error:', error);
    return NextResponse.json(
      { error: 'Failed to submit solution' },
      { status: 500 }
    );
  }
}); 