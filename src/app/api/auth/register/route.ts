import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import prisma from '@/lib/prisma';
import { z } from 'zod';

// Validation schema
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  codeforcesHandle: z.string().min(2)
});

// Function to validate a Codeforces handle
async function validateCodeforcesHandle(handle: string): Promise<boolean> {
  try {
    const response = await fetch(`https://codeforces.com/api/user.info?handles=${handle}`);
    const data = await response.json();
    
    // If the status is OK and we have at least one user result, the handle is valid
    return data.status === 'OK' && Array.isArray(data.result) && data.result.length > 0;
  } catch (error) {
    console.error('Error validating Codeforces handle:', error);
    return false;
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Validate input
    const validation = registerSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.format() },
        { status: 400 }
      );
    }
    
    const { email, password, codeforcesHandle } = body;

    // Check if user exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { codeforcesHandle }
        ]
      }
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists with this email or Codeforces handle' },
        { status: 409 }
      );
    }
    
    // Validate the Codeforces handle
    const isValidHandle = await validateCodeforcesHandle(codeforcesHandle);
    if (!isValidHandle) {
      return NextResponse.json(
        { error: 'Invalid Codeforces handle. Please enter a valid handle.' },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        codeforcesHandle
      }
    });

    // Remove sensitive data
    const { passwordHash: _, ...userWithoutPassword } = user;

    return NextResponse.json({ 
      message: 'User registered successfully',
      user: userWithoutPassword
    }, { status: 201 });
    
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 500 }
    );
  }
} 