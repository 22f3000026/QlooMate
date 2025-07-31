'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getUser } from '../../lib/auth';

function SuccessPageContent() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check if there are any error parameters in the URL
        const errorParam = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');
        
        if (errorParam) {
          console.error('OAuth error:', errorParam, errorDescription);
          setError(`OAuth Error: ${errorParam}${errorDescription ? ` - ${errorDescription}` : ''}`);
          setLoading(false);
          return;
        }

        // Try to get the current user
        const currentUser = await getUser();
        if (currentUser) {
          console.log('User authenticated successfully:', currentUser);
          // Redirect to dashboard after successful authentication
          router.push('/dashboard');
        } else {
          setError('Authentication failed: No user data received');
          setLoading(false);
        }
      } catch (error) {
        console.error('Authentication error:', error);
        setError(`Authentication failed: ${error.message}`);
        setLoading(false);
      }
    };

    checkAuth();
  }, [searchParams, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="mt-4 text-xl font-semibold text-gray-900">Authentication Error</h2>
            <p className="mt-2 text-red-600">{error}</p>
            
            <div className="mt-6 space-y-3">
              <p className="text-sm text-gray-500">
                Common solutions:
              </p>
              <ul className="text-sm text-gray-500 text-left list-disc list-inside space-y-1">
                <li>Check that redirect URIs are configured correctly in Google Cloud Console</li>
                <li>Verify OAuth provider is enabled in Appwrite</li>
                <li>Ensure Client ID and Secret are correct</li>
                <li>Check browser console for additional error details</li>
              </ul>
            </div>
            
            <button
              onClick={() => router.push('/')}
              className="mt-6 w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null; // This should not be reached as we redirect on success
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <SuccessPageContent />
    </Suspense>
  );
} 