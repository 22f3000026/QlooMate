'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getUser, logoutUser, getUserGmailPreferences, getUserTelegramPreferences, updateUserTelegramPreferences } from '../../lib/auth';
import { fetchEmails, searchBookingInGmail, searchLatestBookingTickets, connectGmail, checkGmailConnection, disconnectGmail, updateUserPreferences } from '../../lib/gmail';
import { client, functions } from '../../lib/appwrite';
import EmailPopup from '../../components/EmailPopup';
import SummaryPopup from '../../components/SummaryPopup';
import TelegramPopup from '../../components/TelegramPopup';
import FloatingChatButton from '../../components/FloatingChatButton';
import { Functions } from 'appwrite';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('home');
  const [emails, setEmails] = useState([]);
  const [emailsLoading, setEmailsLoading] = useState(false);
  const [emailsError, setEmailsError] = useState(null);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [gmailConnected, setGmailConnected] = useState(false);
  const [gmailConnecting, setGmailConnecting] = useState(false);
  const [gmailDisconnecting, setGmailDisconnecting] = useState(false);
  const [showSearchFilter, setShowSearchFilter] = useState(false);
  const [searchingBooking, setSearchingBooking] = useState(false);
  const [popupEmail, setPopupEmail] = useState(null);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [summaryData, setSummaryData] = useState(null);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [userPreferences, setUserPreferences] = useState(null);
  const [isTelegramPopupOpen, setIsTelegramPopupOpen] = useState(false);
  const [telegramChatId, setTelegramChatId] = useState('');
  const [qlooMateExecuting, setQlooMateExecuting] = useState(false);
  const [qlooMateBeatActive, setQlooMateBeatActive] = useState(false);
  const [qlooMateBeatStarting, setQlooMateBeatStarting] = useState(false);
  const [qlooMateBeatStopping, setQlooMateBeatStopping] = useState(false);
  const [showQlooMateSuccess, setShowQlooMateSuccess] = useState(false);
  const [refreshMessages, setRefreshMessages] = useState(false);
  const [authRetrying, setAuthRetrying] = useState(false);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [preferencesSaved, setPreferencesSaved] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [matePreferences, setMatePreferences] = useState({
    bookRecommendations: { enabled: false, tag: 'book' },
    newPlacesToTravel: { enabled: false, tag: 'travel' },
    recipes: { enabled: false, tag: 'recipe' },
    localEvents: { enabled: false, tag: 'movie' },
    weatherAlerts: { enabled: false, tag: 'weather' },
    culturalInsights: { enabled: false, tag: 'culture' },
    budgetTips: { enabled: false, tag: 'budget' },
    foodieChallenges: { enabled: false, tag: 'challenge' },
    seasonalRecommendations: { enabled: false, tag: 'seasonal' },
    groupDiningSuggestions: { enabled: false, tag: 'dining' }
  });
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const checkUser = async (retryCount = 0) => {
      try {
        const currentUser = await getUser();
        if (currentUser) {
          setUser(currentUser);
          
          // Load user Gmail preferences
          try {
            const preferences = await getUserGmailPreferences();
            const telegramPreferences = await getUserTelegramPreferences();
            
            // Merge preferences
            const mergedPreferences = {
              ...preferences,
              ...telegramPreferences
            };
            
            setUserPreferences(mergedPreferences);
            setTelegramChatId(mergedPreferences.telegramChatId || '');
            
            // Load mate preferences from user data
            loadMatePreferences(mergedPreferences);
          } catch (prefError) {
            console.log('Could not load user preferences:', prefError);
          }
        } else {
          console.log('No user found, redirecting to login');
          router.push('/');
        }
      } catch (error) {
        console.error('Error checking user authentication:', error);
        // Retry on network errors up to 3 times
        if (error.message && (error.message.includes('Failed to fetch') || error.message.includes('NetworkError'))) {
          if (retryCount < 3) {
            console.log(`Network error, retrying authentication (attempt ${retryCount + 1}/3)`);
            setAuthRetrying(true);
            setTimeout(() => checkUser(retryCount + 1), 2000); // Retry after 2 seconds
            return;
          } else {
            console.log('Max retries reached, redirecting to login');
            setAuthRetrying(false);
            router.push('/');
          }
        } else {
          console.log('User not authenticated, redirecting to login');
          setAuthRetrying(false);
          router.push('/');
        }
      } finally {
        if (retryCount === 0) {
          setLoading(false);
          setAuthRetrying(false);
        }
      }
    };
    checkUser();
  }, [router]);

  useEffect(() => {
    // Check for Gmail connection status from URL params
    const gmailStatus = searchParams.get('gmail_connected');
    const gmailError = searchParams.get('gmail_error');
    
    if (gmailStatus === 'true') {
      setGmailConnected(true);
      setEmailsError(null);
      
      // Update user preferences in Appwrite after successful Gmail connection
      const updatePreferences = async () => {
        try {
          await updateUserPreferences();
          // Refresh user preferences display
          const gmailPreferences = await getUserGmailPreferences();
          const telegramPreferences = await getUserTelegramPreferences();
          
          // Merge preferences
          const mergedPreferences = {
            ...gmailPreferences,
            ...telegramPreferences
          };
          
          setUserPreferences(mergedPreferences);
          
          // Load mate preferences from user data
          loadMatePreferences(mergedPreferences);
          
          // Show Telegram popup if not already connected
          if (!mergedPreferences.telegramChatId) {
            setTimeout(() => {
              setIsTelegramPopupOpen(true);
            }, 1000); // Small delay to let the UI update
          }
        } catch (error) {
          console.error('Error updating user preferences after Gmail connection:', error);
        }
      };
      
      updatePreferences();
    } else if (gmailError) {
      let errorMessage = decodeURIComponent(gmailError);
      
      // Handle specific error messages
      if (gmailError === 'invalid_grant_expired') {
        errorMessage = 'Gmail authorization expired. Please connect Gmail again.';
      } else if (gmailError === 'no_code') {
        errorMessage = 'No authorization code received from Google.';
      }
      
      setEmailsError(`Gmail connection failed: ${errorMessage}`);
      setGmailConnected(false);
    }
    
    // Check Gmail connection status based on refresh token existence
    const checkGmailStatus = async () => {
      try {
        const gmailPreferences = await getUserGmailPreferences();
        const hasRefreshToken = gmailPreferences?.gmailRefreshToken;
        setGmailConnected(!!hasRefreshToken);
      } catch (error) {
        console.error('Error checking Gmail status:', error);
        setGmailConnected(false);
      }
    };
    
    checkGmailStatus();
  }, [searchParams]);

  // QlooMate Beat status checking temporarily disabled

  const handleSignOut = async () => {
    try {
      await logoutUser();
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleConnectGmail = () => {
    setGmailConnecting(true);
    connectGmail();
  };

  const handleDisconnectGmail = async () => {
    setGmailDisconnecting(true);
    try {
      await disconnectGmail();
      
      setGmailConnected(false);
      setEmails([]);
      setEmailsError(null);
      setShowSearchFilter(false);
      
      // Refresh user preferences display
      try {
        const gmailPreferences = await getUserGmailPreferences();
        const telegramPreferences = await getUserTelegramPreferences();
        
        // Merge preferences
        const mergedPreferences = {
          ...gmailPreferences,
          ...telegramPreferences
        };
        
        setUserPreferences(mergedPreferences);
        
        // Load mate preferences from user data
        loadMatePreferences(mergedPreferences);
      } catch (prefError) {
        console.log('Could not refresh user preferences:', prefError);
      }
    } catch (error) {
      console.error('Error disconnecting Gmail:', error);
      setEmailsError('Failed to disconnect Gmail. Please try again.');
    } finally {
      setGmailDisconnecting(false);
    }
  };

  const handleFetchMail = async () => {
    setEmailsLoading(true);
    setEmailsError(null);
    setEmails([]);
    setShowSearchFilter(false);
    
    try {
      console.log('Fetching emails...');
      const fetchedEmails = await fetchEmails(20);
      setEmails(fetchedEmails);
      console.log('Emails fetched successfully:', fetchedEmails.length);
    } catch (error) {
      console.error('Error fetching emails:', error);
      setEmailsError(error.message || 'Failed to fetch emails. Please check your authentication.');
    } finally {
      setEmailsLoading(false);
    }
  };

  const handleSearchBooking = async () => {
    setSearchingBooking(true);
    setEmailsError(null);
    setEmails([]);
    setShowSearchFilter(true);
    
    try {
      console.log('Searching Gmail for Booking/Tickets emails...');
      const bookingEmails = await searchBookingInGmail(50);
      setEmails(bookingEmails);
      console.log('Booking/Tickets emails found:', bookingEmails.length);
    } catch (error) {
      console.error('Error searching for Booking/Tickets emails:', error);
      setEmailsError(error.message || 'Failed to search for Booking/Tickets emails. Please check your authentication.');
    } finally {
      setSearchingBooking(false);
    }
  };

  const handleQuickSummary = async () => {
    setSummaryLoading(true);
    setEmailsError(null);
    
    try {
      console.log('Getting quick summary of latest booking/tickets...');
      const summary = await searchLatestBookingTickets();
      setSummaryData(summary);
      setIsSummaryOpen(true);
      console.log('Summary generated successfully');
    } catch (error) {
      console.error('Error getting summary:', error);
      setEmailsError(error.message || 'Failed to get summary. Please check your authentication.');
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleEmailClick = async (email) => {
    setSelectedEmail(email);
    console.log('Selected email:', email);
    
    // Open popup with HTML content
    setPopupEmail(email);
    setIsPopupOpen(true);
  };

  const handleClosePopup = () => {
    setIsPopupOpen(false);
    setPopupEmail(null);
  };

  const handleCloseSummary = () => {
    setIsSummaryOpen(false);
    setSummaryData(null);
  };

  const handleOpenTelegramPopup = () => {
    setIsTelegramPopupOpen(true);
  };

  const handleCloseTelegramPopup = () => {
    setIsTelegramPopupOpen(false);
  };

  const handleSaveTelegramChatId = async (chatId) => {
    try {
      await updateUserTelegramPreferences(chatId);
      setTelegramChatId(chatId);
      
      // Refresh user preferences display
      const gmailPreferences = await getUserGmailPreferences();
      const telegramPreferences = await getUserTelegramPreferences();
      
      // Merge preferences
      const mergedPreferences = {
        ...gmailPreferences,
        ...telegramPreferences
      };
      
      setUserPreferences(mergedPreferences);
      
      // Load mate preferences from user data
      loadMatePreferences(mergedPreferences);
      
      console.log('Telegram chat ID saved successfully');
      
      // Show success message
      setEmailsError(null);
      
      // Trigger message refresh after Telegram connection
      setTimeout(() => {
        setRefreshMessages(prev => !prev);
      }, 1000);
      
      // You could add a toast notification here if you have a toast system
    } catch (error) {
      console.error('Error saving Telegram chat ID:', error);
      throw error;
    }
  };

  const handleExecuteQlooMate = async () => {
    try {
      setQlooMateExecuting(true);
      
      // Call the Appwrite function
      const result = await functions.createExecution('68846bdd0004eae6d86c');
      
      console.log('QlooMate function executed successfully:', result);
      
      // Show success message
      setEmailsError(null);
      
      // Trigger message refresh after a short delay to allow the function to complete
      setTimeout(() => {
        setRefreshMessages(prev => !prev);
      }, 2000);
      
      // Show success popup for 3 seconds
      setShowQlooMateSuccess(true);
      setTimeout(() => {
        setShowQlooMateSuccess(false);
      }, 3000);
    } catch (error) {
      console.error('Error executing QlooMate function:', error);
      setEmailsError('Failed to execute QlooMate function. Please try again.');
    } finally {
      setQlooMateExecuting(false);
    }
  };


  const handleStartQlooMateBeat = async () => {
    // Functionality temporarily disabled
    console.log('QlooMate Beat start functionality is currently disabled');
  };

  const handleStopQlooMateBeat = async () => {
    // Functionality temporarily disabled
    console.log('QlooMate Beat stop functionality is currently disabled');
  };

  const loadMatePreferences = (userPrefs) => {
    if (userPrefs?.matePreferences) {
      try {
        const savedPreferences = JSON.parse(userPrefs.matePreferences);
        
        // Migrate old tag values to new ones
        const migratedPreferences = {
          ...savedPreferences,
          localEvents: {
            ...savedPreferences.localEvents,
            tag: savedPreferences.localEvents?.tag === 'event' ? 'movie' : (savedPreferences.localEvents?.tag || 'movie')
          },
          groupDiningSuggestions: {
            ...savedPreferences.groupDiningSuggestions,
            tag: savedPreferences.groupDiningSuggestions?.tag === 'group-dining' ? 'dining' : (savedPreferences.groupDiningSuggestions?.tag || 'dining')
          }
        };
        
        setMatePreferences(migratedPreferences);
        console.log('Loaded and migrated mate preferences from user data:', migratedPreferences);
      } catch (error) {
        console.error('Error parsing saved mate preferences:', error);
        // Keep default state if parsing fails
      }
    }
  };

  const handleTogglePreference = (preferenceKey) => {
    setMatePreferences(prev => ({
      ...prev,
      [preferenceKey]: {
        ...prev[preferenceKey],
        enabled: !prev[preferenceKey].enabled
      }
    }));
  };

  const handleSavePreferences = async () => {
    try {
      setSavingPreferences(true);
      setPreferencesSaved(false);
      setSaveError(null);
      
      // Extract enabled tags for taste preference
      const enabledTags = Object.entries(matePreferences)
        .filter(([key, value]) => value.enabled)
        .map(([key, value]) => value.tag);
      
      // Get current user preferences to preserve existing data
      const currentPrefs = userPreferences || {};
      
      // Validate that we have a user
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      // Use Appwrite account directly to update preferences
      const { account, validateClient } = await import('../../lib/appwrite');
      
      // Validate client configuration
      if (!validateClient()) {
        throw new Error('Appwrite client not properly configured');
      }
      
      // Check if account is properly initialized
      if (!account) {
        throw new Error('Account not initialized');
      }
      
      // Simple network connectivity check
      try {
        await fetch('https://nyc.cloud.appwrite.io/v1/health', { 
          method: 'HEAD',
          mode: 'no-cors'
        });
      } catch (networkError) {
        console.error('Network connectivity issue:', networkError);
        throw new Error('Network connectivity issue. Please check your internet connection.');
      }
      
      await account.updatePrefs({
        ...currentPrefs,
        matePreferences: JSON.stringify(matePreferences),
        taste: enabledTags // Add taste preference with enabled tags
      });
      
      console.log('Mate preferences saved successfully');
      console.log('Taste tags:', enabledTags);
      
      // Show success state for 3 seconds
      setPreferencesSaved(true);
      setTimeout(() => {
        setPreferencesSaved(false);
      }, 3000);
      
    } catch (error) {
      console.error('Error saving mate preferences:', error);
      
      // Show user-friendly error message
      let errorMessage = 'Failed to save preferences';
      if (error.message.includes('Network connectivity')) {
        errorMessage = 'Network error. Please check your internet connection.';
      } else if (error.message.includes('not authenticated')) {
        errorMessage = 'Please sign in again to save preferences.';
      } else if (error.message.includes('not properly configured')) {
        errorMessage = 'Configuration error. Please refresh the page.';
      }
      
      setSaveError(errorMessage);
      
      // Clear error after 5 seconds
      setTimeout(() => {
        setSaveError(null);
      }, 5000);
    } finally {
      setSavingPreferences(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
          <p className="text-gray-600 text-sm">
            {authRetrying ? 'Reconnecting to server...' : 'Loading...'}
          </p>
          {authRetrying && (
            <p className="text-gray-500 text-xs mt-2">Please check your internet connection</p>
          )}
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Minimal Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-semibold text-sm">Q</span>
              </div>
                              <h1 className="text-lg font-semibold text-gray-900">Qloo Mate</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="h-6 w-6 bg-gray-200 rounded-full flex items-center justify-center">
                  <span className="text-gray-600 text-xs font-medium">
                    {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                  </span>
                </div>
                <span className="text-sm text-gray-700">{user.name}</span>
              </div>
              <button
                onClick={handleSignOut}
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Tabs */}
        <div className="flex space-x-1 bg-white rounded-lg p-1 mb-8 shadow-sm">
          <button
            onClick={() => setActiveTab('home')}
            className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'home'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('mate')}
            className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'mate'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            Mate
          </button>
        </div>

        {/* Content */}
        {activeTab === 'home' && (
          <div className="space-y-6">
            {/* Welcome Card */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Welcome back, {user.name}!
              </h2>
              <p className="text-gray-600 mb-4">
                You&apos;re successfully signed in with Google. Connect your Gmail to start managing your emails.
              </p>
              
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-600">Authenticated with Google</span>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="flex items-center">
                  <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-900">{user.name}</p>
                    <p className="text-xs text-gray-500">Profile</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="flex items-center">
                  <div className="h-10 w-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-900">{user.email}</p>
                    <p className="text-xs text-gray-500">Email</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="flex items-center">
                  <div className="h-10 w-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <svg className="h-5 w-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-900">Connected</p>
                    <p className="text-xs text-gray-500">Status</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Integration Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Gmail Integration Card */}
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Gmail Integration</h3>
                  {gmailConnected && (
                    <div className="flex items-center space-x-2 px-2 py-1 bg-green-100 text-green-800 rounded-full">
                      <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                      <span className="text-xs font-medium">Connected</span>
                    </div>
                  )}
                </div>
                
                {!gmailConnected ? (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600">Connect your Gmail account to access emails</p>
                    <button
                      onClick={handleConnectGmail}
                      disabled={gmailConnecting}
                      className={`w-full px-4 py-2 rounded-lg font-medium transition-colors ${
                        gmailConnecting
                          ? 'bg-gray-300 cursor-not-allowed'
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                    >
                      {gmailConnecting ? (
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Connecting...
                        </div>
                      ) : (
                        <div className="flex items-center justify-center">
                          <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                          </svg>
                          Connect Gmail
                        </div>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Status:</span>
                        <span className="text-sm font-medium text-green-600">Connected - Gmail Integration</span>
                      </div>
                      {userPreferences?.lastEmailCheckTime && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Last Check:</span>
                          <span className="text-xs text-gray-900">
                            {new Date(userPreferences.lastEmailCheckTime).toLocaleString()}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Refresh Token:</span>
                        <span className="text-xs text-gray-900 font-mono">
                          {userPreferences?.gmailRefreshToken ? '✓ Available' : '✗ Not Available'}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={handleDisconnectGmail}
                      disabled={gmailDisconnecting}
                      className={`w-full px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                        gmailDisconnecting
                          ? 'bg-gray-300 cursor-not-allowed text-gray-500'
                          : 'bg-red-100 hover:bg-red-200 text-red-700'
                      }`}
                    >
                      {gmailDisconnecting ? (
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-600 mr-1"></div>
                          Disconnecting...
                        </div>
                      ) : (
                        'Disconnect Gmail'
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Telegram Integration Card */}
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Telegram Integration</h3>
                  {userPreferences?.telegramConnected && (
                    <div className="flex items-center space-x-2 px-2 py-1 bg-green-100 text-green-800 rounded-full">
                      <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                      <span className="text-xs font-medium">Connected</span>
                    </div>
                  )}
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Status:</span>
                      <span className={`text-sm font-medium ${userPreferences?.telegramConnected ? 'text-green-600' : 'text-red-600'}`}>
                        {userPreferences?.telegramConnected ? 'Active' : 'Not Connected'}
                      </span>
                    </div>
                    {userPreferences?.telegramChatId && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Chat ID:</span>
                        <span className="text-xs text-gray-900 font-mono">
                          {userPreferences.telegramChatId}
                        </span>
                      </div>
                    )}
                    {userPreferences?.telegramConnectedAt && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Connected:</span>
                        <span className="text-xs text-gray-900">
                          {new Date(userPreferences.telegramConnectedAt).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={handleOpenTelegramPopup}
                    className="w-full px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    {userPreferences?.telegramChatId ? 'Edit Chat ID' : 'Connect Telegram'}
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
              <div className="flex space-x-3">
                <button 
                  onClick={() => setActiveTab('mails')}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  View Emails
                </button>
                
                {gmailConnected ? (
                  <button
                    onClick={handleQuickSummary}
                    disabled={summaryLoading}
                    className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                      summaryLoading
                        ? 'bg-gray-300 cursor-not-allowed text-gray-500'
                        : 'bg-green-600 hover:bg-green-700 text-white'
                    }`}
                  >
                    {summaryLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Loading...
                      </>
                    ) : (
                      <>
                        <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Quick Summary
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={handleConnectGmail}
                    disabled={gmailConnecting}
                    className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                      gmailConnecting
                        ? 'bg-gray-300 cursor-not-allowed text-gray-500'
                        : 'bg-orange-600 hover:bg-orange-700 text-white'
                    }`}
                  >
                    {gmailConnecting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Connecting...
                      </>
                    ) : (
                      <>
                        <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                        Connect Gmail
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'mate' && (
          <div className="space-y-6">
            {/* Top Row - Header and Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Mate Preferences Header */}
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Qloo Mate Preferences
                  </h2>
                  <button
                    onClick={handleSavePreferences}
                    disabled={savingPreferences}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                      preferencesSaved
                        ? 'bg-green-600 hover:bg-green-700 text-white cursor-default'
                        : savingPreferences
                        ? 'bg-blue-500 text-white cursor-not-allowed opacity-75'
                        : 'bg-blue-600 hover:bg-blue-700 text-white hover:scale-105 active:scale-95'
                    }`}
                  >
                    {preferencesSaved ? (
                      <>
                        <svg className="inline-block w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Saved!
                      </>
                    ) : savingPreferences ? (
                      <>
                        <div className="inline-block w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Saving...
                      </>
                    ) : (
                      'Save Preferences'
                    )}
                  </button>
                </div>
                {saveError && (
                  <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-xs text-red-600">{saveError}</p>
                  </div>
                )}
              <p className="text-gray-600">
                Customize what recommendations you&apos;d like to receive from your AI travel companion.
              </p>
              </div>

              {/* Stats & Summary */}
              <div className="bg-white rounded-xl p-6 shadow-sm relative">
                <div className="absolute top-4 right-4">
                  <span className="text-xs text-gray-400">
                    Last Updated: {new Date().toLocaleDateString()}
                  </span>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <svg className="h-5 w-5 text-blue-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Your Preferences
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Active Preferences:</span>
                    <span className="text-sm font-medium text-blue-600">
                      {Object.values(matePreferences).filter(pref => pref.enabled).length} / {Object.keys(matePreferences).length}
                    </span>
                  </div>
                  <div className="pt-3 border-t border-gray-200">
                    <p className="text-xs text-gray-500">
                      Preferences help Qloo Mate provide personalized recommendations.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Preferences Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Gmail-Extracted Preferences */}
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <svg className="h-5 w-5 text-blue-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  From Gmail & Emails
                </h3>
                <p className="text-sm text-gray-600 mb-4">Preferences that can be extracted from your email content</p>
                                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <p className="text-sm font-medium text-gray-900">Book Recommendations</p>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                            {matePreferences.bookRecommendations.tag}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">From book-related emails and reading lists</p>
                      </div>
                      <button
                        onClick={() => handleTogglePreference('bookRecommendations')}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          matePreferences.bookRecommendations.enabled ? 'bg-blue-600' : 'bg-gray-200'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          matePreferences.bookRecommendations.enabled ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <p className="text-sm font-medium text-gray-900">Travel Plans</p>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            {matePreferences.newPlacesToTravel.tag}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">From travel bookings and itineraries</p>
                      </div>
                      <button
                        onClick={() => handleTogglePreference('newPlacesToTravel')}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          matePreferences.newPlacesToTravel.enabled ? 'bg-blue-600' : 'bg-gray-200'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          matePreferences.newPlacesToTravel.enabled ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <p className="text-sm font-medium text-gray-900">Movie Bookings</p>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {matePreferences.localEvents.tag}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">From movie booking emails and tickets</p>
                      </div>
                      <button
                        onClick={() => handleTogglePreference('localEvents')}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          matePreferences.localEvents.enabled ? 'bg-blue-600' : 'bg-gray-200'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          matePreferences.localEvents.enabled ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <p className="text-sm font-medium text-gray-900">Dining</p>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                            {matePreferences.groupDiningSuggestions.tag}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">From restaurant bookings and food emails</p>
                      </div>
                      <button
                        onClick={() => handleTogglePreference('groupDiningSuggestions')}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          matePreferences.groupDiningSuggestions.enabled ? 'bg-blue-600' : 'bg-gray-200'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          matePreferences.groupDiningSuggestions.enabled ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>
                  </div>
                </div>

              {/* Independent Preferences */}
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <svg className="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9m0 9c-5 0-9-4-9-9s4-9 9-9" />
                  </svg>
                  Independent Preferences
                </h3>
                <p className="text-sm text-gray-600 mb-4">Preferences based on your general interests and lifestyle</p>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <p className="text-sm font-medium text-gray-900">Recipes</p>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          {matePreferences.recipes.tag}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">Local recipes and cooking tips</p>
                    </div>
                    <button
                      onClick={() => handleTogglePreference('recipes')}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        matePreferences.recipes.enabled ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        matePreferences.recipes.enabled ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <p className="text-sm font-medium text-gray-900">Foodie Challenges</p>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          {matePreferences.foodieChallenges.tag}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">Fun food exploration challenges</p>
                    </div>
                    <button
                      onClick={() => handleTogglePreference('foodieChallenges')}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        matePreferences.foodieChallenges.enabled ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        matePreferences.foodieChallenges.enabled ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <p className="text-sm font-medium text-gray-900">Cultural Insights</p>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          {matePreferences.culturalInsights.tag}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">Local customs and traditions</p>
                    </div>
                    <button
                      onClick={() => handleTogglePreference('culturalInsights')}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        matePreferences.culturalInsights.enabled ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        matePreferences.culturalInsights.enabled ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <p className="text-sm font-medium text-gray-900">Seasonal Recommendations</p>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-800">
                          {matePreferences.seasonalRecommendations.tag}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">Time-based suggestions</p>
                    </div>
                    <button
                      onClick={() => handleTogglePreference('seasonalRecommendations')}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        matePreferences.seasonalRecommendations.enabled ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        matePreferences.seasonalRecommendations.enabled ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Smart Features */}
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <svg className="h-5 w-5 text-purple-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  Smart Features
                </h3>
                <p className="text-sm text-gray-600 mb-4">AI-powered contextual recommendations</p>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <p className="text-sm font-medium text-gray-900">Weather Suggestions</p>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-cyan-100 text-cyan-800">
                          {matePreferences.weatherAlerts.tag}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">Weather-based activity suggestions</p>
                    </div>
                    <button
                      onClick={() => handleTogglePreference('weatherAlerts')}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        matePreferences.weatherAlerts.enabled ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        matePreferences.weatherAlerts.enabled ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <p className="text-sm font-medium text-gray-900">Budget Tips</p>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                          {matePreferences.budgetTips.tag}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">Cost-saving recommendations</p>
                    </div>
                    <button
                      onClick={() => handleTogglePreference('budgetTips')}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        matePreferences.budgetTips.enabled ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        matePreferences.budgetTips.enabled ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>
                </div>
              </div>


            </div>
          </div>
        )}

      </div>

      {/* Email Popup */}
      <EmailPopup
        email={popupEmail}
        isOpen={isPopupOpen}
        onClose={handleClosePopup}
      />

      {/* Summary Popup */}
      <SummaryPopup
        summaryData={summaryData}
        isOpen={isSummaryOpen}
        onClose={handleCloseSummary}
      />

      {/* Telegram Popup */}
      <TelegramPopup
        isOpen={isTelegramPopupOpen}
        onClose={handleCloseTelegramPopup}
        onSave={handleSaveTelegramChatId}
        currentChatId={telegramChatId}
      />

      {/* QlooMate Success Popup */}
      {showQlooMateSuccess && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm"></div>
          <div className="bg-white rounded-lg p-6 shadow-lg max-w-xs mx-4 relative z-10">
            <div className="text-center">
              <div className="text-4xl mb-3">✅</div>
              <h3 className="text-lg font-medium text-gray-900">
                QlooMate Executed
              </h3>
            </div>
          </div>
        </div>
      )}

      {/* Floating Chat Button - Only visible in Mate tab */}
      <FloatingChatButton activeTab={activeTab} />
    </div>
  );
} 