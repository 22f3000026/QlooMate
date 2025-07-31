import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { message } = await request.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required and must be a string' },
        { status: 400 }
      );
    }

    // Simulate AI processing delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

    // Generate response based on message content
    const response = await generateAIResponse(message);

    return NextResponse.json({ 
      success: true, 
      response,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function generateAIResponse(message) {
  const lowerMessage = message.toLowerCase();
  
  // Enhanced response logic that simulates QlooMate's capabilities
  if (lowerMessage.includes('restaurant') || lowerMessage.includes('food') || lowerMessage.includes('dining')) {
    return {
      text: "I'd love to help you find amazing restaurants! Based on your preferences, I'd recommend exploring some authentic Italian cuisine or trying the new fusion restaurant downtown. I can also suggest places based on your location and dietary preferences. What type of cuisine are you in the mood for?",
      suggestions: [
        "Italian restaurants",
        "Asian fusion",
        "Local favorites",
        "Fine dining",
        "Casual spots"
      ]
    };
  } 
  
  if (lowerMessage.includes('movie') || lowerMessage.includes('film')) {
    return {
      text: "Great choice! I've analyzed your viewing history and think you'd enjoy the new sci-fi thriller that just came out, or perhaps a classic film from the 90s that matches your taste. I can also recommend based on your mood or genre preferences. What are you looking for?",
      suggestions: [
        "Action movies",
        "Drama films",
        "Comedy",
        "Documentaries",
        "Foreign films"
      ]
    };
  } 
  
  if (lowerMessage.includes('book') || lowerMessage.includes('reading')) {
    return {
      text: "I see you enjoy mystery novels and business books! I'd recommend checking out the latest bestseller in the thriller genre or a fascinating book about AI and the future of work. I can also suggest based on your current interests or what you've been reading lately. What interests you more?",
      suggestions: [
        "Mystery & Thriller",
        "Business & Finance",
        "Science Fiction",
        "Biographies",
        "Self-help"
      ]
    };
  } 
  
  if (lowerMessage.includes('travel') || lowerMessage.includes('trip')) {
    return {
      text: "I'd be happy to help you plan your next adventure! Based on your travel patterns, I think you'd enjoy exploring the cultural sites in Europe or perhaps a relaxing beach destination. I can suggest destinations, activities, and even help with planning based on your preferences and budget. Where are you thinking of going?",
      suggestions: [
        "European destinations",
        "Beach getaways",
        "Cultural tours",
        "Adventure travel",
        "City breaks"
      ]
    };
  } 
  
  if (lowerMessage.includes('music') || lowerMessage.includes('concert')) {
    return {
      text: "Music is a great way to discover new experiences! I've noticed you enjoy indie rock and jazz. There's a fantastic jazz festival coming up next month, and I can also recommend some new artists you might like. I can suggest concerts, albums, or even help you discover new genres. What sounds good?",
      suggestions: [
        "Live concerts",
        "New albums",
        "Jazz festivals",
        "Indie artists",
        "Classical music"
      ]
    };
  } 
  
  if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
    return {
      text: "Hello! I'm QlooMate, your AI-powered go-to companion. I can help you discover amazing experiences tailored to your interests. What would you like to explore today? I can help with restaurants, movies, books, travel, music, and much more!",
      suggestions: [
        "Restaurant recommendations",
        "Movie suggestions",
        "Book recommendations",
        "Travel planning",
        "Music discovery"
      ]
    };
  } 
  
  if (lowerMessage.includes('help') || lowerMessage.includes('what can you do')) {
    return {
      text: "I'm QlooMate, and I'm here to help you discover amazing experiences! I can analyze your preferences and provide personalized recommendations for restaurants, movies, books, travel destinations, music, and much more. Just tell me what you're interested in, and I'll help you find the perfect options!",
      suggestions: [
        "Tell me about restaurants",
        "Suggest some movies",
        "Recommend books",
        "Help with travel",
        "Music recommendations"
      ]
    };
  }
  
  // Default response for other queries
  return {
    text: "That's interesting! I'd love to help you discover new experiences related to that. I can suggest restaurants, movies, books, travel destinations, music, and many other things based on your preferences. Could you tell me more about what you're looking for?",
    suggestions: [
      "Restaurants",
      "Movies",
      "Books", 
      "Travel",
      "Music"
    ]
  };
} 