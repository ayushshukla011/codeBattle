'use client';

import { useParams, useSearchParams } from 'next/navigation';

// This is a wrapper for dynamic route components to properly handle params
export function useDynamicParams<T extends Record<string, string>>(): T {
  const params = useParams();
  
  // Convert the params to the expected type
  return params as T;
}

// This is a wrapper for dynamic route components to properly handle search params
export function useDynamicSearchParams(): Record<string, string | string[]> {
  const searchParams = useSearchParams();
  const params: Record<string, string | string[]> = {};
  
  // Convert URLSearchParams to a regular object
  searchParams.forEach((value, key) => {
    if (params[key]) {
      // If the key already exists, convert to array or push to existing array
      if (Array.isArray(params[key])) {
        (params[key] as string[]).push(value);
      } else {
        params[key] = [params[key] as string, value];
      }
    } else {
      params[key] = value;
    }
  });
  
  return params;
} 