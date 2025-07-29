import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { cookies } from 'next/headers';

// Gmail API configuration
const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.modify'
];

// Initialize OAuth2 client
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback'
);

// Initialize Gmail API
const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

// Function to get tokens from cookies
async function getTokensFromCookies() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('gmail_access_token')?.value;
  const refreshToken = cookieStore.get('gmail_refresh_token')?.value;
  const expiryDate = cookieStore.get('gmail_token_expiry')?.value;
  
  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    expiry_date: expiryDate ? parseInt(expiryDate) : null
  };
}

// Function to refresh access token
async function refreshAccessToken(refreshToken) {
  try {
    oauth2Client.setCredentials({ refresh_token: refreshToken });
    const { credentials } = await oauth2Client.refreshAccessToken();
    
    // Update cookies with new tokens
    const cookieStore = await cookies();
    cookieStore.set('gmail_access_token', credentials.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 3600 // 1 hour
    });
    
    if (credentials.expiry_date) {
      cookieStore.set('gmail_token_expiry', credentials.expiry_date.toString(), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60 // 30 days
      });
    }
    
    return credentials.access_token;
  } catch (error) {
    console.error('Error refreshing token:', error);
    throw new Error('Failed to refresh access token');
  }
}

// Function to set up authenticated Gmail client
async function setupGmailClient() {
  const tokens = await getTokensFromCookies();
  
  if (!tokens.access_token) {
    throw new Error('No Gmail access token found. Please authenticate with Gmail.');
  }
  
  // Check if token is expired
  const isExpired = tokens.expiry_date && Date.now() >= tokens.expiry_date;
  
  if (isExpired && tokens.refresh_token) {
    console.log('Access token expired, refreshing...');
    const newAccessToken = await refreshAccessToken(tokens.refresh_token);
    oauth2Client.setCredentials({ access_token: newAccessToken });
  } else {
    oauth2Client.setCredentials({ access_token: tokens.access_token });
  }
  
  return gmail;
}

export async function GET(request) {
  try {
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const maxResults = searchParams.get('maxResults') || '20';
    const messageId = searchParams.get('messageId');

    // Check if Google credentials are configured
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return NextResponse.json(
        { error: 'Google OAuth credentials not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.' },
        { status: 500 }
      );
    }

    // Set up authenticated Gmail client
    const gmailClient = await setupGmailClient();

    if (messageId) {
      return await getRealEmailDetail(gmailClient, messageId);
    } else {
      return await getRealEmails(gmailClient, maxResults);
    }

  } catch (error) {
    console.error('Gmail API error:', error);
    
    // If it's an authentication error, redirect to OAuth
    if (error.message.includes('No Gmail access token found') || 
        error.message.includes('invalid_grant') ||
        error.message.includes('access_denied')) {
      return NextResponse.json(
        { error: 'Gmail authentication required', redirectTo: '/api/auth/google' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch emails', details: error.message },
      { status: 500 }
    );
  }
}

// Function to get real emails from Gmail
async function getRealEmails(gmailClient, maxResults) {
  try {
    console.log('Fetching real emails from Gmail...');
    
    const response = await gmailClient.users.messages.list({
      userId: 'me',
      maxResults: parseInt(maxResults),
      q: 'label:inbox'
    });

    const messages = response.data.messages || [];
    console.log(`Found ${messages.length} messages`);
    
    const emails = await Promise.all(
      messages.map(async (message) => {
        return await getRealEmailDetail(gmailClient, message.id);
      })
    );

    return NextResponse.json(emails);
  } catch (error) {
    console.error('Error fetching real emails:', error);
    throw error;
  }
}

// Function to get real email detail from Gmail
async function getRealEmailDetail(gmailClient, messageId) {
  try {
    const response = await gmailClient.users.messages.get({
      userId: 'me',
      id: messageId
    });

    const message = response.data;
    const headers = message.payload?.headers || [];
    
    const subject = headers.find(h => h.name === 'Subject')?.value || 'No Subject';
    const from = headers.find(h => h.name === 'From')?.value || 'Unknown Sender';
    const date = headers.find(h => h.name === 'Date')?.value || '';
    
    // Extract email body
    let body = '';
    if (message.payload?.body?.data) {
      body = Buffer.from(message.payload.body.data, 'base64').toString();
    } else if (message.payload?.parts) {
      const textPart = message.payload.parts.find(part => part.mimeType === 'text/plain');
      if (textPart?.body?.data) {
        body = Buffer.from(textPart.body.data, 'base64').toString();
      } else {
        // Try HTML part if text part not found
        const htmlPart = message.payload.parts.find(part => part.mimeType === 'text/html');
        if (htmlPart?.body?.data) {
          body = Buffer.from(htmlPart.body.data, 'base64').toString();
          // Strip HTML tags for display
          body = body.replace(/<[^>]*>/g, '');
        }
      }
    }

    return {
      id: message.id,
      subject,
      from,
      date: new Date(date).toISOString(),
      body: body.substring(0, 500) + (body.length > 500 ? '...' : ''),
      snippet: message.snippet || '',
      isRead: !message.labelIds?.includes('UNREAD'),
    };
  } catch (error) {
    console.error('Error fetching real email detail:', error);
    throw error;
  }
} 