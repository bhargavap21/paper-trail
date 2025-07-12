'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    // Handle OAuth callback here
    // The OAuth library will handle the token exchange automatically
    // Redirect back to the main app
    const timer = setTimeout(() => {
      router.push('/');
    }, 2000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Authentication Successful</h1>
        <p>Redirecting you back to the application...</p>
      </div>
    </div>
  );
} 