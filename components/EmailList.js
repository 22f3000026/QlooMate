import { useState } from 'react';
import { formatEmailDate, extractSenderName } from '../lib/gmail';

export default function EmailList({ emails, loading, error, onEmailClick }) {
  const [selectedEmail, setSelectedEmail] = useState(null);

  const handleEmailClick = (email) => {
    setSelectedEmail(email);
    if (onEmailClick) {
      onEmailClick(email);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-8 shadow-sm">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
          <p className="text-gray-600 text-sm">Loading emails...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="text-center">
          <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Emails</h3>
          <p className="text-gray-600 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!emails || emails.length === 0) {
    return (
      <div className="bg-white rounded-xl p-8 shadow-sm">
        <div className="text-center">
          <div className="h-12 w-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Emails Found</h3>
                        <p className="text-gray-600 text-sm">Click &quot;Fetch Emails&quot; to load your Gmail messages.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">
            Your Emails
          </h3>
          <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
            {emails.length} messages
          </span>
        </div>
      </div>
      
      {/* Email List */}
      <div className="divide-y divide-gray-100">
        {emails.map((email) => (
          <div
            key={email.id}
            onClick={() => handleEmailClick(email)}
            className={`px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors ${
              selectedEmail?.id === email.id ? 'bg-blue-50' : ''
            }`}
          >
            <div className="flex items-start space-x-3">
              {/* Unread indicator */}
              {!email.isRead && (
                <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
              )}
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <p className={`text-sm font-medium truncate ${
                    !email.isRead ? 'text-gray-900' : 'text-gray-700'
                  }`}>
                    {extractSenderName(email.from)}
                  </p>
                  <p className="text-xs text-gray-500 flex-shrink-0 ml-2">
                    {formatEmailDate(email.date)}
                  </p>
                </div>
                
                <p className={`text-sm truncate mb-1 ${
                  !email.isRead ? 'font-medium text-gray-900' : 'text-gray-600'
                }`}>
                  {email.subject}
                </p>
                
                <p className="text-xs text-gray-500 truncate">
                  {email.snippet || email.body}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 