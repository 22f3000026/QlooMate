'use client';

import { useState } from 'react';
import { account, client } from '../../lib/appwrite';
import { getUser } from '../../lib/auth';

export default function DebugPage() {
  const [config, setConfig] = useState(null);
  const [error, setError] = useState(null);

  const checkConfig = async () => {
    try {
      setError(null);
      
      // Check client configuration
      const clientConfig = {
        endpoint: client.config.endpoint,
        project: client.config.project,
        selfSigned: client.config.selfSigned
      };
      
      console.log('Client config:', clientConfig);
      setConfig(clientConfig);
      
      // Try to get account info to test connection
      try {
        const user = await getUser();
        if (user) {
          console.log('Current user:', user);
        } else {
          console.log('No current user (expected)');
        }
      } catch (err) {
        console.log('No current user (expected):', err.message);
      }
      
    } catch (err) {
      console.error('Config error:', err);
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">
          OAuth Debug Page
        </h1>

        <button
          onClick={checkConfig}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors mb-4"
        >
          Check Configuration
        </button>

        {config && (
          <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-4">
            <h3 className="text-lg font-semibold text-green-800">✅ Configuration</h3>
            <div className="mt-2 space-y-1 text-sm text-green-700">
              <p><strong>Endpoint:</strong> {config.endpoint}</p>
              <p><strong>Project ID:</strong> {config.project}</p>
              <p><strong>Self Signed:</strong> {config.selfSigned ? 'Yes' : 'No'}</p>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
            <h3 className="text-lg font-semibold text-red-800">❌ Error</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        )}

        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <h3 className="text-lg font-semibold text-yellow-800">🔧 Troubleshooting Steps</h3>
          <div className="mt-2 space-y-2 text-sm text-yellow-700">
            <p><strong>1.</strong> Verify your Google Cloud Console OAuth configuration</p>
            <p><strong>2.</strong> Check that redirect URIs include:</p>
            <ul className="ml-4 list-disc">
              <li>https://nyc.cloud.appwrite.io/v1/account/sessions/oauth2/callback/google</li>
              <li>http://localhost:3000/success</li>
              <li>http://localhost:3000/failure</li>
            </ul>
            <p><strong>3.</strong> Ensure Google OAuth is enabled in Appwrite</p>
            <p><strong>4.</strong> Verify Client ID and Secret are correct</p>
          </div>
        </div>

        <div className="mt-6 text-center">
          <a
            href="/"
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            ← Back to Home
          </a>
        </div>
      </div>
    </div>
  );
} 