'use client';

import { useRouter } from 'next/navigation';

export default function FailurePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="mt-4 text-xl font-semibold text-gray-900">Authentication Failed</h2>
          <p className="mt-2 text-gray-600">Sorry, we couldn't authenticate you with Google.</p>
          
          <div className="mt-6 space-y-3">
            <p className="text-sm text-gray-500">
              This could be due to:
            </p>
            <ul className="text-sm text-gray-500 text-left list-disc list-inside space-y-1">
              <li>You cancelled the authentication process</li>
              <li>There was an issue with the OAuth configuration</li>
              <li>Your Google account doesn't have the required permissions</li>
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