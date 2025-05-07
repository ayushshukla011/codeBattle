import JoinByCodeClientWrapper from './client-wrapper';

// Server component that doesn't directly use params to avoid the PageProps type issue
export default function Page() {
  return <JoinByCodeClientWrapper />;
}

// These exports help Next.js understand how to handle this dynamic route
export const dynamic = 'auto';
export const dynamicParams = true; 