import { Client, Users, Functions } from 'node-appwrite';
import fetch from 'node-fetch';

// This Appwrite function will be executed every time your function is triggered
export default async ({ req, res, log, error }) => {
  // You can use the Appwrite SDK to interact with other services
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(req.headers['x-appwrite-key'] ?? '');
  const users = new Users(client);
  const functions = new Functions(client);

  try {
    log('=== QLOO-PREF FUNCTION TRIGGERED ===');
    log(`Timestamp: ${new Date().toISOString()}`);
    log(`Request method: ${req.method}`);
    log(`Request path: ${req.path}`);

    // Get all users
    const usersResponse = await users.list();
    log(`Total users to process: ${usersResponse.total}`);

    const allUserResults = [];

    for (const user of usersResponse.users) {
      try {
        log(`=== PROCESSING USER: ${user.$id} ===`);
        
        // Get user preferences
        const userPrefs = await getUserPreferences(user.$id, users, log);
        
        // Check if taste preferences exist and are not empty with proper type checking
        let hasTastePreferences = false;
        if (userPrefs.tastePreferences) {
          if (typeof userPrefs.tastePreferences === 'string') {
            hasTastePreferences = userPrefs.tastePreferences.trim() !== '';
          } else if (Array.isArray(userPrefs.tastePreferences)) {
            hasTastePreferences = userPrefs.tastePreferences.length > 0;
          } else if (typeof userPrefs.tastePreferences === 'object' && userPrefs.tastePreferences !== null) {
            hasTastePreferences = Object.keys(userPrefs.tastePreferences).length > 0;
          } else {
            hasTastePreferences = String(userPrefs.tastePreferences).trim() !== '';
          }
        }
        
        if (!hasTastePreferences) {
          log(`User ${user.$id} has no taste preferences, skipping...`);
          continue;
        }

        log(`User ${user.$id} taste preferences: ${userPrefs.tastePreferences}`);

        // Generate inspiration text based on taste preferences
        const inspirationText = generateInspirationFromTaste(userPrefs.tastePreferences);
        log(`Generated inspiration: ${inspirationText}`);

        // Step 1: Use OpenAI to refine the random taste into a better sentence
        const refinedInspiration = await refineInspirationWithOpenAI(inspirationText, log, error);
        log(`Refined inspiration: ${refinedInspiration}`);

        // Step 2: Call qloo-taste function with refined inspiration
        const qlooResult = await callQlooTaste(refinedInspiration, functions, log, error);
        
        if (qlooResult.success && qlooResult.data) {
          // Step 3: Generate content using OpenAI based on qloo-taste results
          const openaiContent = await generateContentWithOpenAI(
            userPrefs.tastePreferences, 
            qlooResult.data, 
            log, 
            error
          );

          // Step 4: Call delivery function to send the content to the user
          const deliveryResult = await callDeliveryFunction(
            user.$id,
            openaiContent,
            functions,
            log,
            error
          );

          const userResult = {
            userId: user.$id,
            userEmail: user.email,
            tastePreferences: userPrefs.tastePreferences,
            originalInspiration: inspirationText,
            refinedInspiration: refinedInspiration,
            qlooResults: qlooResult.data,
            generatedContent: openaiContent,
            deliveryResult: deliveryResult
          };

          allUserResults.push(userResult);

          log(`=== USER ${user.$id} PROCESSING COMPLETED ===`);
          log(`Generated content: ${openaiContent.substring(0, 200)}...`);
          log(`Delivery result: ${deliveryResult.success ? 'Success' : 'Failed'}`);
        } else {
          log(`Qloo-taste failed for user ${user.$id}: ${qlooResult.error}`);
        }

      } catch (userError) {
        error(`Error processing user ${user.$id}: ${userError.message}`);
        continue; // Continue with next user
      }
    }

    log(`=== FUNCTION COMPLETED ===`);
    log(`Successfully processed ${allUserResults.length} users`);

    return res.json({
      success: true,
      message: `Processed ${usersResponse.total} users`,
      totalUsersProcessed: allUserResults.length,
      userResults: allUserResults,
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    error("Qloo-pref function execution failed: " + err.message);
    return res.json({
      success: false,
      error: err.message,
      timestamp: new Date().toISOString()
    }, 500);
  }
};

// Function to get user preferences
async function getUserPreferences(userId, users, log) {
  try {
    const user = await users.get(userId);
    
    // Check if user has preferences
    if (user.prefs && Object.keys(user.prefs).length > 0) {
      const tastePreferences = user.prefs.taste || '';
      log(`User ${userId} taste preferences: ${tastePreferences}`);
      
      return {
        tastePreferences: tastePreferences
      };
    } else {
      log(`User ${userId} has no preferences`);
      return {
        tastePreferences: ''
      };
    }
    
  } catch (err) {
    log(`Error getting user preferences for ${userId}: ${err.message}`);
    return {
      tastePreferences: ''
    };
  }
}

// Function to generate inspiration text from taste preferences
function generateInspirationFromTaste(tastePreferences) {
  // Add type checking to handle different data types
  let tastePrefsString = '';
  
  if (typeof tastePreferences === 'string') {
    tastePrefsString = tastePreferences;
  } else if (Array.isArray(tastePreferences)) {
    tastePrefsString = tastePreferences.join(',');
  } else if (typeof tastePreferences === 'object' && tastePreferences !== null) {
    tastePrefsString = Object.values(tastePreferences).join(',');
  } else {
    // Fallback for any other type
    tastePrefsString = String(tastePreferences || '');
  }
  
  const tastes = tastePrefsString.toLowerCase().split(',').map(t => t.trim()).filter(t => t.length > 0);
  
  // Define all available taste types with their descriptions
  const tasteTypes = {
    'movie': 'Find popular movies and entertainment content',
    'travel': 'Find travel destinations and places to visit',
    'dining': 'Find restaurants and food recommendations',
    'book': 'Find books and reading recommendations',
    'recipe': 'Find local recipes and cooking tips',
    'challenge': 'Find fun food exploration challenges',
    'culture': 'Find local customs and traditions',
    'seasonal': 'Find time-based suggestions',
    'weather': 'Find weather-based activity suggestions',
    'budget': 'Find cost-saving recommendations'
  };
  
  // Filter available tastes that the user has
  const availableTastes = tastes.filter(taste => tasteTypes.hasOwnProperty(taste));
  
  if (availableTastes.length === 0) {
    // If no valid tastes found, use a generic prompt
    return 'I want personalized recommendations based on my interests.';
  }
  
  // Randomly select one taste from the user's available tastes
  const randomIndex = Math.floor(Math.random() * availableTastes.length);
  const selectedTaste = availableTastes[randomIndex];
  const selectedDescription = tasteTypes[selectedTaste];
  
  return `${selectedDescription}. I want personalized recommendations based on this interest.`;
}

// Function to refine inspiration text using OpenAI
async function refineInspirationWithOpenAI(originalInspiration, log, error) {
  try {
    log('=== REFINING INSPIRATION WITH OPENAI ===');
    
    const prompt = `Take this basic inspiration text and make it more engaging, specific, and detailed for better search results:

Original: "${originalInspiration}"

Please refine it into a more compelling and specific sentence that will help find better recommendations. Make it:
- More engaging and interesting
- More specific about what kind of content is desired
- Better structured for search algorithms
- Include relevant keywords

Return only the refined sentence, nothing else.`;

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
        max_tokens: 150,
        temperature: 0.7
      })
    });
    
    const openaiData = await openaiResponse.json();
    
    if (openaiData.choices && openaiData.choices[0]) {
      const refinedText = openaiData.choices[0].message.content.trim();
      log('=== REFINED INSPIRATION ===');
      log(refinedText);
      log('=== END REFINED INSPIRATION ===');
      return refinedText;
    } else {
      log('No valid response from OpenAI for refinement, using original');
      return originalInspiration;
    }
    
  } catch (refineError) {
    log('Error refining inspiration with OpenAI:', refineError.message);
    return originalInspiration; // Fallback to original
  }
}

// Function to call qloo-taste function
async function callQlooTaste(inspirationText, functions, log, error) {
  try {
    log('=== CALLING QLOO-TASTE FUNCTION ===');
    
    // Check if qloo-taste function ID is available
    const qlooTasteFunctionId = process.env.QLOO_TASTE_FUNCTION_ID;
    if (!qlooTasteFunctionId) {
      log('QLOO_TASTE_FUNCTION_ID environment variable is not set');
      return { success: false, error: 'QLOO_TASTE_FUNCTION_ID not configured' };
    }

    log(`Qloo-taste function ID: ${qlooTasteFunctionId}`);
    
    // Prepare data for qloo-taste function
    const tasteData = {
      inspiration: inspirationText
    };
    
    log(`Sending inspiration: ${inspirationText}`);
    
    // Call the qloo-taste function
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
        const qlooData = JSON.parse(execution.responseBody);
        log('Qloo-taste response received');
        log(`Results count: ${qlooData.results?.length || 0}`);
        
        return { success: true, data: qlooData };
      } catch (parseError) {
        log('Error parsing qloo-taste response:', parseError.message);
        return { success: false, error: 'Failed to parse qloo-taste response' };
      }
    } else {
      log('Qloo-taste function execution failed:', execution.status);
      return { success: false, error: execution.stderr };
    }
  } catch (tasteError) {
    log('Error calling qloo-taste function:', tasteError.message);
    return { success: false, error: tasteError.message };
  }
}

// Function to generate content using OpenAI
async function generateContentWithOpenAI(tastePreferences, qlooResults, log, error) {
  try {
    log('=== GENERATING CONTENT WITH OPENAI ===');
    
    // Extract taste preferences with type checking
    let tastePrefsString = '';
    
    if (typeof tastePreferences === 'string') {
      tastePrefsString = tastePreferences;
    } else if (Array.isArray(tastePreferences)) {
      tastePrefsString = tastePreferences.join(',');
    } else if (typeof tastePreferences === 'object' && tastePreferences !== null) {
      tastePrefsString = Object.values(tastePreferences).join(',');
    } else {
      // Fallback for any other type
      tastePrefsString = String(tastePreferences || '');
    }
    
    const tastes = tastePrefsString.toLowerCase().split(',').map(t => t.trim()).filter(t => t.length > 0);
    
    // Get recommendations from qloo results
    const recommendations = qlooResults.results || [];
    const recommendationNames = recommendations.map(r => r.name).join(', ');
    
    // Determine which taste was used by checking the qloo results context
    // We'll use the first taste preference as the primary one for content generation
    const primaryTaste = tastes[0] || 'general';
    
    let prompt = '';
    
    // Create different types of content based on the primary taste preference
    if (primaryTaste === 'movie') {
      prompt = `You are Qloo Daily, a daily newsletter that sends engaging content to users. Based on these movie and entertainment recommendations: ${recommendationNames}, create a daily message that could include:
- An inspiring quote about movies, cinema, or entertainment
- An interesting fact about movies or the film industry
- A movie recommendation or review
- A fun movie trivia or behind-the-scenes fact
- A movie night suggestion or activity

Choose the most engaging content type and create one compelling daily message. Make it personal, include relevant emojis, and keep it concise but impactful.`;
    } else if (primaryTaste === 'travel') {
      prompt = `You are Qloo Daily, a daily newsletter that sends engaging content to users. Based on these travel destinations: ${recommendationNames}, create a daily message that could include:
- An inspiring travel quote about adventure or exploration
- An interesting fact about travel or one of these destinations
- A travel tip or recommendation
- A fun fact about world travel or culture
- A travel activity or planning suggestion

Choose the most engaging content type and create one compelling daily message. Make it personal, include relevant emojis, and keep it concise but impactful.`;
    } else if (primaryTaste === 'dining') {
      prompt = `You are Qloo Daily, a daily newsletter that sends engaging content to users. Based on these restaurant and food recommendations: ${recommendationNames}, create a daily message that could include:
- An inspiring quote about food, dining, or culinary experiences
- An interesting fact about food culture or cuisine
- A recipe or cooking tip
- A restaurant recommendation or review
- A fun fact about restaurants or dining

Choose the most engaging content type and create one compelling daily message. Make it personal, include relevant emojis, and keep it concise but impactful.`;
    } else if (primaryTaste === 'book') {
      prompt = `You are Qloo Daily, a daily newsletter that sends engaging content to users. Based on these book recommendations: ${recommendationNames}, create a daily message that could include:
- An inspiring quote about reading, books, or knowledge
- An interesting fact about literature or reading
- A book recommendation or review
- A reading tip or challenge
- A fun fact about books or authors

Choose the most engaging content type and create one compelling daily message. Make it personal, include relevant emojis, and keep it concise but impactful.`;
    } else if (primaryTaste === 'recipe') {
      prompt = `You are Qloo Daily, a daily newsletter that sends engaging content to users. Based on these recipe and cooking recommendations: ${recommendationNames}, create a daily message that could include:
- An inspiring quote about cooking, recipes, or the kitchen
- An interesting fact about cooking or food preparation
- A detailed recipe with cooking tips
- A cooking technique or method
- A fun fact about recipes or cooking

Choose the most engaging content type and create one compelling daily message. Make it personal, include relevant emojis, and keep it concise but impactful.`;
    } else if (primaryTaste === 'challenge') {
      prompt = `You are Qloo Daily, a daily newsletter that sends engaging content to users. Based on these food challenge recommendations: ${recommendationNames}, create a daily message that could include:
- An inspiring quote about challenges, exploration, or trying new things
- An interesting fact about food challenges or culinary adventures
- A fun food challenge to try
- A food discovery activity
- A fun fact about food exploration

Choose the most engaging content type and create one compelling daily message. Make it personal, include relevant emojis, and keep it concise but impactful.`;
    } else if (primaryTaste === 'culture') {
      prompt = `You are Qloo Daily, a daily newsletter that sends engaging content to users. Based on these cultural recommendations: ${recommendationNames}, create a daily message that could include:
- An inspiring quote about culture, traditions, or heritage
- An interesting fact about cultural practices or traditions
- A cultural activity or tradition to explore
- A traditional recipe or cultural dish
- A fun fact about different cultures or customs

Choose the most engaging content type and create one compelling daily message. Make it personal, include relevant emojis, and keep it concise but impactful.`;
    } else if (primaryTaste === 'seasonal') {
      prompt = `You are Qloo Daily, a daily newsletter that sends engaging content to users. Based on these seasonal recommendations: ${recommendationNames}, create a daily message that could include:
- An inspiring quote about seasons, time, or seasonal changes
- An interesting fact about seasonal activities or traditions
- A seasonal recipe or activity
- A time-based suggestion
- A fun fact about seasonal events or celebrations

Choose the most engaging content type and create one compelling daily message. Make it personal, include relevant emojis, and keep it concise but impactful.`;
    } else if (primaryTaste === 'weather') {
      prompt = `You are Qloo Daily, a daily newsletter that sends engaging content to users. Based on these weather-based recommendations: ${recommendationNames}, create a daily message that could include:
- An inspiring quote about weather, nature, or adapting to conditions
- An interesting fact about weather patterns or activities
- A weather-appropriate recipe or activity
- A weather-based suggestion
- A fun fact about weather-related activities or phenomena

Choose the most engaging content type and create one compelling daily message. Make it personal, include relevant emojis, and keep it concise but impactful.`;
    } else if (primaryTaste === 'budget') {
      prompt = `You are Qloo Daily, a daily newsletter that sends engaging content to users. Based on these budget-friendly recommendations: ${recommendationNames}, create a daily message that could include:
- An inspiring quote about saving money, budgeting, or smart spending
- An interesting fact about budgeting or cost-saving
- A budget-friendly recipe or activity
- A money-saving tip or challenge
- A fun fact about budget-friendly options or saving money

Choose the most engaging content type and create one compelling daily message. Make it personal, include relevant emojis, and keep it concise but impactful.`;
    } else {
      prompt = `You are Qloo Daily, a daily newsletter that sends engaging content to users. Based on these recommendations: ${recommendationNames}, create a daily message that could include:
- An inspiring quote related to these interests
- An interesting fact about the topic
- A recommendation or tip
- An activity or challenge
- A fun fact about the subject

Choose the most engaging content type and create one compelling daily message. Make it personal, include relevant emojis, and keep it concise but impactful.`;
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
        max_tokens: 600,
        temperature: 0.7
      })
    });
    
    const openaiData = await openaiResponse.json();
    
    if (openaiData.choices && openaiData.choices[0]) {
      const content = openaiData.choices[0].message.content.trim();
      log('=== OPENAI CONTENT GENERATED ===');
      log(content);
      log('=== END OPENAI CONTENT ===');
      return content;
    } else {
      log('No valid response from OpenAI');
      return 'Unable to generate personalized content at this time.';
    }
    
  } catch (openaiError) {
    log('Error generating content with OpenAI:', openaiError.message);
    return 'Unable to generate personalized content at this time.';
  }
}

// Function to call delivery function
async function callDeliveryFunction(userId, userMessage, functions, log, error) {
  try {
    log('=== CALLING DELIVERY FUNCTION ===');
    
    // Check if delivery function ID is available
    const deliveryFunctionId = process.env.DELIVERY_FUNCTION_ID;
    if (!deliveryFunctionId) {
      log('DELIVERY_FUNCTION_ID environment variable is not set');
      return { success: false, error: 'DELIVERY_FUNCTION_ID not configured' };
    }

    log(`Delivery function ID: ${deliveryFunctionId}`);
    
    // Prepare data for delivery function
    const deliveryData = {
      userId: userId,
      userMessage: userMessage
    };
    
    log(`Sending to user ${userId}: ${userMessage.substring(0, 100)}...`);
    
    // Call the delivery function
    const execution = await functions.createExecution(
      deliveryFunctionId,
      JSON.stringify(deliveryData)
    );
    
    log(`Delivery execution ID: ${execution.$id}`);
    log(`Delivery execution status: ${execution.status}`);
    
    if (execution.status === 'completed') {
      log('=== DELIVERY FUNCTION CALLED SUCCESSFULLY ===');
      
      // Parse the response from delivery function
      try {
        const deliveryResponse = JSON.parse(execution.responseBody);
        log('Delivery response received');
        log(`Delivery success: ${deliveryResponse.success}`);
        
        return { success: true, data: deliveryResponse };
      } catch (parseError) {
        log('Error parsing delivery response:', parseError.message);
        return { success: false, error: 'Failed to parse delivery response' };
      }
    } else {
      log('Delivery function execution failed:', execution.status);
      return { success: false, error: execution.stderr };
    }
  } catch (deliveryError) {
    log('Error calling delivery function:', deliveryError.message);
    return { success: false, error: deliveryError.message };
  }
}