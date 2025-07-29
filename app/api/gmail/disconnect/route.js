import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    const cookieStore = await cookies();
    
    // Clear all Gmail-related cookies
    cookieStore.delete('gmail_access_token');
    cookieStore.delete('gmail_refresh_token');
    cookieStore.delete('gmail_token_expiry');
    
    console.log('Gmail cookies cleared successfully');
    
    return NextResponse.json({ 
      success: true, 
      message: 'Gmail disconnected successfully' 
    });
  } catch (error) {
    console.error('Error disconnecting Gmail:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect Gmail', details: error.message },
      { status: 500 }
    );
  }
} 