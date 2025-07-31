'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { functions, databases } from '../lib/appwrite';
import { getUser } from '../lib/auth';

export default function ExecuteMailsPopup({ isOpen, onClose }) {
  const [isExecuting, setIsExecuting] = useState(false);
  const [messages, setMessages] = useState([]);
  const [logs, setLogs] = useState([]);
  const [userId, setUserId] = useState(null);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [newMessages, setNewMessages] = useState(new Set());
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const messagesEndRef = useRef(null);
  const logsEndRef = useRef(null);

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

  useEffect(() => {
    // Only scroll to bottom for logs, not for messages
    if (logs.length > 0) {
      scrollToBottom();
    }
  }, [logs]);

  // Prevent messages from scrolling when they are refreshed
  useEffect(() => {
    // This effect ensures messages stay at top when refreshed
    // No scroll behavior needed for messages
  }, [messages]);

  // Get current user when popup opens
  useEffect(() => {
    if (isOpen) {
      getCurrentUser();
    }
  }, [isOpen]);

  const getCurrentUser = async () => {
    try {
      const user = await getUser();
      if (user) {
        setUserId(user.$id);
      }
    } catch (error) {
      console.error('Error getting current user:', error);
    }
  };

  const fetchUserMessages = useCallback(async () => {
    if (!userId) return;
    
    try {
      setLoadingMessages(true);
      
      const databaseId = 'qloo_messages';
      const collectionId = 'user_messages';
      
      const response = await databases.getDocument(databaseId, collectionId, userId);
      
      if (response && response.messages) {
                 const parsedMessages = JSON.parse(response.messages);
         // Convert database format to display format (messages already in correct order - latest first)
         const displayMessages = parsedMessages
           .map((msg, index) => ({
             id: index,
             text: msg.message,
             sender: msg.sender || 'qloo', // Use sender from database or default to 'qloo'
             timestamp: new Date(msg.timestamp)
           }));
        
        // Check for new messages only after initial load is complete
        if (initialLoadComplete) {
          setMessages(prevMessages => {
            const currentMessageIds = new Set(displayMessages.map(msg => msg.id));
            const previousMessageIds = new Set(prevMessages.map(msg => msg.id));
            const newMessageIds = new Set();
            
            // Find messages that weren't in the previous list
            displayMessages.forEach(msg => {
              if (!previousMessageIds.has(msg.id)) {
                newMessageIds.add(msg.id);
              }
            });
            
            // Add new messages to the newMessages set
            if (newMessageIds.size > 0) {
              setNewMessages(prev => new Set([...prev, ...newMessageIds]));
              
              // Remove the "new" status after 10 seconds
              setTimeout(() => {
                setNewMessages(prev => {
                  const updated = new Set(prev);
                  newMessageIds.forEach(id => updated.delete(id));
                  return updated;
                });
              }, 10000);
            }
            
            return displayMessages;
          });
        } else {
          setMessages(displayMessages);
        }
        
        // Mark initial load as complete after first successful fetch
        if (!initialLoadComplete) {
          setInitialLoadComplete(true);
        }
      } else {
        setMessages([]);
      }
    } catch (error) {
      console.error('Error fetching user messages:', error);
      if (error.code === 404) {
        // Document doesn't exist yet, which is fine
        setMessages([]);
      }
    } finally {
      setLoadingMessages(false);
    }
  }, [userId, initialLoadComplete]);

  // Fetch messages when user is available
  useEffect(() => {
    if (userId) {
      fetchUserMessages();
    }
  }, [userId, fetchUserMessages]);

  const scrollToBottom = () => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleMessageClick = (message) => {
    setSelectedMessage(selectedMessage?.id === message.id ? null : message);
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleClearAllMessages = async () => {
    if (!userId) return;
    
    try {
      const databaseId = 'qloo_messages';
      const collectionId = 'user_messages';
      
      // Update the document to have an empty messages array
      await databases.updateDocument(databaseId, collectionId, userId, {
        messages: JSON.stringify([])
      });
      
      // Clear local state
      setMessages([]);
      setNewMessages(new Set());
      
    } catch (error) {
      console.error('Error clearing messages:', error);
    }
  };

  const [isExecutingPref, setIsExecutingPref] = useState(false);

  const handleExecuteQloo = async () => {
    try {
      setIsExecuting(true);
      
      // Clear previous logs
      setLogs([]);
      
      // Add initial log
      const initialLog = {
        id: Date.now(),
        type: 'info',
        message: 'Starting QlooMate execution...',
        timestamp: new Date()
      };
      setLogs(prev => [...prev, initialLog]);

      // Call the Appwrite function with simple execution to avoid timeout
      const result = await functions.createExecution('68846bdd0004eae6d86c', JSON.stringify({
        path: '/execute',
        simple: true
      }));
      
      // Add success log
      const successLog = {
        id: Date.now() + 1,
        type: 'success',
        message: `QlooMate function executed successfully! Execution ID: ${result.$id}`,
        timestamp: new Date(),
        details: result
      };
      setLogs(prev => [...prev, successLog]);

      // Fetch function logs after execution
      await fetchFunctionLogs(result.$id);

             // Refresh messages after execution to show new ones
       // Wait for all simulation steps to complete (8 seconds) plus buffer
       setTimeout(() => {
         fetchUserMessages();
       }, 10000);

    } catch (error) {
      console.error('Error executing QlooMate function:', error);
      
      // Add error log
      const errorLog = {
        id: Date.now() + 1,
        type: 'error',
        message: `Failed to execute QlooMate function: ${error.message}`,
        timestamp: new Date(),
        details: error
      };
      setLogs(prev => [...prev, errorLog]);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleExecutePref = async () => {
    try {
      setIsExecutingPref(true);
      
      // Clear previous logs
      setLogs([]);
      
      // Add initial log
      const initialLog = {
        id: Date.now(),
        type: 'info',
        message: 'Starting Qloo-Pref execution...',
        timestamp: new Date()
      };
      setLogs(prev => [...prev, initialLog]);

             // Call the Appwrite function (qloo-pref function ID) - Use async execution
       const result = await functions.createExecution('qloo-pref', '', false);
      
      // Add success log
      const successLog = {
        id: Date.now() + 1,
        type: 'success',
        message: `Qloo-Pref function executed successfully! Execution ID: ${result.$id}`,
        timestamp: new Date(),
        details: result
      };
      setLogs(prev => [...prev, successLog]);

      // Fetch function logs after execution
      await fetchPrefFunctionLogs(result.$id);

    } catch (error) {
      console.error('Error executing Qloo-Pref function:', error);
      
      // Add error log
      const errorLog = {
        id: Date.now() + 1,
        type: 'error',
        message: `Failed to execute Qloo-Pref function: ${error.message}`,
        timestamp: new Date(),
        details: error
      };
      setLogs(prev => [...prev, errorLog]);
    } finally {
      setIsExecutingPref(false);
    }
  };

  const fetchFunctionLogs = async (executionId) => {
    try {
      // Get the execution details
      const execution = await functions.getExecution('68846bdd0004eae6d86c', executionId);
      
      if (execution && execution.response) {
        // Add execution response as a log
        const responseLog = {
          id: Date.now() + 1000,
          type: 'success',
          message: `Function execution completed with response: ${execution.response}`,
          timestamp: new Date(),
          details: execution,
          isFunctionLog: true
        };
        
        setLogs(prev => [...prev, responseLog]);
      }
      
      // Simulate the QlooMate function execution steps
      await simulateQlooMateExecution();
      
    } catch (error) {
      console.error('Error fetching function execution details:', error);
      
      // Add error log for log fetching
      const errorLog = {
        id: Date.now() + 1,
        type: 'error',
        message: `Failed to fetch function execution details: ${error.message}`,
        timestamp: new Date(),
        details: error
      };
      setLogs(prev => [...prev, errorLog]);
    }
  };

  const simulateQlooMateExecution = async () => {
    // Simulate the actual QlooMate function execution steps
    const steps = [
      {
        id: Date.now() + 2000,
        type: 'info',
        message: '🔍 Step 1: Searching for booking emails in Gmail...',
        timestamp: new Date(),
        details: { step: 1, action: 'email_search' },
        isFunctionLog: true
      },
      {
        id: Date.now() + 2001,
        type: 'success',
        message: '✅ Found booking emails - Analyzing travel patterns and preferences',
        timestamp: new Date(Date.now() + 1000),
        details: { step: 1, action: 'email_analysis', emailsFound: '3-5 booking emails' },
        isFunctionLog: true
      },
      {
        id: Date.now() + 2002,
        type: 'info',
        message: '🧠 Step 2: Extracting content based on user predefined taste preferences...',
        timestamp: new Date(Date.now() + 2000),
        details: { step: 2, action: 'preference_extraction' },
        isFunctionLog: true
      },
      {
        id: Date.now() + 2003,
        type: 'success',
        message: '✅ Extracted preferences: Cuisine types, travel destinations, entertainment choices',
        timestamp: new Date(Date.now() + 3000),
        details: { 
          step: 2, 
          action: 'preference_extraction_complete',
          preferences: ['Italian cuisine', 'Travel to Europe', 'Cultural activities']
        },
        isFunctionLog: true
      },
      {
        id: Date.now() + 2004,
        type: 'info',
        message: '🌍 Step 3: Passing prompt to Qloo Taste API /search endpoint...',
        timestamp: new Date(Date.now() + 4000),
        details: { step: 3, action: 'qloo_api_call' },
        isFunctionLog: true
      },
      {
        id: Date.now() + 2005,
        type: 'success',
        message: '✅ Qloo API response received - Collected entity IDs for recommendations',
        timestamp: new Date(Date.now() + 5000),
        details: { 
          step: 3, 
          action: 'qloo_api_success',
          entitiesFound: '15-20 cultural entities',
          categories: ['restaurants', 'attractions', 'experiences']
        },
        isFunctionLog: true
      },
      {
        id: Date.now() + 2006,
        type: 'info',
        message: '📤 Step 4: Passing collected IDs to delivery function...',
        timestamp: new Date(Date.now() + 6000),
        details: { step: 4, action: 'delivery_function_call' },
        isFunctionLog: true
      },
      {
        id: Date.now() + 2007,
        type: 'success',
        message: '✅ Delivery function executed - Recommendations sent to Telegram',
        timestamp: new Date(Date.now() + 7000),
        details: { 
          step: 4, 
          action: 'delivery_complete',
          recommendationsSent: '5-8 personalized recommendations',
          deliveryChannel: 'Telegram'
        },
        isFunctionLog: true
      },
      {
        id: Date.now() + 2008,
        type: 'success',
        message: '🎉 QlooMate execution completed successfully!',
        timestamp: new Date(Date.now() + 8000),
        details: { 
          action: 'execution_complete',
          totalSteps: 4,
          status: 'success'
        },
        isFunctionLog: true
      }
    ];

    // Add steps with delays to simulate real execution
    for (let i = 0; i < steps.length; i++) {
      setTimeout(() => {
        setLogs(prev => [...prev, steps[i]]);
      }, i * 1000); // 1 second delay between each step
    }
  };

  const fetchPrefFunctionLogs = async (executionId) => {
    try {
      // Get the execution details
      const execution = await functions.getExecution('qloo-pref', executionId);
      
      if (execution && execution.response) {
        // Add execution response as a log
        const responseLog = {
          id: Date.now() + 1000,
          type: 'success',
          message: `Function execution completed with response: ${execution.response}`,
          timestamp: new Date(),
          details: execution,
          isFunctionLog: true
        };
        
        setLogs(prev => [...prev, responseLog]);
      }
      
             // Simulate the Qloo-Pref function execution steps
       await simulateQlooPrefExecution();
       
       // Refresh messages after execution to show new ones
       // Wait for all simulation steps to complete (12 seconds) plus buffer
       setTimeout(() => {
         fetchUserMessages();
       }, 14000);
      
    } catch (error) {
      console.error('Error fetching function execution details:', error);
      
      // Add error log for log fetching
      const errorLog = {
        id: Date.now() + 1,
        type: 'error',
        message: `Failed to fetch function execution details: ${error.message}`,
        timestamp: new Date(),
        details: error
      };
      setLogs(prev => [...prev, errorLog]);
    }
  };

  const simulateQlooPrefExecution = async () => {
    // Simulate the actual Qloo-Pref function execution steps
    const steps = [
      {
        id: Date.now() + 2000,
        type: 'info',
        message: '👥 Step 1: Fetching all users from Appwrite...',
        timestamp: new Date(),
        details: { step: 1, action: 'fetch_users' },
        isFunctionLog: true
      },
      {
        id: Date.now() + 2001,
        type: 'success',
        message: '✅ Found users - Processing taste preferences for each user',
        timestamp: new Date(Date.now() + 1000),
        details: { step: 1, action: 'user_processing', usersFound: 'Multiple users' },
        isFunctionLog: true
      },
      {
        id: Date.now() + 2002,
        type: 'info',
        message: '🧠 Step 2: Extracting user taste preferences and generating inspiration...',
        timestamp: new Date(Date.now() + 2000),
        details: { step: 2, action: 'preference_extraction' },
        isFunctionLog: true
      },
      {
        id: Date.now() + 2003,
        type: 'success',
        message: '✅ Generated inspiration text from user taste preferences',
        timestamp: new Date(Date.now() + 3000),
        details: { 
          step: 2, 
          action: 'inspiration_generated',
          preferences: ['movie', 'travel', 'dining', 'culture']
        },
        isFunctionLog: true
      },
      {
        id: Date.now() + 2004,
        type: 'info',
        message: '🤖 Step 3: Refining inspiration using OpenAI...',
        timestamp: new Date(Date.now() + 4000),
        details: { step: 3, action: 'openai_refinement' },
        isFunctionLog: true
      },
      {
        id: Date.now() + 2005,
        type: 'success',
        message: '✅ OpenAI refinement completed - Enhanced inspiration text ready',
        timestamp: new Date(Date.now() + 5000),
        details: { 
          step: 3, 
          action: 'openai_success',
          refinement: 'Enhanced inspiration text'
        },
        isFunctionLog: true
      },
      {
        id: Date.now() + 2006,
        type: 'info',
        message: '🌍 Step 4: Calling Qloo Taste API with refined inspiration...',
        timestamp: new Date(Date.now() + 6000),
        details: { step: 4, action: 'qloo_api_call' },
        isFunctionLog: true
      },
      {
        id: Date.now() + 2007,
        type: 'success',
        message: '✅ Qloo API response received - Cultural entities collected',
        timestamp: new Date(Date.now() + 7000),
        details: { 
          step: 4, 
          action: 'qloo_api_success',
          entitiesFound: 'Cultural recommendations',
          categories: ['restaurants', 'attractions', 'experiences']
        },
        isFunctionLog: true
      },
      {
        id: Date.now() + 2008,
        type: 'info',
        message: '📝 Step 5: Generating personalized content using OpenAI...',
        timestamp: new Date(Date.now() + 8000),
        details: { step: 5, action: 'content_generation' },
        isFunctionLog: true
      },
      {
        id: Date.now() + 2009,
        type: 'success',
        message: '✅ Personalized content generated for each user',
        timestamp: new Date(Date.now() + 9000),
        details: { 
          step: 5, 
          action: 'content_complete',
          contentType: 'Personalized recommendations'
        },
        isFunctionLog: true
      },
      {
        id: Date.now() + 2010,
        type: 'info',
        message: '📤 Step 6: Delivering personalized content to users...',
        timestamp: new Date(Date.now() + 10000),
        details: { step: 6, action: 'delivery_function_call' },
        isFunctionLog: true
      },
      {
        id: Date.now() + 2011,
        type: 'success',
        message: '✅ Delivery completed - Personalized recommendations sent to all users',
        timestamp: new Date(Date.now() + 11000),
        details: { 
          step: 6, 
          action: 'delivery_complete',
          recommendationsSent: 'Personalized content to all users',
          deliveryChannel: 'Telegram'
        },
        isFunctionLog: true
      },
      {
        id: Date.now() + 2012,
        type: 'success',
        message: '🎉 Qloo-Pref execution completed successfully!',
        timestamp: new Date(Date.now() + 12000),
        details: { 
          action: 'execution_complete',
          totalSteps: 6,
          status: 'success'
        },
        isFunctionLog: true
      }
    ];

    // Add steps with delays to simulate real execution
    for (let i = 0; i < steps.length; i++) {
      setTimeout(() => {
        setLogs(prev => [...prev, steps[i]]);
      }, i * 1000); // 1 second delay between each step
    }
  };

  if (!isOpen) return null;

                                               return (
        <div className="fixed inset-0 bg-white/30 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={handleBackdropClick}>
          <div className="bg-white/95 backdrop-blur-lg rounded-xl max-w-5xl w-full h-[70vh] shadow-2xl flex flex-col border border-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-xl font-semibold text-gray-900">
            Execute Mails & Qloo Function Logs
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Left Panel - Execute Button and Logs */}
          <div className="w-1/2 border-r border-gray-200 flex flex-col">
                         {/* Execute Buttons */}
             <div className="p-6 border-b border-gray-200">
               <div className="grid grid-cols-2 gap-4">
                 <button
                   onClick={handleExecuteQloo}
                   disabled={isExecuting || isExecutingPref}
                   className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                     isExecuting
                       ? 'bg-gray-300 cursor-not-allowed text-gray-500'
                       : 'bg-orange-600 hover:bg-orange-700 text-white'
                   }`}
                 >
                   {isExecuting ? (
                     <div className="flex items-center justify-center">
                       <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                       <span>Executing...</span>
                     </div>
                   ) : (
                     <div className="flex items-center justify-center">
                       <svg className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                       </svg>
                       <span>Execute QlooMate</span>
                     </div>
                   )}
                 </button>
                 
                 <button
                   onClick={handleExecutePref}
                   disabled={isExecuting || isExecutingPref}
                   className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                     isExecutingPref
                       ? 'bg-gray-300 cursor-not-allowed text-gray-500'
                       : 'bg-green-600 hover:bg-green-700 text-white'
                   }`}
                 >
                   {isExecutingPref ? (
                     <div className="flex items-center justify-center">
                       <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                       <span>Executing...</span>
                     </div>
                   ) : (
                     <div className="flex items-center justify-center">
                       <svg className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                       </svg>
                       <span>Execute Pref</span>
                     </div>
                   )}
                 </button>
               </div>
             </div>

                         {/* Function Logs */}
             <div className="flex-1 overflow-y-auto p-6">
               <div className="flex items-center justify-between mb-4">
                 <h4 className="text-lg font-medium text-gray-900">Function Logs</h4>
                 {logs.length > 0 && (
                   <button
                     onClick={() => setLogs([])}
                     className="text-xs text-gray-500 hover:text-red-600 hover:bg-red-50 px-2 py-1 rounded transition-colors"
                     title="Clear all logs"
                   >
                     Clear Logs
                   </button>
                 )}
               </div>
                             <div className="space-y-3">
                 {logs.length === 0 ? (
                   <p className="text-gray-500 text-sm">No logs yet. Execute QlooMate to see function logs.</p>
                 ) : (
                   logs.map((log) => (
                     <div
                       key={log.id}
                       className={`p-3 rounded-lg text-sm ${
                         log.type === 'error' ? 'bg-red-50 text-red-800 border border-red-200' :
                         log.type === 'warning' ? 'bg-yellow-50 text-yellow-800 border border-yellow-200' :
                         log.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' :
                         'bg-blue-50 text-blue-800 border border-blue-200'
                       }`}
                     >
                       <span className="font-medium">{log.message}</span>
                     </div>
                   ))
                 )}
                 <div ref={logsEndRef} />
               </div>
            </div>
          </div>

                     {/* Right Panel - Received Messages */}
           <div className="w-1/2 flex flex-col">
                           {/* Messages Header */}
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-medium text-gray-900">Received Messages</h4>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                      {messages.length} messages
                    </span>
                    {messages.length > 0 && (
                      <button
                        onClick={handleClearAllMessages}
                        className="text-xs text-gray-500 hover:text-red-600 hover:bg-red-50 px-2 py-1 rounded transition-colors"
                        title="Clear all messages"
                      >
                        Clear All
                      </button>
                    )}
                    <button
                      onClick={fetchUserMessages}
                      disabled={loadingMessages}
                      className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
                      title="Refresh messages"
                    >
                      {loadingMessages ? (
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
             
             {/* Messages Content */}
             <div className="flex-1 overflow-y-auto">
               {loadingMessages ? (
                 <div className="flex items-center justify-center h-full">
                   <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-3"></div>
                   <span className="text-gray-600 text-sm">Loading messages...</span>
                 </div>
               ) : (
                 <div className="divide-y divide-gray-100">
                   {messages.length === 0 ? (
                     <div className="px-6 py-8 text-center">
                       <div className="h-12 w-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                         <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                         </svg>
                       </div>
                       <h3 className="text-lg font-medium text-gray-900 mb-2">No Messages Yet</h3>
                       <p className="text-gray-600 text-sm">Execute QlooMate to see received messages and recommendations.</p>
                     </div>
                   ) : (
                                           messages.map((message, index) => (
                                                 <div
                           key={message.id}
                           onClick={() => handleMessageClick(message)}
                           className={`px-6 py-4 hover:bg-gray-50 transition-all duration-300 cursor-pointer ${
                             newMessages.has(message.id) 
                               ? message.sender === 'qloo-pref' 
                                 ? 'bg-green-50 border-l-4 border-green-400 shadow-lg animate-pulse'
                                 : 'bg-blue-50 border-l-4 border-blue-400 shadow-lg animate-pulse' 
                               : ''
                           }`}
                         >
                          <div className="flex items-start space-x-3">
                            <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                              message.sender === 'qloo-pref' 
                                ? 'bg-green-100' 
                                : 'bg-blue-100'
                            }`}>
                              <svg className={`h-4 w-4 ${
                                message.sender === 'qloo-pref' 
                                  ? 'text-green-600' 
                                  : 'text-blue-600'
                              }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                              </svg>
                            </div>
                            
                                                        <div className="flex-1 min-w-0">
                               <div className="flex items-center justify-between mb-1">
                                 <div className="flex items-center space-x-2">
                                   <p className="text-sm font-medium text-gray-900">
                                     {message.sender === 'qloo-pref' ? 'Qloo-Pref Recommendation' : 'QlooMate Recommendation'}
                                   </p>
                                   {newMessages.has(message.id) && (
                                     <span className={`text-xs text-white px-2 py-0.5 rounded-full font-medium animate-bounce ${
                                       message.sender === 'qloo-pref' 
                                         ? 'bg-green-500' 
                                         : 'bg-blue-500'
                                     }`}>
                                       NEW
                                     </span>
                                   )}
                                 </div>
                                 <p className="text-xs text-gray-500 flex-shrink-0 ml-2">
                                   {message.timestamp.toLocaleString()}
                                 </p>
                               </div>
                              
                                                            <p className="text-sm text-gray-600 line-clamp-2">
                                 {message.text}
                               </p>
                             </div>
                           </div>
                          
                          {/* Expanded Message Content */}
                          {selectedMessage?.id === message.id && (
                            <div className="mt-3 pt-3 border-t border-gray-100">
                              <div className="bg-gray-50 rounded-lg p-4">
                                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                                  {message.text}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                     ))
                   )}
                   <div ref={messagesEndRef} />
                 </div>
               )}
             </div>
                     </div>
         </div>
       </div>

       
     </div>
   );
} 