import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';

// Validation schema for joining a challenge
const joinChallengeSchema = z.object({
  code: z.string().min(1).max(10)
});

// Handler to join a challenge by code
export const POST = withAuth(async (req: NextRequest, user) => {
  try {
    const body = await req.json();
    
    // Validate input
    const validation = joinChallengeSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.format() },
        { status: 400 }
      );
    }
    
    const { code } = body;
    
    // Find the challenge
    const challenge = await prisma.challenge.findUnique({
      where: { code },
      include: {
        createdBy: {
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
    
    // Check if the challenge is waiting
    if (challenge.status !== 'WAITING') {
      return NextResponse.json(
        { error: 'This challenge has already started or finished' },
        { status: 400 }
      );
    }
    
    // Check if the user is the creator (can't join own challenge)
    if (challenge.createdById === user.id) {
      return NextResponse.json(
        { error: 'You cannot join your own challenge' },
        { status: 400 }
      );
    }
    
    // Check if the challenge is already joined
    if (challenge.joinedById) {
      return NextResponse.json(
        { error: 'This challenge is already full' },
        { status: 400 }
      );
    }
    
    // Join the challenge
    const updatedChallenge = await prisma.challenge.update({
      where: { id: challenge.id },
      data: {
        joinedById: user.id
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
        problems: true
      }
    });
    
    return NextResponse.json({
      message: 'Challenge joined successfully',
      challenge: updatedChallenge
    });
    
  } catch (error) {
    console.error('Join challenge error:', error);
    return NextResponse.json(
      { error: 'Failed to join challenge' },
      { status: 500 }
    );
  }
}); 