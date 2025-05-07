'use client';

import { Suspense } from 'react';
import { useDynamicParams } from '@/lib/dynamic-route-wrapper';
import ResultsPage from './client';

// This is a client component wrapper that can safely access dynamic route params
export default function ResultsClientWrapper() {
  // Use our helper to get the params
  const params = useDynamicParams<{ id: string }>();
  
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResultsPage id={params.id} />
    </Suspense>
  );
} 