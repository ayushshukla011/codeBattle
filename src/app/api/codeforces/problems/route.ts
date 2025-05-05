import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET handler to fetch random Codeforces problems
export const GET = withAuth(async (req: NextRequest, user) => {
  try {
    const url = new URL(req.url);
    const minRating = parseInt(url.searchParams.get('minRating') || '800');
    const maxRating = parseInt(url.searchParams.get('maxRating') || '3500');
    const count = parseInt(url.searchParams.get('count') || '5');
    
    // Validate params
    if (isNaN(minRating) || isNaN(maxRating) || isNaN(count) || 
        minRating < 800 || maxRating > 3500 || count < 1 || count > 10) {
      return NextResponse.json(
        { error: 'Invalid parameters' },
        { status: 400 }
      );
    }
    
    // Fetch problems from Codeforces API
    const response = await fetch('https://codeforces.com/api/problemset.problems');
    
    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch problems from Codeforces' },
        { status: 502 }
      );
    }
    
    const data = await response.json();
    
    if (data.status !== 'OK') {
      return NextResponse.json(
        { error: data.comment || 'Codeforces API error' },
        { status: 502 }
      );
    }
    
    // Filter problems by rating
    const filteredProblems = data.result.problems.filter((problem: any) => {
      return problem.rating && problem.rating >= minRating && problem.rating <= maxRating;
    });
    
    if (filteredProblems.length === 0) {
      return NextResponse.json(
        { error: 'No problems found in the specified rating range' },
        { status: 404 }
      );
    }
    
    // Shuffle the array to get random problems
    const shuffledProblems = [...filteredProblems].sort(() => Math.random() - 0.5);
    
    // Take the required number of problems
    const selectedProblems = shuffledProblems.slice(0, count);
    
    // Map to a simpler format
    const formattedProblems = selectedProblems.map((problem: any) => ({
      contestId: problem.contestId,
      index: problem.index,
      name: problem.name,
      rating: problem.rating,
      tags: problem.tags
    }));
    
    return NextResponse.json({ problems: formattedProblems });
  } catch (error) {
    console.error('Error fetching Codeforces problems:', error);
    return NextResponse.json(
      { error: 'Failed to fetch problems' },
      { status: 500 }
    );
  }
}); 