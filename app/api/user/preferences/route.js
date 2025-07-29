import { NextResponse } from 'next/server';
import { Client, Account } from 'node-appwrite';

// Initialize Appwrite client
const appwriteClient = new Client()
  .setEndpoint('https://nyc.cloud.appwrite.io/v1')
  .setProject('qloohack');

const appwriteAccount = new Account(appwriteClient);

export async function POST(request) {
  try {
    // First, try to get the current user to verify authentication
    let user;
    try {
      user = await appwriteAccount.get();
    } catch (authError) {
      console.error('Authentication error:', authError);
      return NextResponse.json(
        { error: 'User not authenticated. Please log in first.' },
        { status: 401 }
      );
    }

    if (!user) {
      return NextResponse.json(
        { error: 'User not authenticated. Please log in first.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { gmailRefreshToken, telegramChatId } = body;
    
    const currentTime = new Date().toISOString();
    const updateData = {};
    
    // Update Gmail preferences if provided
    if (gmailRefreshToken !== undefined) {
      updateData.gmailRefreshToken = gmailRefreshToken;
      updateData.isActive = true;
      updateData.lastEmailCheckTime = currentTime;
    }
    
    // Update Telegram preferences if provided
    if (telegramChatId !== undefined) {
      updateData.telegramChatId = telegramChatId;
      updateData.telegramConnected = !!telegramChatId;
      updateData.telegramConnectedAt = telegramChatId ? currentTime : null;
    }
    
    // Update user preferences
    await appwriteAccount.updatePrefs(updateData);

    console.log('User preferences updated successfully in Appwrite');
    
    return NextResponse.json({ 
      success: true, 
      message: 'User preferences updated successfully' 
    });
  } catch (error) {
    console.error('Error updating user preferences:', error);
    return NextResponse.json(
      { error: 'Failed to update user preferences', details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    // First, try to get the current user to verify authentication
    let user;
    try {
      user = await appwriteAccount.get();
    } catch (authError) {
      console.error('Authentication error:', authError);
      return NextResponse.json(
        { error: 'User not authenticated. Please log in first.' },
        { status: 401 }
      );
    }

    if (!user) {
      return NextResponse.json(
        { error: 'User not authenticated. Please log in first.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const clearType = searchParams.get('type'); // 'gmail', 'telegram', or 'all'
    
    let updateData = {};
    
    if (clearType === 'telegram') {
      // Clear only Telegram preferences
      updateData = {
        telegramChatId: null,
        telegramConnected: false,
        telegramConnectedAt: null
      };
    } else if (clearType === 'gmail') {
      // Clear only Gmail preferences
      updateData = {
        gmailRefreshToken: null,
        isActive: false,
        lastEmailCheckTime: null
      };
    } else {
      // Clear all preferences (default)
      updateData = {
        gmailRefreshToken: null,
        isActive: false,
        lastEmailCheckTime: null,
        telegramChatId: null,
        telegramConnected: false,
        telegramConnectedAt: null
      };
    }

    await appwriteAccount.updatePrefs(updateData);

    console.log(`User ${clearType || 'all'} preferences cleared in Appwrite`);
    
    return NextResponse.json({ 
      success: true, 
      message: `User ${clearType || 'all'} preferences cleared successfully` 
    });
  } catch (error) {
    console.error('Error clearing user preferences:', error);
    return NextResponse.json(
      { error: 'Failed to clear user preferences', details: error.message },
      { status: 500 }
    );
  }
} 