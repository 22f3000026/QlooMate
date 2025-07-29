import { NextResponse } from 'next/server';
import { Client, Account } from 'node-appwrite';

// Initialize Appwrite client
const appwriteClient = new Client()
  .setEndpoint('https://nyc.cloud.appwrite.io/v1')
  .setProject('qloohack');

const appwriteAccount = new Account(appwriteClient);

export async function POST(request) {
  try {
    const body = await request.json();
    
    // Verify this is a Telegram update
    if (!body.message) {
      return NextResponse.json({ success: false, error: 'No message in update' });
    }

    const { message } = body;
    const chatId = message.chat.id;
    const userId = message.from.id;
    const username = message.from.username;
    const firstName = message.from.first_name;
    const lastName = message.from.last_name;
    const text = message.text;

    console.log(`Received message from chat ID: ${chatId}, user: ${username || firstName}`);

    // Check if this is a start command or help command
    if (text === '/start' || text === '/help') {
      // Send welcome message with instructions
      await sendTelegramMessage(chatId, 
        `👋 Welcome to Qloo Hack Bot!\n\n` +
        `To connect your Telegram account to the app:\n\n` +
        `1. Go to your dashboard in the web app\n` +
        `2. Click "Connect Telegram" in the Emails tab\n` +
        `3. Click "Get Chat ID from Bot" button\n` +
        `4. Enter this code: \`${chatId}\`\n\n` +
        `This will automatically connect your Telegram account for notifications!`
      );
      
      return NextResponse.json({ success: true });
    }

    // For any other message, just acknowledge it
    await sendTelegramMessage(chatId, 
      `✅ Thanks for your message!\n\n` +
      `Your chat ID is: \`${chatId}\`\n\n` +
      `Use this ID in the web app to connect your Telegram account.`
    );

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Telegram webhook error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// Function to send Telegram message
async function sendTelegramMessage(chatId, message) {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      console.error('TELEGRAM_BOT_TOKEN not configured');
      return;
    }

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
    
    if (!result.ok) {
      console.error(`Failed to send Telegram message: ${result.description}`);
    }
  } catch (error) {
    console.error('Error sending Telegram message:', error);
  }
} 