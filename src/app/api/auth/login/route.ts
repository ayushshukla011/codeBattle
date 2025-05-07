import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '@/lib/prisma';
import { z } from 'zod';

// Validation schema
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

// Environment variable schema
const envSchema = z.object({
  JWT_SECRET: z.string(),
  JWT_EXPIRATION: z.string().optional()
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Validate input
    const validation = loginSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.format() },
        { status: 400 }
      );
    }
    
    const { email, password } = body;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Check password
    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Check for JWT secret
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('JWT_SECRET is not set in environment variables');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Generate JWT
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        codeforcesHandle: user.codeforcesHandle
      },
      jwtSecret,
      {
        expiresIn: '7d',
        algorithm: 'HS256'
      }
    );

    // Remove sensitive data
    const { passwordHash: _, ...userWithoutPassword } = user;

    return NextResponse.json({
      message: 'Login successful',
      user: userWithoutPassword,
      token
    });
    
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    );
  }
} 