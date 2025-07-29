'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import GoogleSignIn from "../components/GoogleSignIn";
import { getUser } from "../lib/auth";

export default function Home() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      try {
        const currentUser = await getUser();
        if (currentUser) {
          router.push('/dashboard');
        } else {
          setUser(null);
        }
      } catch (error) {
        console.log('User not authenticated');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    checkUser();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
          <p className="text-gray-600 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo and Brand */}
        <div className="text-center mb-8">
          <div className="h-16 w-16 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-2xl">Q</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome to Qloo Hack
          </h1>
          <p className="text-gray-600">
            Sign in with your Google account to manage your emails
          </p>
        </div>

        {/* Sign In Card */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <GoogleSignIn />
        </div>

        {/* Links */}
        <div className="text-center mt-6 space-y-2">
          <a
            href="/test-oauth"
            className="text-blue-600 hover:text-blue-800 text-sm underline block"
          >
            Test OAuth Configuration
          </a>
          <a
            href="/debug"
            className="text-blue-600 hover:text-blue-800 text-sm underline block"
          >
            Debug OAuth Configuration
          </a>
          <a
            href="/OAUTH_REDIRECT_SETUP.md"
            className="text-blue-600 hover:text-blue-800 text-sm underline block"
            target="_blank"
          >
            OAuth Setup Guide
          </a>
        </div>
      </div>
    </div>
  );
}
