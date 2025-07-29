import { useState, useEffect } from 'react';
import { client, databases } from '../lib/appwrite';

export default function UserMessages({ userId, refreshTrigger, emails, emailsLoading, emailsError, onEmailClick, onFetchMail, onSearchBooking, onQuickSummary, gmailConnected, showSearchFilter }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('telegram');
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [telegramRefreshing, setTelegramRefreshing] = useState(false);
  const [previousMessageCount, setPreviousMessageCount] = useState(0);

  useEffect(() => {
    if (userId) {
      fetchUserMessages();
    }
  }, [userId, refreshTrigger]);

  const fetchUserMessages = async (isRefresh = false) => {
    try {
      if (!isRefresh) {
        setLoading(true);
      }
      setError(null);
      
      if (!userId) {
        setMessages([]);
        return;
      }
      
      const databaseId = 'qloo_messages';
      const collectionId = 'user_messages';
      
      const response = await databases.getDocument(databaseId, collectionId, userId);
      
      if (response && response.messages) {
        const parsedMessages = JSON.parse(response.messages);
        setMessages(parsedMessages);
        
        // Check if new messages were added
        if (parsedMessages.length > previousMessageCount && previousMessageCount > 0) {
          // New messages received
          console.log(`New messages received: ${parsedMessages.length - previousMessageCount} new messages`);
        }
        setPreviousMessageCount(parsedMessages.length);
      } else {
        setMessages([]);
        setPreviousMessageCount(0);
      }
    } catch (error) {
      console.error('Error fetching user messages:', error);
      if (error.code === 404) {
        // Document doesn't exist yet, which is fine
        setMessages([]);
      } else {
        setError('Failed to load messages. Please try again.');
      }
    } finally {
      if (!isRefresh) {
        setLoading(false);
      }
    }
  };

  const handleMessageClick = (message) => {
    setSelectedMessage(message);
  };

  const handleCloseMessage = () => {
    setSelectedMessage(null);
  };

  const handleRefreshMessages = async () => {
    setRefreshing(true);
    await fetchUserMessages();
    setRefreshing(false);
  };

  const handleRefreshTelegramMessages = async () => {
    setTelegramRefreshing(true);
    await fetchUserMessages(true);
    setTelegramRefreshing(false);
  };

  const handleClearMessages = async () => {
    try {
      if (!userId) return;
      
      const databaseId = 'qloo_messages';
      const collectionId = 'user_messages';
      
      // Update the document with an empty messages array
      await databases.updateDocument(databaseId, collectionId, userId, {
        messages: JSON.stringify([])
      });
      
      // Clear local state
      setMessages([]);
      setPreviousMessageCount(0);
      
      console.log('Messages cleared successfully');
    } catch (error) {
      console.error('Error clearing messages:', error);
      // If document doesn't exist, that's fine - messages are already cleared
    }
  };

  const formatMessageDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-8 shadow-sm">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
          <p className="text-gray-600 text-sm">Loading messages...</p>
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
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Messages</h3>
          <p className="text-gray-600 text-sm">{error}</p>
        </div>
      </div>
    );
  }

    return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      {/* Header with Tabs */}
      <div className="px-6 py-4 border-b border-gray-100">
        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('telegram')}
            className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'telegram'
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span>Telegram</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('gmail')}
            className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'gmail'
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span>Gmail</span>
            </div>
          </button>
        </div>
      </div>
      
      {/* Tab Content */}
      <div>
                {activeTab === 'telegram' && (
          <>
            {/* Telegram Tab Header */}
            <div className="px-6 py-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">
                  Messages
                </h3>
                                 <div className="flex items-center space-x-2">
                   <div className="relative">
                     <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                       {messages.length} messages
                     </span>
                     {messages.length > previousMessageCount && previousMessageCount > 0 && (
                       <div className="absolute -top-1 -right-1 h-3 w-3 bg-green-500 rounded-full animate-pulse"></div>
                     )}
                   </div>
                   
                   <button
                     onClick={handleClearMessages}
                     disabled={messages.length === 0}
                     className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                     title="Clear all messages"
                   >
                     <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                     </svg>
                   </button>
                   
                   <button
                     onClick={handleRefreshTelegramMessages}
                     disabled={telegramRefreshing}
                     className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
                     title="Refresh Telegram messages"
                   >
                     {telegramRefreshing ? (
                       <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                     ) : (
                       <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                       </svg>
                     )}
                   </button>
                </div>
              </div>
            </div>

            {/* Telegram Messages Content */}
            <div className="divide-y divide-gray-100">
              {messages.length === 0 ? (
                <div className="px-6 py-8 text-center">
                  <div className="h-12 w-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Telegram Messages</h3>
                  <p className="text-gray-600 text-sm mb-4">Your Telegram notifications will appear here when QlooMate sends recommendations.</p>
                                     {telegramRefreshing && (
                     <div className="flex items-center justify-center text-sm text-blue-600">
                       <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                       Checking for new messages...
                     </div>
                   )}
                </div>
              ) : (
                messages.map((message, index) => (
                  <div
                    key={index}
                    onClick={() => handleMessageClick(message)}
                    className="px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-start space-x-3">
                      <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-medium text-gray-900">
                            QlooMate Recommendation
                          </p>
                          <p className="text-xs text-gray-500 flex-shrink-0 ml-2">
                            {formatMessageDate(message.timestamp)}
                          </p>
                        </div>
                        
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {message.message}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
        
        {activeTab === 'gmail' && (
          <>
            {/* Gmail Tab Header */}
            <div className="px-6 py-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">
                  Your Emails
                </h3>
                <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                  {emails ? emails.length : 0} emails
                </span>
              </div>
            </div>

            {/* Gmail Actions */}
            {gmailConnected && (
              <div className="px-6 py-4 border-b border-gray-100">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <button
                    onClick={onFetchMail}
                    disabled={emailsLoading}
                    className={`px-4 py-3 rounded-lg font-medium transition-colors ${
                      emailsLoading
                        ? 'bg-gray-300 cursor-not-allowed'
                        : 'bg-green-600 hover:bg-green-700 text-white'
                    }`}
                  >
                    {emailsLoading ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        <span className="text-sm">Fetching...</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center">
                        <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        <span className="text-sm">Fetch Recent Emails</span>
                      </div>
                    )}
                  </button>

                  <button
                    onClick={onSearchBooking}
                    disabled={emailsLoading}
                    className={`px-4 py-3 rounded-lg font-medium transition-colors ${
                      emailsLoading
                        ? 'bg-gray-300 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    {emailsLoading ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        <span className="text-sm">Searching...</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center">
                        <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <span className="text-sm">Search Booking Emails</span>
                      </div>
                    )}
                  </button>

                  <button
                    onClick={onQuickSummary}
                    disabled={emailsLoading}
                    className={`px-4 py-3 rounded-lg font-medium transition-colors ${
                      emailsLoading
                        ? 'bg-gray-300 cursor-not-allowed'
                        : 'bg-purple-600 hover:bg-purple-700 text-white'
                    }`}
                  >
                    {emailsLoading ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        <span className="text-sm">Loading...</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center">
                        <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="text-sm">Get Quick Summary</span>
                      </div>
                    )}
                  </button>
                </div>
              </div>
            )}

                         {/* Search Status */}
             {showSearchFilter && emails && emails.length > 0 && (
               <div className="px-6 py-4 bg-blue-50 border-b border-blue-200">
                 <div className="flex items-center">
                   <svg className="h-5 w-5 text-blue-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                   </svg>
                   <span className="text-sm font-medium text-blue-800">
                     Found {emails.length} emails with subject containing "Booking" or "Tickets" from the last 2 months
                   </span>
                 </div>
               </div>
             )}

             {/* Gmail Content */}
             <div>
               {!gmailConnected ? (
                <div className="px-6 py-8 text-center">
                  <div className="h-12 w-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Gmail Not Connected</h3>
                  <p className="text-gray-600 text-sm mb-4">Connect your Gmail account to access and manage your emails.</p>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center">
                      <svg className="h-5 w-5 text-blue-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm font-medium text-blue-800">
                        Connect Gmail in the left sidebar to enable email management
                      </span>
                    </div>
                  </div>
                </div>
              ) : emailsError ? (
                <div className="px-6 py-8 text-center">
                  <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Emails</h3>
                  <p className="text-gray-600 text-sm">{emailsError}</p>
                </div>
              ) : emails && emails.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {emails.map((email) => (
                    <div
                      key={email.id}
                      onClick={() => onEmailClick(email)}
                      className="px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors"
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
                              {email.from}
                            </p>
                            <p className="text-xs text-gray-500 flex-shrink-0 ml-2">
                              {email.date.toLocaleString()}
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
              ) : (
                <div className="px-6 py-8 text-center">
                  <div className="h-12 w-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Emails Found</h3>
                  <p className="text-gray-600 text-sm">Click "Fetch Recent Emails" to load your Gmail messages.</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Message Detail Popup */}
      {selectedMessage && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
            onClick={handleCloseMessage}
          ></div>

          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-gray-900">
                    QlooMate Recommendation
                  </h3>
                  <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                    <span>Sent: {formatMessageDate(selectedMessage.timestamp)}</span>
                  </div>
                </div>
                <button
                  onClick={handleCloseMessage}
                  className="ml-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto min-h-0">
                <div className="p-6">
                  <div className="prose max-w-none">
                    <p className="whitespace-pre-wrap text-gray-900">{selectedMessage.message}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50 flex-shrink-0">
                <div className="text-sm text-gray-500">
                  Telegram Message
                </div>
                <button
                  onClick={handleCloseMessage}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 