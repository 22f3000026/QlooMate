import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    
    // Get all cookie names and values
    const cookieData = allCookies.map(cookie => ({
      name: cookie.name,
      value: cookie.value ? `${cookie.value.substring(0, 20)}...` : 'empty',
      hasValue: !!cookie.value
    }));
    
    // Look for potential Appwrite session cookies
    const appwriteCookies = allCookies.filter(cookie => 
      cookie.name.includes('appwrite') || 
      cookie.name.includes('session') ||
      cookie.name.includes('auth')
    );
    
    return NextResponse.json({
      allCookies: cookieData,
      appwriteCookies: appwriteCookies.map(cookie => ({
        name: cookie.name,
        hasValue: !!cookie.value
      })),
      totalCookies: allCookies.length
    });
  } catch (error) {
    console.error('Error getting cookies:', error);
    return NextResponse.json(
      { error: 'Failed to get cookies', details: error.message },
      { status: 500 }
    );
  }
} 