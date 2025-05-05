import { NextRequest, NextResponse } from 'next/server';
import { initSocket, NextApiResponseWithSocket } from '@/lib/socket';

// This route is needed to initialize Socket.IO
export async function GET(req: NextRequest, res: NextApiResponseWithSocket) {
  try {
    // Initialize Socket.IO if not already initialized
    if (res.socket && res.socket.server && !res.socket.server.io) {
      initSocket(res);
    }
    
    return new NextResponse('Socket.IO server is running', { status: 200 });
  } catch (error) {
    console.error('Socket initialization error:', error);
    return new NextResponse('Failed to start Socket.IO server', { status: 500 });
  }
}

// Required for Socket.IO to work with Next.js App Router
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs'; 