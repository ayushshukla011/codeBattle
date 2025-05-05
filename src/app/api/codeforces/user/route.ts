import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET handler to fetch Codeforces user data
export const GET = withAuth(async (req: NextRequest, user) => {
  try {
    // Get the user's Codeforces handle
    const userData = await prisma.user.findUnique({
      where: { id: user.id },
      select: { codeforcesHandle: true }
    });

    if (!userData || !userData.codeforcesHandle) {
      return NextResponse.json(
        { error: 'Codeforces handle not found for user' },
        { status: 404 }
      );
    }

    const handle = userData.codeforcesHandle;

    // Fetch user info from Codeforces API
    const userInfoResponse = await fetch(`https://codeforces.com/api/user.info?handles=${handle}`);
    if (!userInfoResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch user info from Codeforces' },
        { status: 502 }
      );
    }

    const userInfoData = await userInfoResponse.json();
    if (userInfoData.status !== 'OK') {
      return NextResponse.json(
        { error: userInfoData.comment || 'Codeforces API error' },
        { status: 502 }
      );
    }

    // Fetch user rating history from Codeforces API
    const ratingResponse = await fetch(`https://codeforces.com/api/user.rating?handle=${handle}`);
    if (!ratingResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch rating history from Codeforces' },
        { status: 502 }
      );
    }

    const ratingData = await ratingResponse.json();
    if (ratingData.status !== 'OK') {
      return NextResponse.json(
        { error: ratingData.comment || 'Codeforces API error' },
        { status: 502 }
      );
    }

    // Get the basic user info
    const userInfo = userInfoData.result[0];

    // Calculate some statistics from rating history
    const ratingHistory = ratingData.result;
    const currentRating = userInfo.rating || 0;
    const maxRating = userInfo.maxRating || 0;
    const contestCount = ratingHistory.length;
    const lastContestDate = contestCount > 0 
      ? new Date(ratingHistory[contestCount - 1].ratingUpdateTimeSeconds * 1000).toISOString()
      : null;
    
    // Calculate rank change over time
    const rankChange = contestCount >= 2 
      ? ratingHistory[contestCount - 1].newRating - ratingHistory[contestCount - 2].newRating 
      : 0;

    return NextResponse.json({
      handle: userInfo.handle,
      rating: currentRating,
      maxRating: maxRating,
      rank: userInfo.rank,
      maxRank: userInfo.maxRank,
      titlePhoto: userInfo.titlePhoto,
      avatar: userInfo.avatar,
      contestCount,
      lastContestDate,
      rankChange,
      ratingHistory: ratingHistory.map((contest: {
        contestId: number;
        contestName: string;
        rank: number;
        oldRating: number;
        newRating: number;
        ratingUpdateTimeSeconds: number;
      }) => ({
        contestId: contest.contestId,
        contestName: contest.contestName,
        rank: contest.rank,
        oldRating: contest.oldRating,
        newRating: contest.newRating,
        date: new Date(contest.ratingUpdateTimeSeconds * 1000).toISOString()
      })).slice(-5) // Return only last 5 contests for brevity
    });
  } catch (error) {
    console.error('Error fetching Codeforces user data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user data' },
      { status: 500 }
    );
  }
}); 