import { Client, Users, Databases } from 'node-appwrite';

// This Appwrite function will be executed to deliver messages to users
export default async ({ req, res, log, error }) => {
  try {
    log('=== DELIVERY FUNCTION TRIGGERED ===');
    
    // Parse the incoming data
    let deliveryData = null;
    try {
      if (req.body) {
        deliveryData = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      }
    } catch (parseError) {
      error('Error parsing request body:', parseError.message);
      return res.json({ success: false, error: 'Invalid request data' }, 400);
    }

    if (!deliveryData || !deliveryData.userMessage || !deliveryData.userId) {
      return res.json({ success: false, error: 'Missing userMessage or userId' }, 400);
    }

    const { userMessage, userId } = deliveryData;
    
    log(`=== RECEIVED DATA ===`);
    log(`User ID: ${userId}`);
    log(`Message: ${userMessage}`);
    log(`=== END RECEIVED DATA ===`);

    // Initialize Appwrite client
    const client = new Client()
      .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
      .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
      .setKey(req.headers['x-appwrite-key'] ?? '');
    
    const users = new Users(client);
    const databases = new Databases(client);

    try {
      // Get user details to find Telegram chat ID from preferences
      const user = await users.get(userId);
      const userPrefs = user.prefs || {};
      const telegramChatId = userPrefs.telegramChatId;
      
      if (!telegramChatId) {
        log('No Telegram chat ID found in user preferences');
        return res.json({
          success: false,
          error: 'No Telegram chat ID found in user preferences'
        });
      }

      log(`Found Telegram chat ID: ${telegramChatId}`);

      // Save message to Appwrite database
      const databaseResult = await saveMessageToDatabase(
        databases, 
        userId, 
        userMessage, 
        log
      );

      if (!databaseResult.success) {
        log('Failed to save message to database');
        return res.json({
          success: false,
          error: 'Failed to save message to database',
          details: databaseResult.error
        });
      }

      log('Message saved to database successfully');

      // Send message via Telegram Bot
      const telegramResult = await sendTelegramMessage(telegramChatId, userMessage, log);
      
      return res.json({
        success: true,
        message: 'Message saved to database and sent via Telegram',
        databaseResult,
        telegramResult,
        timestamp: new Date().toISOString()
      });

    } catch (userError) {
      error('Error getting user details:', userError.message);
      return res.json({
        success: false,
        error: 'Failed to get user details',
        details: userError.message
      });
    }

  } catch (err) {
    error('Delivery function execution failed: ' + err.message);
    return res.json({
      success: false,
      error: err.message,
      timestamp: new Date().toISOString()
    }, 500);
  }
};

// Function to save message to Appwrite database
async function saveMessageToDatabase(databases, userId, message, log) {
  try {
    const databaseId = process.env.APPWRITE_DATABASE_ID || 'qloo_messages';
    const collectionId = process.env.APPWRITE_COLLECTION_ID || 'user_messages';
    
    const messageData = {
      message: message,
      timestamp: new Date().toISOString(),
      userId: userId
    };

          // Check if user document already exists
      try {
        const existingDoc = await databases.getDocument(databaseId, collectionId, userId);
        
        // Update existing document - add new message to the top
        const existingMessages = existingDoc.messages ? JSON.parse(existingDoc.messages) : [];
        const updatedMessages = [messageData, ...existingMessages]; // Latest message on top
        
        await databases.updateDocument(databaseId, collectionId, userId, {
          messages: JSON.stringify(updatedMessages),
          lastUpdated: new Date().toISOString(),
          messageCount: updatedMessages.length
        });
        
        log(`Updated existing document for user ${userId} with ${updatedMessages.length} messages`);
        
      } catch (notFoundError) {
        // Document doesn't exist, create new one
        await databases.createDocument(databaseId, collectionId, userId, {
          userId: userId,
          messages: JSON.stringify([messageData]), // Latest message on top
          createdAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString(),
          messageCount: 1
        });
        
        log(`Created new document for user ${userId}`);
      }

    return { success: true };

  } catch (dbError) {
    log(`Error saving message to database: ${dbError.message}`);
    return { success: false, error: dbError.message };
  }
}

// Function to send Telegram message
async function sendTelegramMessage(chatId, message, log) {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      throw new Error('TELEGRAM_BOT_TOKEN not configured');
    }

    log(`Sending message to chat ID: ${chatId}`);

    // Send the message
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown'
      })
    });

    const result = await response.json();
    
    if (result.ok) {
      log(`Message sent successfully to chat ID: ${chatId}`);
      return { success: true, message_id: result.result.message_id };
    } else {
      log(`Failed to send message: ${result.description}`);
      return { success: false, error: result.description };
    }

  } catch (error) {
    log(`Error sending Telegram message: ${error.message}`);
    return { success: false, error: error.message };
  }
} 