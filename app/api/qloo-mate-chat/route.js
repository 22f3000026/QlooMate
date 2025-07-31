import { NextResponse } from 'next/server';
import { Client, Functions } from 'node-appwrite';

export async function POST(request) {
  try {
    const { message } = await request.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required and must be a string' },
        { status: 400 }
      );
    }

    // Initialize Appwrite client
    const client = new Client()
      .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT || 'https://nyc.cloud.appwrite.io/v1')
      .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID || 'qloohack')
      .setKey(process.env.APPWRITE_FUNCTION_API_KEY || process.env.APPWRITE_API_KEY || '');
    
    // Check if API key is available
    const apiKey = process.env.APPWRITE_FUNCTION_API_KEY || process.env.APPWRITE_API_KEY;
    if (!apiKey) {
      console.error('Appwrite API key not found in environment variables');
      return NextResponse.json(
        { 
          success: false,
          error: 'Appwrite API key not configured',
          response: {
            text: "I'm sorry, the QlooMate system is not properly configured right now. Please try again later.",
            suggestions: ["Restaurants", "Movies", "Books", "Travel", "Music"]
          }
        },
        { status: 500 }
      );
    }
    
    const functions = new Functions(client);
    
    console.log('Calling qloo-mate-telegram function with message:', message);

    // Call the qloo-mate function using Appwrite SDK
    const execution = await functions.createExecution(
      'qloo-mate',
      JSON.stringify({
        message: message
      }),
      false // async parameter
    );

    console.log('Qloo-mate-telegram function execution result:', execution);

    // Check if execution was successful
    if (execution.status !== 'completed') {
      console.error('Function execution failed:', execution);
      return NextResponse.json(
        { 
          success: false,
          error: 'Function execution failed',
          response: {
            text: "I'm sorry, the QlooMate function is not responding right now. Please try again later.",
            suggestions: ["Restaurants", "Movies", "Books", "Travel", "Music"]
          }
        },
        { status: 500 }
      );
    }

    // Parse the response from the execution
    let result;
    try {
      result = JSON.parse(execution.responseBody);
      console.log('Qloo-mate-telegram function parsed response:', result);
    } catch (parseError) {
      console.error('Failed to parse function response:', parseError);
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid response from function',
          response: {
            text: "I'm sorry, I received an invalid response from the QlooMate system. Please try again later.",
            suggestions: ["Restaurants", "Movies", "Books", "Travel", "Music"]
          }
        },
        { status: 500 }
      );
    }

    // Check if the function was successful
    if (result.success && result.response) {
      return NextResponse.json({ 
        success: true, 
        response: result.response,
        timestamp: result.timestamp || new Date().toISOString()
      });
    } else {
      console.error('Qloo-mate-telegram function returned error:', result);
      return NextResponse.json(
        { 
          success: false,
          error: result.error || 'Function execution failed',
          response: {
            text: "I'm sorry, I'm having trouble processing your request right now. Please try again later.",
            suggestions: ["Restaurants", "Movies", "Books", "Travel", "Music"]
          }
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Qloo-mate-chat API error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        response: {
          text: "I'm sorry, I'm having trouble connecting to QlooMate right now. Please try again later.",
          suggestions: ["Restaurants", "Movies", "Books", "Travel", "Music"]
        }
      },
      { status: 500 }
    );
  }
} 