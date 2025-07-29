import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      return NextResponse.json(
        { error: 'TELEGRAM_BOT_TOKEN not configured' },
        { status: 500 }
      );
    }

    // Get bot information
    const response = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
    const result = await response.json();

    if (!result.ok) {
      return NextResponse.json(
        { error: 'Failed to get bot info', details: result.description },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      bot: {
        username: result.result.username,
        firstName: result.result.first_name,
        id: result.result.id
      }
    });

  } catch (error) {
    console.error('Error getting bot info:', error);
    return NextResponse.json(
      { error: 'Failed to get bot info', details: error.message },
      { status: 500 }
    );
  }
} 