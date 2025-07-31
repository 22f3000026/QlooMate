# Qloo Mate Telegram Function

An AI-powered Telegram bot function built with Appwrite that integrates OpenAI for intelligent conversations and helps users discover new content based on their interests.

## Features

- 🤖 **AI-Powered Conversations**: Uses OpenAI GPT-3.5-turbo for intelligent responses
- 🧠 **Intelligent Intent Analysis**: Automatically detects if user wants taste-based recommendations or basic conversation
- 🎯 **Smart Routing**: Routes taste-based requests to qloo-taste function for personalized recommendations
- 💬 **Telegram Integration**: Full Telegram bot webhook support
- 🧠 **Conversation Memory**: Stores conversation history in Appwrite database
- 🎯 **Context Awareness**: Maintains conversation context for better responses
- 🔄 **Callback Query Support**: Handles inline keyboard interactions
- 📊 **Database Integration**: Uses Appwrite Databases for conversation storage
- 🧪 **Testing Endpoints**: Direct chat endpoint for testing without Telegram

## Setup

### 1. Environment Variables

Set the following environment variables in your Appwrite function:

```bash
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here

# Appwrite Configuration (auto-set by Appwrite)
APPWRITE_FUNCTION_API_ENDPOINT
APPWRITE_FUNCTION_PROJECT_ID
APPWRITE_FUNCTION_API_KEY=your_appwrite_api_key_here
APPWRITE_DATABASE_ID=qloo_mate_db
APPWRITE_CONVERSATIONS_COLLECTION_ID=conversations
```

### 2. Database Setup

Create a database in Appwrite with the following collection structure:

**Collection: `conversations`**
- `chatId` (string, required) - Telegram chat ID
- `userId` (string, required) - Telegram user ID
- `username` (string, required) - Telegram username
- `userMessage` (string, required) - User's message
- `aiResponse` (string, required) - AI's response
- `timestamp` (string, required) - ISO timestamp

### 3. Telegram Bot Setup

1. Create a bot with [@BotFather](https://t.me/botfather) on Telegram
2. Get your bot token
3. Set the webhook URL to your function's webhook endpoint:
   ```
   https://your-appwrite-endpoint.com/v1/functions/YOUR_FUNCTION_ID/executions/webhook
   ```

### 4. Intelligent Routing Setup

The bot automatically analyzes user messages and routes them appropriately:

**Taste-Based Requests** (routed to qloo-taste function):
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

**Basic Conversation** (handled by standard AI):
- General questions
- Casual chat
- Personal questions
- General knowledge questions
- Non-recommendation requests

## API Endpoints

### `/webhook` (POST)
Telegram webhook endpoint that receives updates from Telegram.

**Request Body**: Telegram Update object
```json
{
  "update_id": 123456789,
  "message": {
    "message_id": 123,
    "from": {
      "id": 123456789,
      "first_name": "John",
      "username": "john_doe"
    },
    "chat": {
      "id": 123456789,
      "type": "private"
    },
    "text": "Hello, bot!"
  }
}
```

### `/chat` (POST)
Direct chat endpoint for testing without Telegram integration.

**Request Body**:
```json
{
  "message": "What movies would I like?",
  "conversationHistory": [
    {
      "userMessage": "I love sci-fi movies",
      "aiResponse": "Great! I can suggest some amazing sci-fi films..."
    }
  ]
}
```

**Response**:
```json
{
  "response": "Based on your love for sci-fi, I'd recommend...",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### `/ping` (GET)
Health check endpoint.

**Response**: `"Pong"`

## Usage Examples

### Starting a Conversation
```
User: "Hi, I'm looking for new music to listen to"
Bot: "Hello! I'd love to help you discover new music. What genres do you typically enjoy? Are you into rock, pop, electronic, or something else?"
```

### Getting Recommendations
```
User: "I love The Beatles and Pink Floyd"
Bot: "Excellent taste! Since you enjoy classic rock and psychedelic elements, you might love:
- Tame Impala (modern psychedelic rock)
- The Doors (classic psychedelic rock)
- Radiohead (experimental rock)
- Fleet Foxes (folk-rock with harmonies)

Would you like me to suggest some specific albums or explore other genres?"
```

### Handling Callback Queries
The bot can handle inline keyboard interactions for better user experience.

## AI Personality

The bot is configured with a friendly, knowledgeable personality that:
- Helps users discover new content (music, movies, books, etc.)
- Maintains conversation context
- Provides personalized recommendations
- Uses a conversational tone
- Keeps responses concise but engaging

## Error Handling

The function includes comprehensive error handling for:
- OpenAI API failures
- Telegram API errors
- Database connection issues
- Invalid requests
- Network timeouts

## Development

### Local Testing

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables in a `.env` file

3. Test the chat endpoint:
   ```bash
   curl -X POST http://localhost:3000/chat \
     -H "Content-Type: application/json" \
     -d '{"message": "Hello, bot!"}'
   ```

### Deployment

Deploy to Appwrite using the Appwrite CLI or dashboard:

```bash
appwrite functions createDeployment \
  --functionId YOUR_FUNCTION_ID \
  --code ./functions/qloo-mate-telegram
```

## Security Considerations

- All API keys are stored as environment variables
- Input validation is performed on all requests
- Database queries are properly sanitized
- Error messages don't expose sensitive information

## Monitoring

The function includes comprehensive logging:
- Incoming message processing
- OpenAI API calls
- Database operations
- Error tracking
- Performance metrics

Check the Appwrite function logs for debugging and monitoring.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License. 