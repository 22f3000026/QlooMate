import { useState, useEffect } from 'react';

export default function TelegramPopup({ isOpen, onClose, onSave, currentChatId = '' }) {
  const [chatId, setChatId] = useState(currentChatId);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [step1Completed, setStep1Completed] = useState(false);

  useEffect(() => {
    setChatId(currentChatId);
  }, [currentChatId]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!chatId.trim()) {
      setError('Please enter your Telegram chat ID');
      return;
    }

    // Basic validation for Telegram chat ID format
    const chatIdRegex = /^-?\d+$/;
    if (!chatIdRegex.test(chatId.trim())) {
      setError('Please enter a valid Telegram chat ID (numbers only)');
      return;
    }

    setIsLoading(true);
    try {
      await onSave(chatId.trim());
      onClose();
    } catch (error) {
      setError(error.message || 'Failed to save Telegram chat ID');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQlooMateBotClick = () => {
    setStep1Completed(true);
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/20 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center">
              <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {currentChatId ? 'Edit Telegram Chat ID' : 'Connect Telegram'}
                </h3>
                <p className="text-sm text-gray-500">
                  {currentChatId ? 'Update your Telegram chat ID' : 'Get your chat ID to receive notifications'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <svg className="h-5 w-5 text-green-600 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-sm text-green-800">
                  <p className="font-medium mb-1">Two-Step Setup</p>
                  <p className="text-green-700">
                    Follow these steps to connect your Telegram account!
                  </p>
                </div>
              </div>
            </div>

            {/* Step 1: Enable QlooMateBot */}
            <div className={`border rounded-lg p-4 mb-4 transition-colors ${
              step1Completed 
                ? 'border-green-200 bg-green-50' 
                : 'border-blue-200'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-900">Step 1: Enable Notifications</h4>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  step1Completed
                    ? 'bg-green-100 text-green-800'
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {step1Completed ? 'Completed' : 'Required'}
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                First, enable our bot to send you notifications
              </p>
              <a 
                href="https://t.me/QlooMateBot" 
                target="_blank" 
                rel="noopener noreferrer"
                onClick={handleQlooMateBotClick}
                className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                Open @QlooMateBot
              </a>
              <div className={`mt-3 text-xs ${
                step1Completed ? 'text-green-700' : 'text-blue-700'
              }`}>
                {step1Completed ? '✅ Step completed! Now proceed to Step 2' : 'Send "hello" to enable receiving messages'}
              </div>
            </div>

            {/* Step 2: Get Chat ID */}
            <div className={`border rounded-lg p-4 mb-6 transition-colors ${
              step1Completed 
                ? 'border-blue-200 bg-blue-50' 
                : 'border-gray-200'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-900">Step 2: Get Your Chat ID</h4>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  step1Completed
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {step1Completed ? 'Next Step' : 'Required'}
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                Get your chat ID to complete the connection
              </p>
              <a 
                href="https://t.me/userinfobot" 
                target="_blank" 
                rel="noopener noreferrer"
                className={`inline-flex items-center px-4 py-2 text-white text-sm font-medium rounded-lg transition-colors ${
                  step1Completed
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'bg-gray-600 hover:bg-gray-700'
                }`}
              >
                <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                Open @userinfobot
              </a>
              <div className={`mt-3 text-xs ${
                step1Completed ? 'text-blue-700' : 'text-gray-700'
              }`}>
                {step1Completed ? '🚀 Ready! Click the button above to get your chat ID' : 'Send "hello" to get your chat ID'}
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <svg className="h-5 w-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Complete Setup Process:</p>
                  <ol className="list-decimal list-inside space-y-1 text-blue-700">
                    <li>Click "Open @QlooMateBot" and send "hello" to enable notifications</li>
                    <li>Click "Open @userinfobot" and send "hello" to get your chat ID</li>
                    <li>Copy the chat ID from @userinfobot's reply</li>
                    <li>Paste the chat ID below and save</li>
                  </ol>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label htmlFor="chatId" className="block text-sm font-medium text-gray-700 mb-2">
                  Chat ID from Bot
                </label>
                <input
                  type="text"
                  id="chatId"
                  value={chatId}
                  onChange={(e) => setChatId(e.target.value)}
                  placeholder="Paste the chat ID from the bot's reply"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={isLoading}
                />
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                    isLoading
                      ? 'bg-gray-300 cursor-not-allowed'
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  }`}
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </div>
                  ) : (
                    currentChatId ? 'Update' : 'Save Chat ID'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
} 