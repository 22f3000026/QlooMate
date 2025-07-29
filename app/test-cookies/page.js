'use client';

import { useState } from 'react';

export default function TestCookiesPage() {
  const [cookieData, setCookieData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const checkCookies = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/debug/cookies');
      const data = await response.json();
      
      if (response.ok) {
        setCookieData(data);
      } else {
        setError(data.error || 'Failed to get cookies');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6 text-center">
          Cookie Debug Page
        </h1>

        <button
          onClick={checkCookies}
          disabled={loading}
          className="w-full max-w-md mx-auto block bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors mb-6 disabled:bg-gray-400"
        >
          {loading ? 'Checking Cookies...' : 'Check Available Cookies'}
        </button>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
            <h3 className="text-lg font-semibold text-red-800">❌ Error</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        )}

        {cookieData && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                All Cookies ({cookieData.totalCookies})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {cookieData.allCookies.map((cookie, index) => (
                  <div key={index} className="border rounded p-3">
                    <p className="font-medium text-gray-900">{cookie.name}</p>
                    <p className="text-sm text-gray-600">{cookie.value}</p>
                    <p className="text-xs text-gray-500">
                      Has Value: {cookie.hasValue ? 'Yes' : 'No'}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Potential Appwrite Session Cookies
              </h2>
              {cookieData.appwriteCookies.length > 0 ? (
                <div className="space-y-2">
                  {cookieData.appwriteCookies.map((cookie, index) => (
                    <div key={index} className="border rounded p-3 bg-green-50">
                      <p className="font-medium text-green-900">{cookie.name}</p>
                      <p className="text-sm text-green-700">
                        Has Value: {cookie.hasValue ? 'Yes' : 'No'}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600">No potential Appwrite session cookies found.</p>
              )}
            </div>
          </div>
        )}

        <div className="mt-8 text-center">
          <a
            href="/dashboard"
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            ← Back to Dashboard
          </a>
        </div>
      </div>
    </div>
  );
} 