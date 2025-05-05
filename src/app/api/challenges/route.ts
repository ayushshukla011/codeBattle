import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';

// Validation schema for creating a challenge
const createChallengeSchema = z.object({
  difficultyMin: z.number().min(800).max(3500),
  difficultyMax: z.number().min(800).max(3500),
  problemCount: z.number().min(1).max(10),
  durationMinutes: z.number().min(15).max(180)
});

// Handler to create a new challenge
export const POST = withAuth(async (req: NextRequest, user) => {
  try {
    const body = await req.json();
    
    // Validate input
    const validation = createChallengeSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.format() },
        { status: 400 }
      );
    }
    
    const { difficultyMin, difficultyMax, problemCount, durationMinutes } = body;
    
    // Generate a unique code for the challenge
    const code = generateUniqueCode();
    
    // Create the challenge
    const challenge = await prisma.challenge.create({
      data: {
        code,
        difficultyMin,
        difficultyMax,
        problemCount,
        durationMinutes,
        createdById: user.id,
        status: 'WAITING'
      }
    });
    
    return NextResponse.json({ 
      message: 'Challenge created successfully',
      challenge
    }, { status: 201 });
    
  } catch (error) {
    console.error('Challenge creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create challenge' },
      { status: 500 }
    );
  }
});

// Handler to get all challenges for the current user
export const GET = withAuth(async (req: NextRequest, user) => {
  try {
    const challenges = await prisma.challenge.findMany({
      where: {
        OR: [
          { createdById: user.id },
          { joinedById: user.id }
        ]
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    return NextResponse.json({ challenges });
    
  } catch (error) {
    console.error('Fetch challenges error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch challenges' },
      { status: 500 }
    );
  }
});

// Helper function to generate a unique code
function generateUniqueCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
} 