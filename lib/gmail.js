// Gmail API integration for fetching user emails
// Using server-side API route to handle OAuth token management

export const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.modify'
];

export const fetchEmails = async (maxResults = 20) => {
  try {
    console.log('Fetching emails via API route...');
    const response = await fetch(`/api/gmail?maxResults=${maxResults}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    console.log('API Response status:', response.status);
    if (response.status === 401) {
      const errorData = await response.json();
      if (errorData.redirectTo) {
        console.log('Redirecting to Gmail OAuth...');
        window.location.href = errorData.redirectTo;
        return [];
      }
    }
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('API Error response:', errorData);
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    const emails = await response.json();
    console.log('Emails fetched successfully:', emails.length);
    return emails;
  } catch (error) {
    console.error('Error fetching emails:', error);
    throw error;
  }
};

export const searchBookingInGmail = async (maxResults = 50) => {
  try {
    console.log('Searching Gmail for emails with subject containing "Booking" or "Tickets"...');
    const twoMonthsAgo = new Date();
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
    const dateQuery = twoMonthsAgo.toISOString().split('T')[0]; // Format: YYYY-MM-DD
    
    // Search for emails with subject containing "Booking" OR "Tickets"
    const response = await fetch(`/api/gmail/search?q=subject:(booking OR tickets)&after=${dateQuery}&maxResults=${maxResults}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    console.log('Booking/Tickets Search API Response status:', response.status);
    if (response.status === 401) {
      const errorData = await response.json();
      if (errorData.redirectTo) {
        console.log('Redirecting to Gmail OAuth...');
        window.location.href = errorData.redirectTo;
        return [];
      }
    }
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('Booking/Tickets Search API Error response:', errorData);
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    const emails = await response.json();
    console.log('Booking/Tickets emails found:', emails.length);
    return emails;
  } catch (error) {
    console.error('Error searching for Booking/Tickets emails:', error);
    throw error;
  }
};

export const searchLatestBookingTickets = async () => {
  try {
    console.log('Searching for latest 5 Booking/Tickets emails...');
    
    // Search for emails with subject containing "Booking" OR "Tickets", limited to 5 results
    const response = await fetch(`/api/gmail/search?q=subject:(Showtime! OR e-ticket)&maxResults=5`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    console.log('Latest Booking/Tickets Search API Response status:', response.status);
    if (response.status === 401) {
      const errorData = await response.json();
      if (errorData.redirectTo) {
        console.log('Redirecting to Gmail OAuth...');
        window.location.href = errorData.redirectTo;
        return null;
      }
    }
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('Latest Booking/Tickets Search API Error response:', errorData);
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    const emails = await response.json();
    console.log('Latest Booking/Tickets emails found:', emails.length);
    
    // Function to extract booking details
    function extractBookingDetails(emailContent) {
      const lowerContent = emailContent.toLowerCase();

      // Detect type
      const isMovie = lowerContent.includes("booking confirmed") && lowerContent.includes("screen");
      const isTrain = lowerContent.includes("electronic reservation slip") || lowerContent.includes("pnr");

      if (isMovie) {
        // Movie details extraction
        const result = {};

        // Updated movie name extraction - look for movie name after "Order ID" and before "(UA16+)"
        const movieMatch = emailContent.match(/Order ID\s*:\s*\d+\s+([^(]+?)\s*\(UA16\+\)/i);
        if (movieMatch) {
          result.movie = movieMatch[1].trim();
        } else {
          // Fallback: look for "tickets for [Movie Name] are confirmed"
          const fallbackMatch = emailContent.match(/tickets for ([^:]+): ([^a]+) are confirmed/i);
          if (fallbackMatch) {
            result.movie = `${fallbackMatch[1].trim()}: ${fallbackMatch[2].trim()}`;
          } else {
            // Second fallback: look for movie name after "for" and before "are"
            const secondFallback = emailContent.match(/for ([^a]+?) are confirmed/i);
            result.movie = secondFallback ? secondFallback[1].trim() : null;
          }
        }

        // Date & Time extraction - look for the specific format
        const dateTimeMatch = emailContent.match(/Date & Time\s+([A-Za-z0-9 ,|:]+)/);
        result.dateTime = dateTimeMatch ? dateTimeMatch[1].trim() : null;

        // Theatre extraction - look for theatre information after "Theatre"
        let theatreMatch = emailContent.match(/Theatre\s+([^\n]+)/i);
        if (!theatreMatch) {
          theatreMatch = emailContent.match(/Theatre\s*:?\s*(.+?)(?:\n|$)/i);
        }
        if (!theatreMatch) {
          theatreMatch = emailContent.match(/Venue\s*:?\s*(.+?)(?:\n|$)/i);
        }
        if (!theatreMatch) {
          theatreMatch = emailContent.match(/Location\s*:?\s*(.+?)(?:\n|$)/i);
        }
        if (!theatreMatch) {
          theatreMatch = emailContent.match(/at\s+([A-Za-z0-9\s,()-]+(?:formerly\s+[A-Za-z\s]+)?)/i);
        }
        result.theatre = theatreMatch ? theatreMatch[1].trim() : null;

        return result;

      } else if (isTrain) {
        // Train details extraction
        const result = {};

        const fromMatch = emailContent.match(/Booked From:\s+([\w\s()]+)\s+Start Date/i);
        result.from = fromMatch ? fromMatch[1].trim() : null;

        const toMatch = emailContent.match(/To:\s+([\w\s()]+)/i);
        result.to = toMatch ? toMatch[1].trim() : null;

        const departureMatch = emailContent.match(/Departure\*\s*([0-9:]+ \d+ \w+ \d{4})/);
        result.departure = departureMatch ? departureMatch[1].trim() : null;

        const arrivalMatch = emailContent.match(/Arrival\*\s*([0-9:]+ \d+ \w+ \d{4})/);
        result.arrival = arrivalMatch ? arrivalMatch[1].trim() : null;

        return result;
      }

      // Unknown format
      return { error: "Unsupported email format." };
    }
    
    // Process emails and extract booking details
    const processedEmails = [];
    
    for (const email of emails) {
      const date = new Date(email.date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      // Get email content
      const emailContent = email.body || email.htmlBody || '';
      
      // Clean HTML content if present
      let cleanContent = emailContent;
      if (email.htmlBody) {
        cleanContent = email.htmlBody
          .replace(/<br\s*\/?>/gi, '\n')
          .replace(/<\/p>/gi, '\n')
          .replace(/<p[^>]*>/gi, '')
          .replace(/<[^>]*>/g, '')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/\n\s*\n/g, '\n\n')
          .trim();
      }
      
      // Extract booking details
      const bookingDetails = extractBookingDetails(cleanContent);
      
      // Only include emails with valid booking details
      if (!bookingDetails.error) {
        const subject = email.subject || 'No Subject';
        const from = extractSenderName(email.from);
        
        processedEmails.push({
          subject,
          from,
          date,
          bookingDetails,
          type: cleanContent.toLowerCase().includes("booking confirmed") ? 'movie' : 'train',
          originalContent: emailContent // Store original content
        });
      }
    }
    
    // Format the extracted booking details
    let formattedData = '';
    if (processedEmails.length > 0) {
      formattedData = processedEmails.map((email, index) => {
        let detailsText = '';
        
        if (email.type === 'movie') {
          detailsText = `   Movie: ${email.bookingDetails.movie || 'Not found'}
   Date & Time: ${email.bookingDetails.dateTime || 'Not found'}
   Theatre: ${email.bookingDetails.theatre || 'Not found'}`;
        } else if (email.type === 'train') {
          detailsText = `   From: ${email.bookingDetails.from || 'Not found'}
   To: ${email.bookingDetails.to || 'Not found'}
   Departure: ${email.bookingDetails.departure || 'Not found'}
   Arrival: ${email.bookingDetails.arrival || 'Not found'}`;
        }
        
        return `${index + 1}. ${email.subject}
   From: ${email.from}
   Date: ${email.date}
   Type: ${email.type.toUpperCase()}
${detailsText}
`;
      }).join('\n\n');
    }
    
    return {
      count: processedEmails.length,
      summary: processedEmails.length > 0 
        ? `Found ${processedEmails.length} emails with extractable booking details`
        : 'No emails with extractable booking details found',
      data: formattedData,
      hasData: processedEmails.length > 0
    };
    
  } catch (error) {
    console.error('Error searching for latest Booking/Tickets emails:', error);
    throw error;
  }
};

export const fetchEmailDetail = async (messageId) => {
  try {
    const response = await fetch(`/api/gmail?messageId=${messageId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (response.status === 401) {
      const errorData = await response.json();
      if (errorData.redirectTo) {
        console.log('Redirecting to Gmail OAuth...');
        window.location.href = errorData.redirectTo;
        return null;
      }
    }
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Failed to fetch email detail: ${response.status}`);
    }
    const emailData = await response.json();
    return {
      id: emailData.id, subject: emailData.subject, from: emailData.from,
      date: new Date(emailData.date), body: emailData.body, snippet: emailData.snippet,
      isRead: emailData.isRead, htmlBody: emailData.htmlBody,
    };
  } catch (error) {
    console.error('Error fetching email detail:', error);
    return {
      id: messageId, subject: 'Error loading email', from: 'Unknown',
      date: new Date(), body: 'Failed to load email content', snippet: 'Error loading email',
      isRead: true, htmlBody: null,
    };
  }
};

export const connectGmail = () => {
  console.log('Initiating Gmail OAuth...');
  window.location.href = '/api/auth/google';
};

export const checkGmailConnection = async () => {
  try {
    const response = await fetch('/api/gmail?maxResults=1', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    return response.status !== 401;
  } catch (error) {
    console.error('Error checking Gmail connection:', error);
    return false;
  }
};

export const disconnectGmail = async () => {
  try {
    console.log('Disconnecting Gmail...');
    
    // Clear Gmail cookies via API
    const response = await fetch('/api/gmail/disconnect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    
    // Clear only Gmail preferences in Appwrite while preserving Telegram preferences
    try {
      const { account } = await import('./appwrite');
      
      // Get current user to access existing preferences
      const user = await account.get();
      const currentPrefs = user.prefs || {};
      
      // Update preferences: clear Gmail data but preserve Telegram data
      await account.updatePrefs({
        ...currentPrefs, // Preserve all existing preferences (including Telegram)
        gmailRefreshToken: null,
        isActive: false,
        lastEmailCheckTime: null
      });
      
      console.log('Gmail preferences cleared while preserving Telegram preferences');
    } catch (prefError) {
      console.error('Error clearing user preferences:', prefError);
      // Don't fail the entire operation if preference clearing fails
    }
    
    const result = await response.json();
    console.log('Gmail disconnected successfully');
    return result;
  } catch (error) {
    console.error('Error disconnecting Gmail:', error);
    throw error;
  }
};

export const updateUserPreferences = async () => {
  try {
    console.log('Updating user preferences in Appwrite...');
    
    // Get the Gmail refresh token from server-side API
    const tokenResponse = await fetch('/api/gmail/get-refresh-token');
    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `Failed to get refresh token: ${tokenResponse.status}`);
    }
    
    const tokenData = await tokenResponse.json();
    const refreshToken = tokenData.refreshToken;
    
    if (!refreshToken) {
      throw new Error('No Gmail refresh token found');
    }
    
    // Use client-side Appwrite to update preferences directly
    const { account } = await import('./appwrite');
    const currentTime = new Date().toISOString();
    
    // Get current user to access existing preferences
    const user = await account.get();
    const currentPrefs = user.prefs || {};
    
    // Update Gmail preferences while preserving existing Telegram preferences
    await account.updatePrefs({
      ...currentPrefs, // Preserve all existing preferences (including Telegram)
      gmailRefreshToken: refreshToken,
      isActive: true,
      lastEmailCheckTime: currentTime
    });
    
    console.log('Gmail preferences updated while preserving Telegram preferences');
    return { success: true };
  } catch (error) {
    console.error('Error updating user preferences:', error);
    throw error;
  }
};

export const clearUserPreferences = async () => {
  try {
    console.log('Clearing user preferences in Appwrite...');
    const response = await fetch('/api/user/preferences', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('User preferences cleared successfully');
    return result;
  } catch (error) {
    console.error('Error clearing user preferences:', error);
    throw error;
  }
};

export const formatEmailDate = (date) => {
  const now = new Date();
  const emailDate = new Date(date);
  const diffInHours = (now - emailDate) / (1000 * 60 * 60);
  
  if (diffInHours < 24) {
    return emailDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (diffInHours < 168) { // 7 days
    return emailDate.toLocaleDateString([], { weekday: 'short' });
  } else {
    return emailDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
};

export const extractSenderName = (from) => {
  if (!from) return 'Unknown';
  
  // Extract name from "Name <email@domain.com>" format
  const match = from.match(/^([^<]+)\s*<(.+)>$/);
  if (match) {
    return match[1].trim();
  }
  
  // If no angle brackets, return the whole string
  return from.trim();
};