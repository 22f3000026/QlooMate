import { account, OAuthProvider, databases, validateClient } from './appwrite'

export const loginWithGoogle = async () => {
  try {
    // Get the current domain for redirect URLs
    const currentDomain = window.location.origin;
    const successUrl = `${currentDomain}/success`;
    const failureUrl = `${currentDomain}/failure`;
    
    // Include Gmail scopes for email access
    const scopes = [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.modify'
    ];
    
    await account.createOAuth2Session(
      OAuthProvider.Google,
      successUrl,
      failureUrl,
      scopes
    );
  } catch (error) {
    console.error('OAuth error:', error);
    throw error;
  }
}

export const logoutUser = async () => {
  try {
    await account.deleteSession('current')
  } catch (error) {
    console.error(error)
  }
}

export const getUser = async () => {
  try {
    // Validate client configuration first
    if (!validateClient()) {
      console.error('Appwrite client not properly configured');
      return null;
    }
    
    // Check if account is properly initialized
    if (!account) {
      console.error('Account not initialized');
      return null;
    }
    
    // Simple network connectivity check
    try {
      await fetch('https://nyc.cloud.appwrite.io/v1/health', { 
        method: 'HEAD',
        mode: 'no-cors'
      });
    } catch (networkError) {
      console.error('Network connectivity issue:', networkError);
      throw new Error('Failed to fetch');
    }
    
    return await account.get()
  } catch (error) {
    // If user is not authenticated (guest), return null instead of throwing
    if (error.message.includes('guests') || error.message.includes('missing scope')) {
      console.log('User not authenticated:', error.message)
      return null
    }
    
    // Handle network errors and other issues
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      console.error('Network error getting user:', error.message)
      return null
    }
    
    console.error('Error getting user:', error)
    return null
  }
}

export const updateUserGmailPreferences = async (gmailRefreshToken) => {
  try {
    const user = await account.get();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const currentTime = new Date().toISOString();
    
    // Get current preferences to preserve existing data
    const currentPrefs = user.prefs || {};
    
    // Update Gmail preferences while preserving existing ones (including Telegram)
    await account.updatePrefs({
      ...currentPrefs, // Preserve all existing preferences (Telegram, etc.)
      gmailRefreshToken: gmailRefreshToken,
      isActive: true,
      lastEmailCheckTime: currentTime
    });

    console.log('User Gmail preferences updated successfully');
    return { success: true };
  } catch (error) {
    console.error('Error updating user Gmail preferences:', error);
    throw error;
  }
}

export const getUserGmailPreferences = async () => {
  try {
    const user = await account.get();
    if (!user) {
      return null;
    }

    return user.prefs || {};
  } catch (error) {
    console.error('Error getting user Gmail preferences:', error);
    return null;
  }
}

export const updateUserTelegramPreferences = async (telegramChatId) => {
  try {
    const user = await account.get();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const currentTime = new Date().toISOString();
    
    // Get current preferences to preserve existing data
    const currentPrefs = user.prefs || {};
    
    // Update only Telegram preferences while preserving existing ones
    const updatedPrefs = {
      ...currentPrefs, // Preserve all existing preferences (Gmail, etc.)
      telegramChatId: telegramChatId,
      telegramConnected: !!telegramChatId,
      telegramConnectedAt: telegramChatId ? currentTime : null
    };
    
    // Update user preferences
    await account.updatePrefs(updatedPrefs);

    console.log('Telegram preferences updated successfully');
    return { success: true };
  } catch (error) {
    console.error('Error updating Telegram preferences:', error);
    throw error;
  }
} 

export const getUserTelegramPreferences = async () => {
  try {
    const user = await account.get();
    if (!user) {
      return null;
    }

    return {
      telegramChatId: user.prefs?.telegramChatId || null,
      telegramConnected: user.prefs?.telegramConnected || false,
      telegramConnectedAt: user.prefs?.telegramConnectedAt || null
    };
  } catch (error) {
    console.error('Error getting user Telegram preferences:', error);
    return null;
  }
} 