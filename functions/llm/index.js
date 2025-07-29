import fetch from 'node-fetch';
import { Client, Functions } from 'node-appwrite';

export default async ({ req, res, log, error }) => {
  try {
    log('=== LLM FUNCTION TRIGGERED ===');
    let bookingData = null;
    try {
      if (req.body) {
        bookingData = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      }
    } catch (parseError) {
      error('Error parsing request body:', parseError.message);
    }

    if (!bookingData || !bookingData.userBookings) {
      return res.json({ success: false, message: 'No valid booking data received.' }, 400);
    }

    // Find the first booking of any supported type
    let firstBooking = null;
    let bookingType = null;
    outerLoop: for (const userBooking of bookingData.userBookings) {
        for (const booking of userBooking.bookings) {
        if (booking.type === 'movie' && booking.bookingDetails && booking.bookingDetails.movie) {
          firstBooking = booking;
          bookingType = 'movie';
          break outerLoop;
        } else if (booking.type === 'travel' && booking.bookingDetails && booking.bookingDetails.to) {
          firstBooking = booking;
          bookingType = 'travel';
          break outerLoop;
        } else if (booking.type === 'dining' && booking.bookingDetails && booking.bookingDetails.restaurant) {
          firstBooking = booking;
          bookingType = 'dining';
          break outerLoop;
        } else if (booking.type === 'book' && booking.bookingDetails && booking.bookingDetails.title) {
          firstBooking = booking;
          bookingType = 'book';
          break outerLoop;
        }
      }
    }

    if (!firstBooking) {
      return res.json({ success: false, message: 'No movie, travel, dining, or book booking found.' }, 404);
    }

    log(`=== PROCESSING ${bookingType.toUpperCase()} BOOKING ===`);
    log(`Booking details: ${JSON.stringify(firstBooking.bookingDetails, null, 2)}`);

    // Call qloo-taste function with booking data
    let tasteResult = null;
    let qlooData = null;
    
    // Check if qloo-taste function ID is available
    const qlooTasteFunctionId = process.env.QLOO_TASTE_FUNCTION_ID;
    if (!qlooTasteFunctionId) {
      log('QLOO_TASTE_FUNCTION_ID environment variable is not set, skipping qloo-taste function call');
      tasteResult = { success: false, error: 'QLOO_TASTE_FUNCTION_ID not configured' };
      qlooData = { error: 'Qloo-taste function not configured' };
    } else {
      try {
        log('=== CALLING QLOO-TASTE FUNCTION ===');
        
        // Extract user ID from the booking data structure
        let userId = 'default_user';
        if (bookingData.userBookings && bookingData.userBookings.length > 0) {
          userId = bookingData.userBookings[0].userId;
        } else if (bookingData.userId) {
          userId = bookingData.userId;
        }
        
        log(`User ID from booking data: ${userId}`);
        log(`Qloo-taste function ID: ${qlooTasteFunctionId}`);
        
        // Prepare data for qloo-taste function
        let tasteData = {
          inspiration: generateInspirationText(bookingType, firstBooking.bookingDetails)
        };
        
        log(`Generated inspiration text: ${tasteData.inspiration}`);
        
        // Initialize Appwrite client
        const client = new Client()
          .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
          .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
          .setKey(req.headers['x-appwrite-key'] || '');
        
        const functions = new Functions(client);
        
        // Call the qloo-taste function using Appwrite SDK
        const execution = await functions.createExecution(
          qlooTasteFunctionId,
          JSON.stringify(tasteData)
        );
        
        log(`Qloo-taste execution ID: ${execution.$id}`);
        log(`Qloo-taste execution status: ${execution.status}`);
        
        if (execution.status === 'completed') {
          log('=== QLOO-TASTE FUNCTION CALLED SUCCESSFULLY ===');
          // Parse the response from qloo-taste function
          try {
            qlooData = JSON.parse(execution.responseBody);
            log('Qloo-taste response:', JSON.stringify(qlooData, null, 2));
          } catch (parseError) {
            log('Error parsing qloo-taste response:', parseError.message);
            qlooData = { error: 'Failed to parse qloo-taste response' };
          }
          tasteResult = { success: true, message: 'Qloo-taste completed' };
        } else {
          log('Qloo-taste function execution failed:', execution.status);
          tasteResult = { success: false, error: execution.stderr };
          qlooData = { error: `Qloo-taste execution failed: ${execution.status}` };
        }
      } catch (tasteError) {
        log('Error calling qloo-taste function:', tasteError.message);
        log('Error details:', tasteError);
        tasteResult = { success: false, error: tasteError.message };
        qlooData = { error: `Qloo-taste call failed: ${tasteError.message}` };
      }
    }

    // Generate user-friendly message using OpenAI based on qloo-taste results
    let userMessage = '';
    if (qlooData && !qlooData.error) {
      try {
        let prompt = '';
        
        if (bookingType === 'movie') {
          const movieTitle = firstBooking.bookingDetails.movie;
          prompt = `Create a short, friendly message for someone who just booked a movie ticket for "${movieTitle}".

Requirements:
- Be conversational and excited about movies
- Include relevant movie emojis (🎬🍿)
- Keep it personal and engaging
- Use the provided recommendations to suggest similar movies

Booking details: ${JSON.stringify(firstBooking.bookingDetails)}
Qloo recommendations: ${JSON.stringify(qlooData)}

Format the response as a friendly message with movie recommendations.`;
          
        } else if (bookingType === 'travel') {
          const destination = firstBooking.bookingDetails.to;
          const travelType = firstBooking.bookingDetails.travelType || 'travel';
          prompt = `Create a short, friendly message for someone who just booked ${travelType} to "${destination}".

Requirements:
- Be conversational and excited about travel
- Include relevant travel emojis (✈️🚂🌍)
- Keep it personal and engaging
- Use the provided recommendations to suggest places to visit

Booking details: ${JSON.stringify(firstBooking.bookingDetails)}
Qloo recommendations: ${JSON.stringify(qlooData)}

Format the response as a friendly message with travel recommendations.`;
          
        } else if (bookingType === 'dining') {
          const restaurant = firstBooking.bookingDetails.restaurant;
          prompt = `Create a short, friendly message for someone who just made a dining reservation at "${restaurant}".

Requirements:
- Be conversational and excited about dining
- Include relevant dining emojis (🍽️🍕🍜)
- Keep it personal and engaging
- Use the provided recommendations to suggest similar restaurants

Booking details: ${JSON.stringify(firstBooking.bookingDetails)}
Qloo recommendations: ${JSON.stringify(qlooData)}

Format the response as a friendly message with dining recommendations.`;
          
        } else if (bookingType === 'book') {
          const bookTitle = firstBooking.bookingDetails.title;
          const author = firstBooking.bookingDetails.author;
          prompt = `Create a short, friendly message for someone who just ordered the book "${bookTitle}" by ${author}.

Requirements:
- Be conversational and excited about reading
- Include relevant reading emojis (📚📖)
- Keep it personal and engaging
- Use the provided recommendations to suggest similar books

Booking details: ${JSON.stringify(firstBooking.bookingDetails)}
Qloo recommendations: ${JSON.stringify(qlooData)}

Format the response as a friendly message with book recommendations.`;
        }
        
        const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
                    headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                      'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [
              {
                role: 'user',
                content: prompt
              }
            ],
            max_tokens: 500,
            temperature: 0.7
          })
        });
        
        const openaiData = await openaiResponse.json();
        if (openaiData.choices && openaiData.choices[0]) {
          userMessage = openaiData.choices[0].message.content.trim();
          log('=== GENERATED USER MESSAGE ===');
          log(userMessage);
          log('=== END GENERATED USER MESSAGE ===');
        }
      } catch (openaiError) {
        log('Error generating user message: ' + openaiError.message);
        // Fallback message
        userMessage = `Hey! Thanks for your ${bookingType} booking! 🎉 We'll send you personalized recommendations soon.`;
      }
    } else {
      log('No valid qloo-taste data, using fallback message');
      userMessage = `Hey! Thanks for your ${bookingType} booking! 🎉 We'll send you personalized recommendations soon.`;
    }

        // Call delivery function to send message to user
    let deliveryResult = null;
    if (userMessage) {
      try {
        log('=== CALLING DELIVERY FUNCTION ===');
        
        // Extract user ID from the booking data structure
        let userId = 'default_user';
        if (bookingData.userBookings && bookingData.userBookings.length > 0) {
          userId = bookingData.userBookings[0].userId;
        } else if (bookingData.userId) {
          userId = bookingData.userId;
        }
        
        log(`User ID from booking data: ${userId}`);
        log(`Delivery function ID: ${process.env.DELIVERY_FUNCTION_ID || 'NOT SET'}`);
        
        // Initialize Appwrite client
        const client = new Client()
          .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
          .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
          .setKey(req.headers['x-appwrite-key'] || '');
        
        const functions = new Functions(client);
        
        // Call the delivery function using Appwrite SDK
        const execution = await functions.createExecution(
          process.env.DELIVERY_FUNCTION_ID,
          JSON.stringify({
            userMessage,
            userId: userId
          })
        );
        
        log(`Delivery execution ID: ${execution.$id}`);
        log(`Delivery execution status: ${execution.status}`);
        
        if (execution.status === 'completed') {
          log('=== DELIVERY FUNCTION CALLED SUCCESSFULLY ===');
          log('=== END DELIVERY FUNCTION CALLED ===');
          deliveryResult = { success: true, message: 'Delivery completed' };
        } else {
          log('Delivery function execution failed:', execution.status);
          deliveryResult = { success: false, error: execution.stderr };
        }
      } catch (deliveryError) {
        log('Error calling delivery function:', deliveryError.message);
        log('Error details:', deliveryError);
      }
    } else {
      log('No user message generated, skipping delivery function call');
    }

    return res.json({
      success: true,
      bookingType,
      bookingDetails: firstBooking.bookingDetails,
      qlooData,
      userMessage,
      deliveryResult,
      tasteResult
    });
  } catch (err) {
    error('LLM function execution failed: ' + err.message);
    return res.json({ success: false, error: err.message }, 500);
  }
}; 

// Helper function to generate inspiration text for qloo-taste function
function generateInspirationText(bookingType, bookingDetails) {
  switch (bookingType) {
    case 'movie':
      const movieTitle = bookingDetails.movie || 'this movie';
      const theatre = bookingDetails.theatre || '';
      const movieDateTime = bookingDetails.dateTime || '';
      return `Find movies similar to "${movieTitle}"${theatre ? ` that are showing at ${theatre}` : ''}${movieDateTime ? ` around ${movieDateTime}` : ''}. I want recommendations for similar movies to watch.`;
      
    case 'travel':
      const destination = bookingDetails.to || 'this destination';
      const from = bookingDetails.from || '';
      const travelType = bookingDetails.travelType || 'travel';
      const departure = bookingDetails.departure || '';
      return `Find places to visit near "${destination}"${from ? ` when traveling from ${from}` : ''} for ${travelType}${departure ? ` around ${departure}` : ''}. I want recommendations for tourist attractions, restaurants, and interesting places to explore.`;
      
    case 'dining':
      const restaurant = bookingDetails.restaurant || 'this restaurant';
      const guests = bookingDetails.guests || '';
      const diningDateTime = bookingDetails.dateTime || '';
      return `Find restaurants similar to "${restaurant}"${guests ? ` for ${guests} people` : ''}${diningDateTime ? ` around ${diningDateTime}` : ''}. I want recommendations for similar dining experiences and restaurants to try.`;
      
    case 'book':
      const bookTitle = bookingDetails.title || 'this book';
      const author = bookingDetails.author || '';
      const price = bookingDetails.price || '';
      return `Find books similar to "${bookTitle}"${author ? ` by ${author}` : ''}${price ? ` in the ${price} price range` : ''}. I want recommendations for similar books to read.`;
      
    default:
      return `Find recommendations related to my ${bookingType} booking. I want personalized suggestions based on my preferences.`;
  }
} 