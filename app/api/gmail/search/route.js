import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { cookies } from 'next/headers';

const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.modify'
];

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback'
);

const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

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

async function refreshAccessToken(refreshToken) {
  try {
    oauth2Client.setCredentials({ refresh_token: refreshToken });
    const { credentials } = await oauth2Client.refreshAccessToken();
    const cookieStore = await cookies();
    cookieStore.set('gmail_access_token', credentials.access_token, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 3600
    });
    if (credentials.expiry_date) {
      cookieStore.set('gmail_token_expiry', credentials.expiry_date.toString(), {
        httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 30 * 24 * 60 * 60
      });
    }
    return credentials.access_token;
  } catch (error) {
    console.error('Error refreshing token:', error);
    throw new Error('Failed to refresh access token');
  }
}

async function setupGmailClient() {
  const tokens = await getTokensFromCookies();
  if (!tokens.access_token) {
    throw new Error('No Gmail access token found. Please authenticate with Gmail.');
  }
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
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || 'movie';
    const maxResults = searchParams.get('maxResults') || '50';
    const after = searchParams.get('after'); // Date filter for last 2 months

    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return NextResponse.json(
        { error: 'Google OAuth credentials not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.' },
        { status: 500 }
      );
    }

    const gmailClient = await setupGmailClient();
    const emails = await searchGmailForQuery(gmailClient, query, maxResults, after);
    
    return NextResponse.json(emails);
  } catch (error) {
    console.error('Gmail search error:', error);
    if (error.message.includes('No Gmail access token found') ||
        error.message.includes('invalid_grant') ||
        error.message.includes('access_denied')) {
      return NextResponse.json(
        { error: 'Gmail authentication required', redirectTo: '/api/auth/google' },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to search emails', details: error.message },
      { status: 500 }
    );
  }
}

async function searchGmailForQuery(gmailClient, query, maxResults, after) {
  try {
    // Build search query with date filter if provided
    let searchQuery = query;
    if (after) {
      searchQuery = `${query} after:${after}`;
    }
    
    console.log(`Searching Gmail for: "${searchQuery}" with maxResults: ${maxResults}`);
    
    // Search for messages containing the query
    const searchResponse = await gmailClient.users.messages.list({
      userId: 'me',
      q: searchQuery,
      maxResults: parseInt(maxResults),
      includeSpamTrash: false
    });

    const messages = searchResponse.data.messages || [];
    console.log(`Found ${messages.length} messages matching query: "${searchQuery}"`);

    if (messages.length === 0) {
      return [];
    }

    // Get detailed information for each message
    const emailPromises = messages.map(async (message) => {
      try {
        const messageResponse = await gmailClient.users.messages.get({
          userId: 'me',
          id: message.id,
          format: 'full'
        });

        const messageData = messageResponse.data;
        const headers = messageData.payload?.headers || [];
        
        const subject = headers.find(h => h.name === 'Subject')?.value || 'No Subject';
        const from = headers.find(h => h.name === 'From')?.value || 'Unknown Sender';
        const date = headers.find(h => h.name === 'Date')?.value || new Date().toISOString();
        
        // Extract body content
        let body = '';
        let htmlBody = '';
        let snippet = messageData.snippet || '';
        
        if (messageData.payload?.body?.data) {
          if (messageData.payload.mimeType === 'text/html') {
            htmlBody = Buffer.from(messageData.payload.body.data, 'base64').toString('utf-8');
            body = htmlBody.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
          } else {
            body = Buffer.from(messageData.payload.body.data, 'base64').toString('utf-8');
          }
        } else if (messageData.payload?.parts) {
          // Handle multipart messages
          for (const part of messageData.payload.parts) {
            if (part.mimeType === 'text/plain' && part.body?.data) {
              body = Buffer.from(part.body.data, 'base64').toString('utf-8');
            } else if (part.mimeType === 'text/html' && part.body?.data) {
              htmlBody = Buffer.from(part.body.data, 'base64').toString('utf-8');
              if (!body) {
                body = htmlBody.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
              }
            }
          }
        }

        return {
          id: message.id,
          subject: subject,
          from: from,
          date: new Date(date),
          body: body,
          htmlBody: htmlBody,
          snippet: snippet,
          isRead: !messageData.labelIds?.includes('UNREAD')
        };
      } catch (error) {
        console.error(`Error fetching message ${message.id}:`, error);
        return null;
      }
    });

    const emails = await Promise.all(emailPromises);
    const validEmails = emails.filter(email => email !== null);
    
    console.log(`Successfully processed ${validEmails.length} emails from search`);
    return validEmails;

  } catch (error) {
    console.error('Error searching Gmail:', error);
    throw error;
  }
} 