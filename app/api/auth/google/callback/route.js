import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { cookies } from 'next/headers';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback'
);



export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    
    if (error) {
      console.error('OAuth error:', error);
      return NextResponse.redirect(new URL('/dashboard?gmail_error=' + encodeURIComponent(error), request.url));
    }
    
    if (!code) {
      console.error('No authorization code received');
      return NextResponse.redirect(new URL('/dashboard?gmail_error=no_code', request.url));
    }
    
    console.log('Received authorization code, exchanging for tokens...');
    
    try {
      // Exchange code for tokens
      const { tokens } = await oauth2Client.getToken(code);
      
      console.log('Tokens received:', {
        access_token: tokens.access_token ? 'present' : 'missing',
        refresh_token: tokens.refresh_token ? 'present' : 'missing',
        expiry_date: tokens.expiry_date
      });
      
      // Store tokens in encrypted cookies
      const cookieStore = await cookies();
      
      // Store access token (short-lived)
      cookieStore.set('gmail_access_token', tokens.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 3600 // 1 hour
      });
      
      // Store refresh token (long-lived)
      if (tokens.refresh_token) {
        cookieStore.set('gmail_refresh_token', tokens.refresh_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 30 * 24 * 60 * 60 // 30 days
        });
      }
      
      // Store expiry date
      if (tokens.expiry_date) {
        cookieStore.set('gmail_token_expiry', tokens.expiry_date.toString(), {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 30 * 24 * 60 * 60 // 30 days
        });
      }
      
      // Note: User preferences will be updated client-side after redirect
      
      console.log('Tokens stored successfully, redirecting to dashboard');
      return NextResponse.redirect(new URL('/dashboard?gmail_connected=true', request.url));
      
    } catch (tokenError) {
      console.error('Error exchanging code for tokens:', tokenError);
      
      // Handle specific OAuth errors
      if (tokenError.message.includes('invalid_grant')) {
        console.log('Invalid grant - authorization code may have expired or been used already');
        return NextResponse.redirect(new URL('/dashboard?gmail_error=invalid_grant_expired', request.url));
      }
      
      throw tokenError;
    }
    
  } catch (error) {
    console.error('Error in OAuth callback:', error);
    return NextResponse.redirect(new URL('/dashboard?gmail_error=' + encodeURIComponent(error.message), request.url));
  }
} 