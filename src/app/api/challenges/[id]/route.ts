import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { emitChallengeEnd, emitTimerUpdate } from '@/lib/socket';

// GET handler to fetch challenge details
export const GET = withAuth(async (req: NextRequest, user) => {
  try {
    const id = req.nextUrl.pathname.split('/').pop();
    
    if (!id) {
      return NextResponse.json(
        { error: 'Challenge ID is required' },
        { status: 400 }
      );
    }
    
    // Fetch the challenge with all related data
    const challenge = await prisma.challenge.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: {
            id: true,
            email: true,
            codeforcesHandle: true
          }
        },
        joinedBy: {
          select: {
            id: true,
            email: true,
            codeforcesHandle: true
          }
        },
        winner: {
          select: {
            id: true,
            email: true,
            codeforcesHandle: true
          }
        },
        problems: true,
        submissions: true
      }
    });
    
    if (!challenge) {
      return NextResponse.json(
        { error: 'Challenge not found' },
        { status: 404 }
      );
    }
    
    // Check if the user has permission to view this challenge
    if (challenge.createdById !== user.id && challenge.joinedById !== user.id) {
      return NextResponse.json(
        { error: 'You do not have permission to view this challenge' },
        { status: 403 }
      );
    }
    
    // Get the server's current time for accurate time calculation
    const serverCurrentTime = new Date();
    
    // Calculate time left if challenge is in progress
    let timeLeft = null;
    if (challenge.status === 'IN_PROGRESS' && challenge.startTime && challenge.durationMinutes) {
      // Calculate based on server time as the source of truth
      const endTimeMs = new Date(challenge.startTime).getTime() + (challenge.durationMinutes * 60 * 1000);
      const currentTimeMs = serverCurrentTime.getTime();
      timeLeft = Math.max(0, Math.floor((endTimeMs - currentTimeMs) / 1000));
      
      // Check if time is up but challenge status hasn't been updated yet
      if (timeLeft === 0 && challenge.status === 'IN_PROGRESS') {
        // Auto-update the challenge to FINISHED status
        await prisma.challenge.update({
          where: { id },
          data: {
            status: 'FINISHED',
            endTime: serverCurrentTime
          }
        });
        
        // After updating, emit the challenge end event
        await emitChallengeEnd(id);
      }
    }
    
    return NextResponse.json({ 
      challenge,
      timeLeft,
      serverTime: serverCurrentTime.toISOString()
    });
    
  } catch (error) {
    console.error('Error fetching challenge:', error);
    return NextResponse.json(
      { error: 'Failed to fetch challenge' },
      { status: 500 }
    );
  }
});

// PUT handler to update challenge status
export const PUT = withAuth(async (req: NextRequest, user) => {
  try {
    const id = req.nextUrl.pathname.split('/').pop();
    
    if (!id) {
      return NextResponse.json(
        { error: 'Challenge ID is required' },
        { status: 400 }
      );
    }
    
    const body = await req.json();
    const { status } = body;
    
    // Validate status
    if (!status || !['WAITING', 'IN_PROGRESS', 'FINISHED'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      );
    }
    
    // Fetch the challenge
    const challenge = await prisma.challenge.findUnique({
      where: { id }
    });
    
    if (!challenge) {
      return NextResponse.json(
        { error: 'Challenge not found' },
        { status: 404 }
      );
    }
    
    // Check if the user has permission to update this challenge
    if (challenge.createdById !== user.id) {
      return NextResponse.json(
        { error: 'You do not have permission to update this challenge' },
        { status: 403 }
      );
    }
    
    // Update the challenge with appropriate timestamps
    let updateData: any = { status };
    
    if (status === 'IN_PROGRESS' && !challenge.startTime) {
      const startTime = new Date();
      updateData.startTime = startTime;
      
      // Start the challenge timer if there's a duration
      if (challenge.durationMinutes) {
        // Start a background timer to end the challenge automatically
        const durationMs = challenge.durationMinutes * 60 * 1000;
        
        // We're using a simpler approach here with timeout
        // In production, you would use a job queue system or similar
        // since setTimeout won't survive server restarts
        setTimeout(async () => {
          try {
            // Check if the challenge is still in progress
            const currentChallenge = await prisma.challenge.findUnique({
              where: { id },
              select: { status: true }
            });
            
            if (currentChallenge?.status === 'IN_PROGRESS') {
              // Determine the winner based on submissions
              const submissions = await prisma.submission.findMany({
                where: { challengeId: id },
                orderBy: { submissionTime: 'asc' }
              });
              
              // Find the user with the most correct submissions
              const userScores = new Map<string, number>();
              submissions.forEach(sub => {
                if (sub.verdict === 'OK') {
                  const currentScore = userScores.get(sub.userId) || 0;
                  userScores.set(sub.userId, currentScore + 1);
                }
              });
              
              // Find the user with the highest score
              let winnerId: string | null = null;
              let highestScore = 0;
              
              for (const [userId, score] of userScores.entries()) {
                if (score > highestScore) {
                  highestScore = score;
                  winnerId = userId;
                }
              }
              
              // Update the challenge as finished
              await prisma.challenge.update({
                where: { id },
                data: {
                  status: 'FINISHED',
                  endTime: new Date(),
                  winnerId
                }
              });
              
              // Emit end challenge event
              await emitChallengeEnd(id);
            }
          } catch (error) {
            console.error('Error ending challenge:', error);
          }
        }, durationMs);
        
        // Setup timer tick emitter
        // Emit updates every minute (or could be more frequent)
        const tickInterval = setInterval(async () => {
          try {
            // Check if the challenge is still in progress
            const currentChallenge = await prisma.challenge.findUnique({
              where: { id },
              select: { status: true, startTime: true, durationMinutes: true }
            });
            
            if (currentChallenge?.status !== 'IN_PROGRESS') {
              clearInterval(tickInterval);
              return;
            }
            
            if (currentChallenge.startTime && currentChallenge.durationMinutes) {
              const endTimeMs = new Date(currentChallenge.startTime).getTime() + 
                (currentChallenge.durationMinutes * 60 * 1000);
              const currentTimeMs = Date.now();
              const timeLeft = Math.max(0, Math.floor((endTimeMs - currentTimeMs) / 1000));
              
              // Emit the timer tick
              emitTimerUpdate(id, timeLeft);
              
              // If time is up, clear the interval
              if (timeLeft <= 0) {
                clearInterval(tickInterval);
              }
            }
          } catch (error) {
            console.error('Error in timer tick:', error);
          }
        }, 60000); // 60 seconds = 1 minute
      }
    } else if (status === 'FINISHED' && !challenge.endTime) {
      updateData.endTime = new Date();
      
      // Determine the winner based on submissions
      const submissions = await prisma.submission.findMany({
        where: { challengeId: id },
        orderBy: { submissionTime: 'asc' }
      });
      
      // Count problems solved first by each user
      const problemFirstSolvers = new Map<string, Set<string>>();
      const processedProblems = new Set<string>();
      
      submissions.forEach(sub => {
        if (sub.verdict === 'OK' && !processedProblems.has(sub.problemId)) {
          processedProblems.add(sub.problemId);
          
          if (!problemFirstSolvers.has(sub.userId)) {
            problemFirstSolvers.set(sub.userId, new Set());
          }
          
          problemFirstSolvers.get(sub.userId)?.add(sub.problemId);
        }
      });
      
      // Determine winner based on most problems solved first
      let winnerId: string | null = null;
      let highestScore = 0;
      
      for (const [userId, problems] of problemFirstSolvers.entries()) {
        if (problems.size > highestScore) {
          highestScore = problems.size;
          winnerId = userId;
        } else if (problems.size === highestScore && winnerId) {
          // In case of a tie, the user who finished all their problems first wins
          const user1LastSubmission = submissions
            .filter(s => s.userId === winnerId)
            .sort((a, b) => 
              new Date(b.submissionTime).getTime() - new Date(a.submissionTime).getTime()
            )[0];
          
          const user2LastSubmission = submissions
            .filter(s => s.userId === userId)
            .sort((a, b) => 
              new Date(b.submissionTime).getTime() - new Date(a.submissionTime).getTime()
            )[0];
          
          if (user1LastSubmission && user2LastSubmission) {
            if (new Date(user2LastSubmission.submissionTime) < new Date(user1LastSubmission.submissionTime)) {
              winnerId = userId;
            }
          }
        }
      }
      
      updateData.winnerId = winnerId;
      
      // Emit end challenge event after update
      setTimeout(() => emitChallengeEnd(id), 100);
    }
    
    // Update the challenge
    const updatedChallenge = await prisma.challenge.update({
      where: { id },
      data: updateData,
      include: {
        createdBy: {
          select: {
            id: true,
            email: true,
            codeforcesHandle: true
          }
        },
        joinedBy: {
          select: {
            id: true,
            email: true,
            codeforcesHandle: true
          }
        },
        winner: {
          select: {
            id: true,
            email: true,
            codeforcesHandle: true
          }
        },
        problems: true,
        submissions: true
      }
    });
    
    return NextResponse.json({ 
      message: 'Challenge updated successfully',
      challenge: updatedChallenge
    });
    
  } catch (error) {
    console.error('Error updating challenge:', error);
    return NextResponse.json(
      { error: 'Failed to update challenge' },
      { status: 500 }
    );
  }
}); 