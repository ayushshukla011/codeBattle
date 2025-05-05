import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { emitTimerUpdate } from '@/lib/socket';

// POST handler to start a challenge and fetch random problems
export const POST = withAuth(async (req: NextRequest, user) => {
  try {
    // Get challenge ID from the URL
    const id = req.nextUrl.pathname.split('/')[3];
    
    if (!id) {
      return NextResponse.json(
        { error: 'Challenge ID is required' },
        { status: 400 }
      );
    }
    
    console.log(`Challenge start requested by user: ${user.id} for challenge: ${id}`);
    
    // Fetch the challenge
    const challenge = await prisma.challenge.findUnique({
      where: { id },
      include: {
        problems: true,
        joinedBy: {
          select: {
            id: true,
            email: true,
            codeforcesHandle: true
          }
        }
      }
    });
    
    if (!challenge) {
      return NextResponse.json(
        { error: 'Challenge not found' },
        { status: 404 }
      );
    }
    
    // Verify that the user is the creator of the challenge
    if (challenge.createdById !== user.id) {
      return NextResponse.json(
        { error: 'Only the challenge creator can start the challenge' },
        { status: 403 }
      );
    }
    
    // Verify that the challenge is in waiting state
    if (challenge.status !== 'WAITING') {
      return NextResponse.json(
        { error: 'Challenge has already started or finished' },
        { status: 400 }
      );
    }
    
    // Verify that someone has joined the challenge
    if (!challenge.joinedBy) {
      return NextResponse.json(
        { error: 'Cannot start challenge without an opponent' },
        { status: 400 }
      );
    }
    
    // Only fetch problems if we don't have them yet
    if (challenge.problems.length === 0) {
      // Get auth token from the original request
      const token = req.headers.get('authorization');
      
      // Fetch random problems from Codeforces
      const problemResponse = await fetch(
        `${req.nextUrl.origin}/api/codeforces/problems?minRating=${challenge.difficultyMin}&maxRating=${challenge.difficultyMax}&count=${challenge.problemCount}`,
        {
          headers: {
            'Authorization': token || ''
          }
        }
      );
      
      if (!problemResponse.ok) {
        const errorData = await problemResponse.json();
        console.error('Failed to fetch problems:', errorData);
        return NextResponse.json(
          { error: errorData.error || 'Failed to fetch problems' },
          { status: 502 }
        );
      }
      
      const problemData = await problemResponse.json();
      
      // Create problem records in the database
      for (const problem of problemData.problems) {
        await prisma.problem.create({
          data: {
            challengeId: id,
            contestId: problem.contestId,
            index: problem.index,
            title: problem.name
          }
        });
      }
    }
    
    // Set challenge to in-progress state with start time
    const startTime = new Date();
    const updatedChallenge = await prisma.challenge.update({
      where: { id },
      data: {
        status: 'IN_PROGRESS',
        startTime
      },
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
        problems: true,
        submissions: true
      }
    });
    
    // Set up timer for ending the challenge
    const durationMs = challenge.durationMinutes * 60 * 1000;
    
    // Use setTimeout for demo purposes
    // In a production app, you'd use a job queue system
    setTimeout(async () => {
      try {
        // Check if the challenge is still in progress
        const currentChallenge = await prisma.challenge.findUnique({
          where: { id },
          select: { status: true }
        });
        
        if (currentChallenge?.status === 'IN_PROGRESS') {
          // End the challenge
          await prisma.challenge.update({
            where: { id },
            data: {
              status: 'FINISHED',
              endTime: new Date()
            }
          });
        }
      } catch (error) {
        console.error('Error ending challenge:', error);
      }
    }, durationMs);
    
    // Setup timer updates
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
    }, 10000); // 10 seconds
    
    return NextResponse.json({
      message: 'Challenge started successfully',
      challenge: updatedChallenge
    });
    
  } catch (error) {
    console.error('Error starting challenge:', error);
    return NextResponse.json(
      { error: 'Failed to start challenge' },
      { status: 500 }
    );
  }
}); 