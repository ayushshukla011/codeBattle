import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { prisma } from './prisma';

export interface AuthUser {
  id: string;
  email: string;
  codeforcesHandle: string;
}

export async function getAuthUser(req: NextRequest): Promise<AuthUser | null> {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return null;
    }
    
    const decoded = jwt.verify(
      token, 
      process.env.JWT_SECRET || 'fallback-secret-key'
    ) as AuthUser;
    
    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: decoded.id }
    });
    
    if (!user) {
      return null;
    }
    
    return {
      id: user.id,
      email: user.email,
      codeforcesHandle: user.codeforcesHandle
    };
  } catch (error) {
    console.error('Auth error:', error);
    return null;
  }
}

export function withAuth(
  handler: (req: NextRequest, user: AuthUser) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    const user = await getAuthUser(req);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    return handler(req, user);
  };
} 