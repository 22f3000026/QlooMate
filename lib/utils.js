// Utility functions for encoding/decoding sensitive data

/**
 * Encode a Telegram chat ID to hide it from the frontend
 * @param {string} chatId - The original chat ID
 * @returns {string} - Encoded chat ID
 */
export const encodeChatId = (chatId) => {
  if (!chatId) return '';
  
  // Simple encoding: convert to base64 and add some obfuscation
  const encoded = btoa(chatId);
  // Add a prefix to make it look like a different format
  return `TG_${encoded}_${Date.now().toString(36)}`;
};

/**
 * Decode a Telegram chat ID back to its original form
 * @param {string} encodedChatId - The encoded chat ID
 * @returns {string} - Original chat ID
 */
export const decodeChatId = (encodedChatId) => {
  if (!encodedChatId) return '';
  
  try {
    // Remove the prefix and suffix
    const match = encodedChatId.match(/^TG_(.+)_[a-z0-9]+$/);
    if (!match) return encodedChatId; // Return as-is if not encoded
    
    const base64Part = match[1];
    return atob(base64Part);
  } catch (error) {
    console.error('Error decoding chat ID:', error);
    return encodedChatId; // Return as-is if decoding fails
  }
};

/**
 * Get a display version of the chat ID (first 4 and last 4 characters)
 * @param {string} chatId - The chat ID (encoded or original)
 * @returns {string} - Display version like "1234...5678"
 */
export const getDisplayChatId = (chatId) => {
  if (!chatId) return '';
  
  // If it's encoded, decode it first
  const decoded = decodeChatId(chatId);
  
  if (decoded.length <= 8) {
    return decoded; // Show full ID if it's short
  }
  
  // Show first 4 and last 4 characters
  return `${decoded.substring(0, 4)}...${decoded.substring(decoded.length - 4)}`;
};

/**
 * Check if a chat ID is encoded
 * @param {string} chatId - The chat ID to check
 * @returns {boolean} - True if encoded
 */
export const isEncodedChatId = (chatId) => {
  if (!chatId) return false;
  return /^TG_.+_[a-z0-9]+$/.test(chatId);
}; 