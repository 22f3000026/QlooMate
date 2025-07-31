"use client";
import { useState } from 'react';
import TestChatPopup from './TestChatPopup';
import ExecuteMailsPopup from './ExecuteMailsPopup';

export default function FloatingChatButton({ activeTab }) {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isExecuteMailsOpen, setIsExecuteMailsOpen] = useState(false);

  const openChat = () => {
    setIsChatOpen(true);
  };

  const closeChat = () => {
    setIsChatOpen(false);
  };

  const openExecuteMails = () => {
    setIsExecuteMailsOpen(true);
  };

  const closeExecuteMails = () => {
    setIsExecuteMailsOpen(false);
  };

  // Only show the buttons when activeTab is 'mate'
  if (activeTab !== 'mate') {
    return null;
  }

  return (
    <>
      {/* Execute Mails Floating Button */}
      <button
        onClick={openExecuteMails}
        className="fixed bottom-24 right-6 z-40 bg-gradient-to-r from-orange-500 to-red-600 text-white p-4 rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-orange-300"
        aria-label="Execute Mails"
      >
        <div className="flex items-center space-x-2">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span className="font-medium text-sm hidden sm:block">Execute Mails</span>
        </div>
        
        {/* Pulse animation */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-orange-500 to-red-600 animate-ping opacity-20"></div>
      </button>

      {/* Floating Chat Button */}
      <button
        onClick={openChat}
        className="fixed bottom-6 right-6 z-40 bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-blue-300"
        aria-label="Open Test Mate"
      >
        <div className="flex items-center space-x-2">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span className="font-medium text-sm hidden sm:block">Test Mate</span>
        </div>
        
        {/* Pulse animation */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 animate-ping opacity-20"></div>
      </button>

      {/* Test Chat Popup */}
      <TestChatPopup isOpen={isChatOpen} onClose={closeChat} />

      {/* Execute Mails Popup */}
      <ExecuteMailsPopup isOpen={isExecuteMailsOpen} onClose={closeExecuteMails} />
    </>
  );
} 