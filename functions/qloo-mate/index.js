import { Client, Users, Databases, Functions } from 'node-appwrite';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// This Appwrite function will be executed every time your function is triggered
export default async ({ req, res, log, error }) => {
  // Set a timeout to prevent function from running too long
  const timeout = setTimeout(() => {
    log("Function execution timeout - returning early");
    return res.json({
      success: false,
      error: "Function execution timed out",
      timestamp: new Date().toISOString()
    }, 408);
  }, 25000); // 25 second timeout (5 seconds before Appwrite's 30s limit)

  try {
    // You can use the Appwrite SDK to interact with other services
    const client = new Client()
      .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
      .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
      .setKey(req.headers['x-appwrite-key'] ?? '');
    
    const users = new Users(client);
    const databases = new Databases(client);

    log(`Function called with path: ${req.path}, method: ${req.method}`);
    
    // Handle simple execution (for dashboard button)
    if (req.path === "/execute") {
      clearTimeout(timeout);
      return await handleSimpleExecution(req, res, log, error);
    }
    
    // Handle Telegram webhook
    if (req.path === "/webhook") {
      clearTimeout(timeout);
      return await handleTelegramWebhook(req, res, log, error, databases);
    }

    // Handle health check
    if (req.path === "/ping") {
      clearTimeout(timeout);
      return res.text("Pong");
    }

    // Handle conversation with OpenAI
    if (req.path === "/chat") {
      clearTimeout(timeout);
      return await handleOpenAIChat(req, res, log, error);
    }

    // Handle test chatbot requests from website
    if (req.path === "/test-chat") {
      clearTimeout(timeout);
      return await handleTestChat(req, res, log, error);
    }

    // Default response - route to test chat if no specific path or root path
    if (!req.path || req.path === "/" || req.path === "") {
      clearTimeout(timeout);
      log(`Routing to test chat handler for path: ${req.path}`);
      return await handleTestChat(req, res, log, error);
    }

    // Default response
    clearTimeout(timeout);
    return res.json({
      motto: "Qloo Mate - AI-powered conversation assistant",
      endpoints: {
        execute: "/execute - Simple execution endpoint for dashboard",
        webhook: "/webhook - Telegram webhook endpoint",
        chat: "/chat - Direct OpenAI chat endpoint",
        testChat: "/test-chat - Test chatbot endpoint for website",
        ping: "/ping - Health check"
      },
      learn: "https://appwrite.io/docs",
      connect: "https://appwrite.io/discord",
      getInspired: "https://builtwith.appwrite.io",
    });

  } catch(err) {
    clearTimeout(timeout);
    error("Function error: " + err.message);
    return res.json({ error: "Internal server error" }, 500);
  }
};

// Handle simple execution for dashboard button
async function handleSimpleExecution(req, res, log, error) {
  try {
    log("Simple execution endpoint called");
    
    // Check if this is a simple execution request
    const isSimple = req.body?.simple === true;
    
    if (isSimple) {
      // Return success immediately for simple requests
      return res.json({
        success: true,
        message: "QlooMate function executed successfully",
        timestamp: new Date().toISOString(),
        status: "completed",
        type: "simple"
      });
    }
    
    // For non-simple requests, do minimal work
    return res.json({
      success: true,
      message: "QlooMate function executed successfully",
      timestamp: new Date().toISOString(),
      status: "completed"
    });
  } catch (err) {
    error("Simple execution error: " + err.message);
    return res.json({ error: "Simple execution failed" }, 500);
  }
}

// Handle Telegram webhook
async function handleTelegramWebhook(req, res, log, error, databases) {
  try {
    const update = req.body;
    log(`Received Telegram update: ${JSON.stringify(update)}`);

    // Handle different types of updates
    if (update.message) {
      await handleMessage(update.message, databases, log, error);
    } else if (update.callback_query) {
      await handleCallbackQuery(update.callback_query, databases, log, error);
    }

    return res.json({ status: "ok" });
  } catch (err) {
    error("Webhook error: " + err.message);
    return res.json({ error: "Webhook processing failed" }, 500);
  }
}

// Handle incoming messages
async function handleMessage(message, databases, log, error) {
  try {
    const chatId = message.chat.id;
    const text = message.text;
    const userId = message.from.id;
    const username = message.from.username || message.from.first_name;

    log(`Processing message from ${username} (${userId}): ${text}`);

    // First, analyze the user's intent using OpenAI
    const intent = await analyzeUserIntent(text, log);
    
    let aiResponse;
    
    if (intent.isTasteBased) {
      // Route to qloo-taste function for taste-based recommendations
      log(`User request is taste-based. Routing to qloo-taste function.`);
      aiResponse = await getTasteBasedRecommendations(text, log);
    } else {
      // Handle as basic conversation
      log(`User request is basic conversation. Using standard AI response.`);
      const conversationHistory = await getConversationHistory(chatId, databases, log);
      aiResponse = await generateAIResponse(text, conversationHistory, log);
    }

    // Save conversation to database
    await saveConversation(chatId, userId, username, text, aiResponse, databases, log);

    // Send response back to Telegram
    await sendTelegramMessage(chatId, aiResponse, log);

  } catch (err) {
    error("Message handling error: " + err.message);
  }
}

// Analyze user intent to determine if it's a taste-based request
async function analyzeUserIntent(userMessage, log) {
  try {
    const messages = [
      {
        role: "system",
        content: `You are an intent classifier. Analyze the user's message and determine if they are asking for taste-based recommendations or just having a basic conversation.

Taste-based requests include:
- Smart lifestyle recommendations
- Travel suggestions and destinations
- Dining and restaurant recommendations
- Fashion and style advice
- Music recommendations and discovery
- TV show and movie suggestions
- Book recommendations
- Podcast suggestions
- Brand recommendations
- Shopping and product recommendations

Basic conversation includes:
- General questions
- Casual chat
- Personal questions
- General knowledge questions
- Non-recommendation requests

Respond with a JSON object containing:
{
  "isTasteBased": true/false,
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation"
}`
      },
      {
        role: "user",
        content: userMessage
      }
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: messages,
      max_tokens: 200,
      temperature: 0.1,
    });

    const response = completion.choices[0].message.content;
    log(`Intent analysis response: ${response}`);

    // Parse the JSON response
    const intent = JSON.parse(response);
    return intent;

  } catch (err) {
    log("Intent analysis error: " + err.message);
    // Default to basic conversation if analysis fails
    return { isTasteBased: false, confidence: 0.5, reasoning: "Analysis failed, defaulting to basic conversation" };
  }
}

// Call the qloo-taste function for taste-based recommendations
async function getTasteBasedRecommendations(userMessage, log) {
  try {
    // Initialize Appwrite client
    const client = new Client()
      .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
      .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
      .setKey(process.env.APPWRITE_FUNCTION_API_KEY || process.env.APPWRITE_API_KEY || '');
    
    const functions = new Functions(client);
    
    log(`Calling qloo-taste function with message: ${userMessage}`);

    // Call the qloo-taste function using Appwrite SDK
    const execution = await functions.createExecution(
      'qloo-taste',
      JSON.stringify({
        inspiration: userMessage
      })
    );

    // log(`Qloo-taste function execution result: ${JSON.stringify(execution)}`);

    // Parse the response from the execution
    const result = JSON.parse(execution.responseBody);
    log(`Qloo-taste function parsed response: ${JSON.stringify(result)}`);

    // Check if the function was successful
    if (result.success && result.results) {
      log(`Found ${result.results.length} recommendations`);
      log(`Recommendations: ${JSON.stringify(result.results)}`);
      
      // Build user response from the insights results
      const userResponse = await buildUserResponse(
        userMessage, 
        result.results, 
        log
      );
      return userResponse;
    } else {
      log(`Qloo-taste function returned no results or failed`);
      return "I found some great recommendations for you! Let me share them in a moment.";
    }

  } catch (err) {
    log("Error calling qloo-taste function: " + err.message);
    return "I'm having trouble accessing the recommendation system right now. Let me help you with a general response instead.";
  }
}

// Build user response from recommendations (COMPLETELY NEW FUNCTION)
async function buildUserResponse(userRequest, recommendations, logger) {
  try {
    logger('Building user response from recommendations...');
    logger(`Input recommendations type: ${typeof recommendations}`);
    logger(`Input recommendations length: ${recommendations ? recommendations.length : 'undefined'}`);
    
    if (!recommendations || recommendations.length === 0) {
      logger('No recommendations found');
      return `Hey! 👋 I looked everywhere but couldn't find anything that matches what you're looking for. Maybe try being a bit more specific, or I can suggest something completely different? 😊`;
    }
    
    logger(`Processing ${recommendations.length} recommendations`);
    logger(`First recommendation: ${JSON.stringify(recommendations[0])}`);
    
    // Validate that recommendations are objects with the expected structure
    const validRecommendations = recommendations.filter(rec => 
      rec && typeof rec === 'object' && rec.name && rec.description
    );
    
    if (validRecommendations.length === 0) {
      logger('No valid recommendations found after filtering');
      return `I found some results but they weren't quite what I expected. Let me try a different approach! 😊`;
    }
    
    logger(`Valid recommendations: ${validRecommendations.length}`);
    
    // Select 3-5 random recommendations
    const maxItems = Math.min(5, Math.max(3, Math.floor(validRecommendations.length * 0.3)));
    const shuffledItems = validRecommendations.sort(() => 0.5 - Math.random());
    const selectedItems = shuffledItems.slice(0, maxItems);
    
    logger(`Selected ${selectedItems.length} items for response`);
    
    // Create results list for AI prompt
    let itemsList = '';
    selectedItems.forEach((item, index) => {
      itemsList += `${index + 1}. ${item.name}`;
      if (item.description && item.description !== 'No description available') {
        itemsList += ` - ${item.description}`;
      }
      if (item.address) {
        itemsList += ` (📍 ${item.address})`;
      }
      itemsList += '\n';
    });
    
    logger('Created items list for AI prompt');
    logger(`Items list preview: ${itemsList.substring(0, 200)}...`);
    
    // Create AI prompt
    const aiPrompt = `You are QlooMate, a friendly AI companion. Respond to the user as if you are their fun, casual friend who just found some cool recommendations for them. 

User's original request: "${userRequest}"
Number of recommendations: ${selectedItems.length}

Here are the recommendations you found (show only a few, not all):\n${itemsList}

Instructions:
- Write a friendly, excited, and casual message as QlooMate.
- Start with a creative, non-formal opening (no 'Based on your request...').
- Present the recommendations as a list, with a short, casual comment for each if you want.
- End with a fun, conversational closing (invite the user to ask for more, or share their thoughts, etc.).
- Use relevant emojis in the message.
- Do NOT be formal or robotic. Be playful and personal.
- Keep the whole message under 200 words.
- Do not mention you are an AI or language model.
- Only output the message, nothing else.`;
    
    logger('Calling OpenAI for user response...');
    
    const aiResponse = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'user',
          content: aiPrompt
        }
      ],
      max_tokens: 300,
      temperature: 0.85
    });
    
    logger('OpenAI response received');
    
    let finalResponse = `Ooh, I found some awesome recommendations for you! 🎉`;
    if (aiResponse.choices && aiResponse.choices[0]) {
      finalResponse = aiResponse.choices[0].message.content.trim();
      logger(`AI generated response: ${finalResponse}`);
    }
    logger('User response built successfully');
    return finalResponse;
  } catch (error) {
    logger(`Error building user response: ${error.message}`);
    logger(`Error stack: ${error.stack}`);
    return `Oops! I found some great recommendations for you but got a bit confused while organizing them 😅 Want me to try again?`;
  }
}

// Handle callback queries (button clicks)
async function handleCallbackQuery(callbackQuery, databases, log, error) {
  try {
    const chatId = callbackQuery.message.chat.id;
    const data = callbackQuery.data;
    const userId = callbackQuery.from.id;

    log(`Processing callback query from ${userId}: ${data}`);

    // Handle different callback data
    let response = "I received your callback query!";
    
    switch (data) {
      case "help":
        response = "I'm here to help! You can ask me anything about music, movies, books, or just chat with me.";
        break;
      case "start":
        response = "Welcome! I'm your AI conversation partner. How can I help you today?";
        break;
      default:
        response = "I'm not sure how to handle that request. Try asking me a question instead!";
    }

    await sendTelegramMessage(chatId, response, log);

  } catch (err) {
    error("Callback query handling error: " + err.message);
  }
}

// Generate AI response using OpenAI
async function generateAIResponse(userMessage, conversationHistory, log) {
  try {
    // Prepare conversation context
    const messages = [
      {
        role: "system",
        content: `You are Qloo Mate, a friendly and knowledgeable AI assistant. You help users discover new things they might like based on their interests. You can discuss music, movies, books, TV shows, games, destinations, and more. Be conversational, helpful, and suggest new discoveries when appropriate. Keep responses concise but engaging.`
      }
    ];

    // Add conversation history (last 10 messages to stay within context limits)
    if (conversationHistory && conversationHistory.length > 0) {
      const recentHistory = conversationHistory.slice(-10);
      for (const msg of recentHistory) {
        messages.push({ role: "user", content: msg.userMessage });
        messages.push({ role: "assistant", content: msg.aiResponse });
      }
    }

    // Add current user message
    messages.push({ role: "user", content: userMessage });

    log(`Sending ${messages.length} messages to OpenAI`);

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: messages,
      max_tokens: 500,
      temperature: 0.7,
    });

    const response = completion.choices[0].message.content;
    log(`OpenAI response: ${response}`);

    return response;

  } catch (err) {
    log("OpenAI API error: " + err.message);
    return "I'm having trouble connecting to my brain right now. Could you try again in a moment?";
  }
}

// Get conversation history from database
async function getConversationHistory(chatId, databases, log) {
  try {
    const databaseId = process.env.APPWRITE_DATABASE_ID || 'qloo_mate_db';
    const collectionId = process.env.APPWRITE_CONVERSATIONS_COLLECTION_ID || 'conversations';

    const response = await databases.listDocuments(
      databaseId,
      collectionId,
      [
        // Add filters if needed
      ]
    );

    // Filter by chatId and sort by timestamp
    // Convert chatId to string for comparison since we store it as string
    const chatIdString = String(chatId);
    const conversations = response.documents
      .filter(doc => doc.chatId === chatIdString)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    return conversations;

  } catch (err) {
    log("Database error getting conversation history: " + err.message);
    return [];
  }
}

// Save conversation to database
async function saveConversation(chatId, userId, username, userMessage, aiResponse, databases, log) {
  try {
    const databaseId = process.env.APPWRITE_DATABASE_ID || 'qloo_mate_db';
    const collectionId = process.env.APPWRITE_CONVERSATIONS_COLLECTION_ID || 'conversations';

    await databases.createDocument(
      databaseId,
      collectionId,
      'unique()', // Auto-generated ID
      {
        chatId: String(chatId), // Convert to string
        userId: String(userId), // Convert to string
        username: username,
        userMessage: userMessage,
        aiResponse: aiResponse,
        timestamp: new Date().toISOString(),
      }
    );

    log(`Saved conversation for chat ${chatId}`);

    // Clean up old messages if conversation history exceeds 10 messages
    await cleanupOldMessages(chatId, databases, log);

  } catch (err) {
    log("Database error saving conversation: " + err.message);
  }
}

// Clean up old messages to keep conversation history manageable
async function cleanupOldMessages(chatId, databases, log) {
  try {
    const databaseId = process.env.APPWRITE_DATABASE_ID || 'qloo_mate_db';
    const collectionId = process.env.APPWRITE_CONVERSATIONS_COLLECTION_ID || 'conversations';
    const MAX_MESSAGES = 10; // Keep only the last 10 messages

    // Get all conversations for this chat
    const response = await databases.listDocuments(
      databaseId,
      collectionId,
      []
    );

    // Filter by chatId and sort by timestamp (oldest first)
    const chatIdString = String(chatId);
    const conversations = response.documents
      .filter(doc => doc.chatId === chatIdString)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    // If we have more than MAX_MESSAGES, delete the oldest ones
    if (conversations.length > MAX_MESSAGES) {
      const messagesToDelete = conversations.slice(0, conversations.length - MAX_MESSAGES);
      
      log(`Cleaning up ${messagesToDelete.length} old messages for chat ${chatId}`);

      // Delete old messages
      for (const message of messagesToDelete) {
        try {
          await databases.deleteDocument(
            databaseId,
            collectionId,
            message.$id
          );
        } catch (deleteErr) {
          log(`Failed to delete message ${message.$id}: ${deleteErr.message}`);
        }
      }

      log(`Successfully cleaned up old messages for chat ${chatId}. Kept ${MAX_MESSAGES} most recent messages.`);
    }

  } catch (err) {
    log("Error cleaning up old messages: " + err.message);
  }
}

// Send message to Telegram
async function sendTelegramMessage(chatId, text, log) {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const telegramApiUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;

    const response = await fetch(telegramApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'Markdown',
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      log(`Telegram API error: ${response.status} - ${errorData}`);
    } else {
      log(`Message sent to chat ${chatId}`);
    }

  } catch (err) {
    log("Error sending Telegram message: " + err.message);
  }
}

// Handle direct OpenAI chat (for testing)
async function handleOpenAIChat(req, res, log, error) {
  try {
    const { message, conversationHistory = [] } = req.body;

    if (!message) {
      return res.json({ error: "Message is required" }, 400);
    }

    const aiResponse = await generateAIResponse(message, conversationHistory, log);

    return res.json({
      response: aiResponse,
      timestamp: new Date().toISOString(),
    });

  } catch (err) {
    error("Chat error: " + err.message);
    return res.json({ error: "Chat processing failed" }, 500);
  }
}

// Handle test chatbot requests from website
async function handleTestChat(req, res, log, error) {
  try {
    log(`Test chat request body: ${JSON.stringify(req.body)}`);
    log(`Test chat request body type: ${typeof req.body}`);
    log(`Test chat request method: ${req.method}`);
    log(`Test chat request path: ${req.path}`);
    log(`Test chat request headers: ${JSON.stringify(req.headers)}`);
    
    // Handle different possible data structures
    let message;
    if (typeof req.body === 'string') {
      message = req.body;
      log(`Message extracted from string: ${message}`);
    } else if (req.body && req.body.message) {
      message = req.body.message;
      log(`Message extracted from req.body.message: ${message}`);
    } else if (req.body && typeof req.body === 'object') {
      // Try to extract message from object
      message = req.body.message || req.body.text || req.body.content || JSON.stringify(req.body);
      log(`Message extracted from object: ${message}`);
    } else {
      message = req.body;
      log(`Message extracted from req.body directly: ${message}`);
    }

    log(`Final extracted message: ${message}`);
    log(`Message type: ${typeof message}`);
    log(`Message length: ${message ? message.length : 0}`);

    if (!message || message.trim() === '') {
      log(`Message validation failed - message is empty or falsy`);
      return res.json({ error: "Message is required" }, 400);
    }

    log(`Test chat request received: ${message}`);

    // Analyze user intent to determine if it's a taste-based request
    const intent = await analyzeUserIntent(message, log);
    
    let aiResponse;
    let suggestions = [];
    
    if (intent.isTasteBased) {
      // Route to qloo-taste function for taste-based recommendations
      log(`Test chat request is taste-based. Routing to qloo-taste function.`);
      const tasteResponse = await getTasteBasedRecommendations(message, log);
      aiResponse = tasteResponse;
    } else {
      // Handle as basic conversation
      log(`Test chat request is basic conversation. Using standard AI response.`);
      aiResponse = await generateAIResponse(message, [], log);
    }

    return res.json({
      success: true,
      response: {
        text: aiResponse,
        suggestions: [] // Don't show suggestions
      },
      timestamp: new Date().toISOString(),
    });

  } catch (err) {
    error("Test chat error: " + err.message);
    return res.json({ 
      success: false,
      error: "Test chat processing failed",
      response: {
        text: "I'm sorry, I'm having trouble processing your request right now. Please try again later.",
        suggestions: ["Restaurants", "Movies", "Books", "Travel", "Music"]
      }
    }, 500);
  }
}

 