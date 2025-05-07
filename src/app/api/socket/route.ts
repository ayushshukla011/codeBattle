import { NextRequest, NextResponse } from 'next/server';
import { initSocket } from '@/lib/socket';
import { Server as ServerIO } from 'socket.io';
import { createServer } from 'http';

// This route is needed to initialize Socket.IO
export async function GET(req: NextRequest) {
  try {
    // In App Router, we need to use a different approach to initialize Socket.IO
    // as we don't have direct access to the response object with socket
    
    // The actual Socket.IO initialization is handled in the server.ts file
    return new NextResponse('Socket.IO server is running', { status: 200 });
  } catch (error) {
    console.error('Socket initialization error:', error);
    return new NextResponse('Failed to start Socket.IO server', { status: 500 });
  }
}

// Required for Socket.IO to work with Next.js App Router
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs'; 