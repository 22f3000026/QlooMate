import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get('gmail_refresh_token')?.value;
    
    if (!refreshToken) {
      return NextResponse.json(
        { error: 'No Gmail refresh token found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      refreshToken: refreshToken 
    });
  } catch (error) {
    console.error('Error getting Gmail refresh token:', error);
    return NextResponse.json(
      { error: 'Failed to get Gmail refresh token', details: error.message },
      { status: 500 }
    );
  }
} 