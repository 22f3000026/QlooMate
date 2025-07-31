'use client';

import { useState } from 'react';
import { fastLogin } from '../lib/auth';

export default function FastLoginPopup({ isOpen, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState('');
  const [error, setError] = useState('');

  const handleFastLogin = async () => {
    setLoading(true);
    setError('');
    setCurrentStep('Creating account...');

    try {
      // Simulate some delay for better UX
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setCurrentStep('Checking if email exists...');
      await new Promise(resolve => setTimeout(resolve, 800));
      
      setCurrentStep('Signing in...');
      await new Promise(resolve => setTimeout(resolve, 600));

      const result = await fastLogin('akdeepankar.in@gmail.com', 'ak123456');
      
      if (result.success) {
        if (result.action === 'CREATED_AND_SIGNED_IN') {
          setCurrentStep('Account created and logged in successfully!');
        } else {
          setCurrentStep('Email exists, signed in successfully!');
        }
        
        // Wait a moment to show success message
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        onSuccess();
      }
    } catch (error) {
      console.error('Fast login error:', error);
      setError('Login failed. Please try again.');
      setCurrentStep('');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-lg">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Fast Login
          </h3>
          
          {!loading && !currentStep && !error && (
            <div className="space-y-4">
              <p className="text-gray-600 text-sm">
                Click the button below to quickly create an account or sign in with:
              </p>
              <div className="bg-gray-50 rounded-lg p-3 text-sm">
                <p><strong>Email:</strong> akdeepankar.in@gmail.com</p>
                <p><strong>Password:</strong> ak123456</p>
              </div>
              <button
                onClick={handleFastLogin}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Start Fast Login
              </button>
            </div>
          )}

          {loading && (
            <div className="space-y-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 text-sm">{currentStep}</p>
            </div>
          )}

          {error && (
            <div className="space-y-4">
              <div className="text-red-600 text-sm">{error}</div>
              <button
                onClick={() => {
                  setError('');
                  setCurrentStep('');
                }}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          )}

          <button
            onClick={onClose}
            className="mt-4 text-gray-500 hover:text-gray-700 text-sm"
            disabled={loading}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
} 