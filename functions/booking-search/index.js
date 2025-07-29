import { Client, Users, Databases, Account } from 'node-appwrite';
import { google } from 'googleapis';

// This Appwrite function will be executed manually or via API calls
export default async ({ req, res, log, error }) => {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(req.headers['x-appwrite-key'] ?? '');

  const users = new Users(client);
  const databases = new Databases(client);
  const account = new Account(client);

  try {
    log('Starting booking email monitor...');
    
    // Get all users
    const usersResponse = await users.list();
    log(`Total users to check: ${usersResponse.total}`);

    const allUserBookings = [];

    for (const user of usersResponse.users) {
      try {
        const userBookings = await processUserBookings(user, users, log, error);
        if (userBookings && userBookings.length > 0) {
          const userBookingData = {
            userId: user.$id,
            userEmail: user.email,
            bookings: userBookings
          };
          allUserBookings.push(userBookingData);

          // Call another function for this user only
          try {
            await callAnotherFunction({
              totalBookings: userBookings.length,
              userBookings: [userBookingData],
              timestamp: new Date().toISOString()
            }, log, error);
          } catch (callError) {
            error(`Error calling another function for user ${user.$id}: ${callError.message}`);
            // Don't fail the main function if the call fails
          }
        }
      } catch (userError) {
        error(`Error processing user ${user.$id}: ${userError.message}`);
        continue; // Continue with next user
      }
    }

    // No need to call the function for all users at once anymore

    return res.json({
      success: true,
      message: `Processed ${usersResponse.total} users`,
      totalBookingsFound: allUserBookings.reduce((sum, user) => sum + user.bookings.length, 0),
      userBookings: allUserBookings.map(userBooking => ({
        userId: userBooking.userId,
        userEmail: userBooking.userEmail,
        bookings: userBooking.bookings.map(booking => ({
          id: booking.id,
          subject: booking.subject,
          from: booking.from,
          date: booking.date,
          type: booking.type,
          extractedDetails: booking.bookingDetails
        }))
      })),
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    error("Function execution failed: " + err.message);
    return res.json({
      success: false,
      error: err.message,
      timestamp: new Date().toISOString()
    }, 500);
  }
};

// Function to call another Appwrite function with booking data
async function callAnotherFunction(bookingData, log, error) {
  try {
    const { Client, Functions } = await import('node-appwrite');
    
    // Init SDK
    const client = new Client();
    const functions = new Functions(client);

    client
      .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
      .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
      .setKey(process.env.APPWRITE_API_KEY); // Make sure this is set in function env vars

    log('Calling another Appwrite function with booking data...');
    
    // Fire and forget - don't wait for response
    functions.createExecution(
      process.env.TARGET_FUNCTION_ID, // Set this in function env vars
      JSON.stringify(bookingData), // Pass the booking data as JSON string
      false, // async (optional)
      '/', // path (optional)
      'POST', // method (optional)
      { 'Content-Type': 'application/json' } // headers (optional)
    );

    log('Successfully initiated call to another function');
    return true; // Success if data was passed
    
  } catch (err) {
    error('Error calling another function:', err.message);
    return false; // Failed to pass data
  }
}

async function processUserBookings(user, users, log, error) {
  try {
    // Get user preferences from Appwrite's built-in preferences
    const userPrefs = await getUserPreferences(user.$id, users, log);
    
    if (!userPrefs.gmailRefreshToken) {
      log(`User ${user.$id} missing Gmail token, skipping...`);
      return [];
    }

    // Check if user has any relevant taste preferences
    const tastePreferences = userPrefs.tastePreferences;
    let tastePrefsString = '';
    
    // Handle different data types for taste preferences
    if (typeof tastePreferences === 'string') {
      tastePrefsString = tastePreferences.toLowerCase();
    } else if (Array.isArray(tastePreferences)) {
      tastePrefsString = tastePreferences.join(',').toLowerCase();
    } else if (tastePreferences && typeof tastePreferences === 'object') {
      tastePrefsString = Object.values(tastePreferences).join(',').toLowerCase();
    } else {
      tastePrefsString = '';
    }
    
    const hasMovieTaste = tastePrefsString.includes('movie');
    const hasTravelTaste = tastePrefsString.includes('travel');
    const hasDiningTaste = tastePrefsString.includes('dining');
    const hasBookTaste = tastePrefsString.includes('book');

    log(`User ${user.$id} taste preferences analysis:`);
    log(`  Raw taste preferences: ${JSON.stringify(tastePreferences)}`);
    log(`  Processed taste string: ${tastePrefsString}`);
    log(`  Movie: ${hasMovieTaste ? 'YES' : 'NO'}`);
    log(`  Travel: ${hasTravelTaste ? 'YES' : 'NO'}`);
    log(`  Dining: ${hasDiningTaste ? 'YES' : 'NO'}`);
    log(`  Book: ${hasBookTaste ? 'YES' : 'NO'}`);

    // If no relevant taste preferences found, skip this user
    if (!hasMovieTaste && !hasTravelTaste && !hasDiningTaste && !hasBookTaste) {
      log(`User ${user.$id} has no relevant taste preferences (movie, travel, dining, book), skipping...`);
      return [];
    }

    // Check for booking emails in the last 2 months (limited to 5 emails)
    const newBookings = await checkForNewBookings(userPrefs.gmailRefreshToken, tastePrefsString, log);
    
    if (newBookings.length > 0) {
      log(`Found ${newBookings.length} booking(s) for user ${user.$id}`);
      
      // Log the extracted booking details
      log(`=== EXTRACTED BOOKING DETAILS FOR USER ${user.$id} ===`);
      newBookings.forEach((booking, index) => {
        log(`Booking ${index + 1}:`);
        log(`  Subject: ${booking.subject}`);
        log(`  From: ${booking.from}`);
        log(`  Date: ${booking.date}`);
        log(`  Type: ${booking.type.toUpperCase()}`);
        
        // Log details based on booking type
        if (booking.type === 'movie') {
          if (booking.bookingDetails.movie) {
            log(`  Movie: ${booking.bookingDetails.movie}`);
          }
          if (booking.bookingDetails.dateTime) {
            log(`  Date & Time: ${booking.bookingDetails.dateTime}`);
          }
          if (booking.bookingDetails.theatre) {
            log(`  Theatre: ${booking.bookingDetails.theatre}`);
          }
        } else if (booking.type === 'travel') {
          if (booking.bookingDetails.travelType) {
            log(`  Travel Type: ${booking.bookingDetails.travelType}`);
          }
          if (booking.bookingDetails.from) {
            log(`  From: ${booking.bookingDetails.from}`);
          }
          if (booking.bookingDetails.to) {
            log(`  To: ${booking.bookingDetails.to}`);
          }
          if (booking.bookingDetails.departure) {
            log(`  Departure: ${booking.bookingDetails.departure}`);
          }
          if (booking.bookingDetails.arrival) {
            log(`  Arrival: ${booking.bookingDetails.arrival}`);
          }
          if (booking.bookingDetails.pnr) {
            log(`  PNR: ${booking.bookingDetails.pnr}`);
          }
          if (booking.bookingDetails.bookingId) {
            log(`  Booking ID: ${booking.bookingDetails.bookingId}`);
          }
        } else if (booking.type === 'dining') {
          if (booking.bookingDetails.restaurant) {
            log(`  Restaurant: ${booking.bookingDetails.restaurant}`);
          }
          if (booking.bookingDetails.dateTime) {
            log(`  Date & Time: ${booking.bookingDetails.dateTime}`);
          }
          if (booking.bookingDetails.guests) {
            log(`  Guests: ${booking.bookingDetails.guests}`);
          }
          if (booking.bookingDetails.reservationId) {
            log(`  Reservation ID: ${booking.bookingDetails.reservationId}`);
          }
        } else if (booking.type === 'book') {
          if (booking.bookingDetails.title) {
            log(`  Title: ${booking.bookingDetails.title}`);
          }
          if (booking.bookingDetails.author) {
            log(`  Author: ${booking.bookingDetails.author}`);
          }
          if (booking.bookingDetails.orderId) {
            log(`  Order ID: ${booking.bookingDetails.orderId}`);
          }
          if (booking.bookingDetails.price) {
            log(`  Price: ${booking.bookingDetails.price}`);
          }
        }
        log(`  ---`);
      });
      log(`=== END BOOKING DETAILS ===`);
      
      return newBookings;
    } else {
      log(`No bookings found for user ${user.$id}`);
      return [];
    }

  } catch (err) {
    error(`Error processing bookings for user ${user.$id}: ${err.message}`);
    return [];
  }
}

async function getUserPreferences(userId, users, log) {
  try {
    // Get user preferences from Appwrite's built-in user preferences
    const user = await users.get(userId);
    
    // Debug: Log the user preferences structure
    log(`User ${userId} preferences:`, JSON.stringify(user.prefs, null, 2));
    
    // Check if user has preferences - preferences are stored directly in user.prefs
    if (user.prefs && Object.keys(user.prefs).length > 0) {
      log(`User ${userId} has preferences data:`, JSON.stringify(user.prefs, null, 2));
      
      const gmailToken = user.prefs.gmailRefreshToken;
      const tastePreferences = user.prefs.taste || '';
      log(`User ${userId} Gmail token found:`, gmailToken ? 'YES' : 'NO');
      log(`User ${userId} taste preferences:`, tastePreferences);
      
      return {
        gmailRefreshToken: gmailToken || null,
        lastCheckTime: user.prefs.lastEmailCheckTime || new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
        isActive: user.prefs.isActive !== false, // Default to true if not set
        tastePreferences: tastePreferences
      };
    } else {
      log(`User ${userId} has no preferences`);
    }
    
    // Return default values if no preferences found
    return {
      gmailRefreshToken: null,
      lastCheckTime: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
      isActive: true,
      tastePreferences: ''
    };
    
  } catch (err) {
    log(`Error getting user preferences for ${userId}: ${err.message}`);
    return {
      gmailRefreshToken: null,
      lastCheckTime: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
      isActive: true,
      tastePreferences: ''
    };
  }
}

async function checkForNewBookings(refreshToken, tastePreferences, log) {
  try {
    log(`Setting up Gmail OAuth client with refresh token: ${refreshToken.substring(0, 20)}...`);
    
    // Setup Gmail OAuth client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    log(`OAuth client created with CLIENT_ID: ${process.env.GOOGLE_CLIENT_ID ? 'SET' : 'NOT SET'}`);
    log(`OAuth client created with CLIENT_SECRET: ${process.env.GOOGLE_CLIENT_SECRET ? 'SET' : 'NOT SET'}`);
    log(`OAuth client created with REDIRECT_URI: ${process.env.GOOGLE_REDIRECT_URI || 'NOT SET'}`);

    oauth2Client.setCredentials({
      refresh_token: refreshToken
    });

    log('OAuth credentials set, creating Gmail client...');
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Calculate time range (last 2 months)
    const twoMonthsAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000); // 60 days ago
    const afterDate = twoMonthsAgo.toISOString().split('T')[0]; // YYYY-MM-DD format

    // Build dynamic search query based on user's taste preferences
    const searchTerms = [];

    // Add search terms based on user's taste preferences
    if (tastePreferences.includes('movie')) {
      searchTerms.push('Showtime!', '"movie ticket"');
    }
    
    if (tastePreferences.includes('travel')) {
      searchTerms.push('"Booking Confirmation on IRCTC"', '"e-ticket"', '"eticket"', '"flight booking"', '"hotel booking"', '"travel booking"');
    }
    
    if (tastePreferences.includes('dining')) {
      searchTerms.push('"restaurant booking"', '"dining reservation"', '"table reservation"');
    }
    
    if (tastePreferences.includes('book')) {
      searchTerms.push('"book confirmation"');
    }

    // Add general booking confirmation term if any taste preferences exist
    // if (searchTerms.length > 0) {
    //   searchTerms.push('"booking confirmation"');
    // }

    // If no taste preferences match, return empty array
    if (searchTerms.length === 0) {
      log('No relevant taste preferences found, skipping Gmail search');
      return [];
    }

    // Build the search query
    const searchQuery = `subject:(${searchTerms.join(' OR ')}) after:${afterDate}`;
    
    log(`User taste preferences: ${tastePreferences}`);
    log(`Search terms included: ${searchTerms.join(', ')}`);
    log(`Searching Gmail with query: ${searchQuery}`);
    
    const response = await gmail.users.messages.list({
      userId: 'me',
      q: searchQuery,
      maxResults: 5 // Limit to 5 emails
    });

    if (!response.data.messages || response.data.messages.length === 0) {
      log('No messages found in Gmail response');
      return [];
    }

    log(`Found ${response.data.messages.length} messages in Gmail`);

    // Get full message details for each email
    const bookingEmails = [];
    const allEmails = []; // For debugging
    
    for (const message of response.data.messages) {
      try {
        const messageDetail = await gmail.users.messages.get({
          userId: 'me',
          id: message.id,
          format: 'full'
        });

        const email = messageDetail.data;
        const headers = email.payload.headers;
        
        const subject = headers.find(h => h.name === 'Subject')?.value || 'No Subject';
        const from = headers.find(h => h.name === 'From')?.value || 'Unknown';
        const date = headers.find(h => h.name === 'Date')?.value || new Date().toISOString();
        
        // Debug: Log all email subjects found
        allEmails.push({ subject, from, date });
        
        // Extract email body
        let body = '';
        if (email.payload.body?.data) {
          body = Buffer.from(email.payload.body.data, 'base64').toString('utf-8');
        } else if (email.payload.parts) {
          const textPart = email.payload.parts.find(part => part.mimeType === 'text/plain');
          if (textPart?.body?.data) {
            body = Buffer.from(textPart.body.data, 'base64').toString('utf-8');
          }
        }

        // Clean HTML content if present
        let cleanContent = body;
        if (body.includes('<') && body.includes('>')) {
          cleanContent = body
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<\/p>/gi, '\n')
            .replace(/<p[^>]*>/gi, '')
            .replace(/<[^>]*>/g, '')
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/\n\s*\n/g, '\n\n')
            .trim();
        }

        // Extract booking details
        const bookingDetails = extractBookingDetails(cleanContent, subject);
        
        if (!bookingDetails.error) {
          bookingEmails.push({
            id: email.id,
            subject,
            from,
            date,
            bookingDetails,
            type: bookingDetails.type || 'unknown'
          });
        }

      } catch (messageError) {
        log(`Error processing message ${message.id}: ${messageError.message}`);
        continue;
      }
    }

    // Debug: Log all email subjects found
    log(`=== ALL EMAILS FOUND (${allEmails.length}) ===`);
    allEmails.forEach((email, index) => {
      log(`${index + 1}. Subject: "${email.subject}" | From: ${email.from}`);
    });
    log(`=== END ALL EMAILS ===`);
    
    log(`=== BOOKING EMAILS EXTRACTED (${bookingEmails.length}) ===`);
    bookingEmails.forEach((email, index) => {
      log(`${index + 1}. Subject: "${email.subject}" | Type: ${email.type}`);
    });
    log(`=== END BOOKING EMAILS ===`);

    return bookingEmails;

  } catch (err) {
    log(`Error checking Gmail: ${err.message}`);
    log(`Error details: ${JSON.stringify(err, null, 2)}`);
    
    // Check if it's a token refresh error
    if (err.message.includes('invalid_request') || err.message.includes('invalid_grant')) {
      log('This appears to be a token refresh error. The refresh token may be expired or invalid.');
    }
    
    return [];
  }
}

function extractBookingDetails(emailContent, subject = "") {
  const lowerContent = emailContent.toLowerCase();
  const lowerSubject = subject.toLowerCase();

  // Detect booking types
  const isMovie = lowerContent.includes("booking confirmed") && lowerContent.includes("screen");
  const isTravel = 
    lowerContent.includes("electronic reservation slip") ||
    lowerContent.includes("pnr") ||
    lowerSubject.includes("e-ticket") && (lowerSubject.includes("pnr") || lowerSubject.includes("booking id")) ||
    lowerContent.includes("flight") ||
    lowerContent.includes("hotel") ||
    lowerContent.includes("travel booking");
  const isDining = 
    lowerContent.includes("restaurant") ||
    lowerContent.includes("dining") ||
    lowerContent.includes("table reservation") ||
    lowerContent.includes("reservation confirmed") && (lowerContent.includes("restaurant") || lowerContent.includes("dining"));
  const isBook = 
    lowerContent.includes("book") && lowerContent.includes("order") ||
    lowerContent.includes("book") && lowerContent.includes("confirmation") ||
    lowerSubject.includes("book") && lowerSubject.includes("confirmation");

  if (isMovie) {
    // Movie details extraction (same as before)
    const result = { type: 'movie' };
    const movieMatch = emailContent.match(/Order ID\s*:\s*\d+\s+([^(]+?)\s*\(UA16\+\)/i);
    if (movieMatch) {
      result.movie = movieMatch[1].trim();
    } else {
      const fallbackMatch = emailContent.match(/tickets for ([^:]+): ([^a]+) are confirmed/i);
      if (fallbackMatch) {
        result.movie = `${fallbackMatch[1].trim()}: ${fallbackMatch[2].trim()}`;
      } else {
        const secondFallback = emailContent.match(/for ([^a]+?) are confirmed/i);
        result.movie = secondFallback ? secondFallback[1].trim() : null;
      }
    }
    const dateTimeMatch = emailContent.match(/Date & Time\s+([A-Za-z0-9 ,|:]+)/);
    result.dateTime = dateTimeMatch ? dateTimeMatch[1].trim() : null;
    let theatreMatch = emailContent.match(/Theatre\s+([^\n]+)/i);
    if (!theatreMatch) {
      theatreMatch = emailContent.match(/Theatre\s*:? s*(.+?)(?:\n|$)/i);
    }
    if (!theatreMatch) {
      theatreMatch = emailContent.match(/Venue\s*:? s*(.+?)(?:\n|$)/i);
    }
    if (!theatreMatch) {
      theatreMatch = emailContent.match(/Location\s*:? s*(.+?)(?:\n|$)/i);
    }
    if (!theatreMatch) {
      theatreMatch = emailContent.match(/at\s+([A-Za-z0-9\s,()-]+(?:formerly\s+[A-Za-z\s]+)?)/i);
    }
    result.theatre = theatreMatch ? theatreMatch[1].trim() : null;
    return result;
  } else if (isTravel) {
    // Travel details extraction (changed from Train to Travel - includes flights, hotels, trains)
    const result = { type: 'travel' };
    // PNR extraction
    let pnrMatch = emailContent.match(/PNR\s*:?\s*([A-Z0-9]+)/i);
    if (!pnrMatch) {
      pnrMatch = subject.match(/PNR\s*:?\s*([A-Z0-9]+)/i);
    }
    result.pnr = pnrMatch ? pnrMatch[1].trim() : null;
    // Booking ID extraction
    let bookingIdMatch = emailContent.match(/booking id\s*-?\s*([A-Z0-9]+)/i);
    if (!bookingIdMatch) {
      bookingIdMatch = subject.match(/booking id\s*-?\s*([A-Z0-9]+)/i);
    }
    result.bookingId = bookingIdMatch ? bookingIdMatch[1].trim() : null;
    // From/To extraction
    let fromMatch = emailContent.match(/(?:From|Boarding Station|Departure)\s*:?\s*([A-Za-z\s()]+)\s*(?:To|\()/i);
    if (!fromMatch) {
      fromMatch = subject.match(/\(([^-]+)-/);
    }
    result.from = fromMatch ? fromMatch[1].trim() : null;
    let toMatch = emailContent.match(/To\s*:?\s*([A-Za-z\s()]+)/i);
    if (!toMatch) {
      toMatch = subject.match(/-([A-Za-z]+)\)/);
    }
    result.to = toMatch ? toMatch[1].trim() : null;
    // Departure/Arrival (optional, fallback to null)
    const departureMatch = emailContent.match(/Departure\*?\s*:?\s*([0-9:]+ \d+ \w+ \d{4})/);
    result.departure = departureMatch ? departureMatch[1].trim() : null;
    const arrivalMatch = emailContent.match(/Arrival\*?\s*:?\s*([0-9:]+ \d+ \w+ \d{4})/);
    result.arrival = arrivalMatch ? arrivalMatch[1].trim() : null;
    // Travel type detection
    if (lowerContent.includes("flight")) {
      result.travelType = "flight";
    } else if (lowerContent.includes("hotel")) {
      result.travelType = "hotel";
    } else if (lowerContent.includes("train")) {
      result.travelType = "train";
    } else {
      result.travelType = "travel";
    }
    return result;
  } else if (isDining) {
    // Dining details extraction
    const result = { type: 'dining' };
    // Restaurant name extraction
    let restaurantMatch = emailContent.match(/restaurant\s*:?\s*([^\n]+)/i);
    if (!restaurantMatch) {
      restaurantMatch = emailContent.match(/at\s+([A-Za-z0-9\s&'-]+(?:restaurant|dining|bistro|cafe))/i);
    }
    if (!restaurantMatch) {
      restaurantMatch = emailContent.match(/([A-Za-z0-9\s&'-]+(?:restaurant|dining|bistro|cafe))/i);
    }
    result.restaurant = restaurantMatch ? restaurantMatch[1].trim() : null;
    // Date and time extraction
    const dateTimeMatch = emailContent.match(/(?:date|time|when)\s*:?\s*([A-Za-z0-9 ,|:]+)/i);
    result.dateTime = dateTimeMatch ? dateTimeMatch[1].trim() : null;
    // Number of people
    const peopleMatch = emailContent.match(/(?:for|guests|people)\s*:?\s*(\d+)/i);
    result.guests = peopleMatch ? peopleMatch[1].trim() : null;
    // Reservation ID
    const reservationMatch = emailContent.match(/(?:reservation|booking)\s*(?:id|number)\s*:?\s*([A-Z0-9]+)/i);
    result.reservationId = reservationMatch ? reservationMatch[1].trim() : null;
    return result;
  } else if (isBook) {
    // Book details extraction
    const result = { type: 'book' };
    // Book title extraction
    let titleMatch = emailContent.match(/book\s*:?\s*([^\n]+)/i);
    if (!titleMatch) {
      titleMatch = emailContent.match(/title\s*:?\s*([^\n]+)/i);
    }
    if (!titleMatch) {
      titleMatch = emailContent.match(/order\s+for\s+([^\n]+)/i);
    }
    result.title = titleMatch ? titleMatch[1].trim() : null;
    // Author extraction
    const authorMatch = emailContent.match(/author\s*:?\s*([^\n]+)/i);
    result.author = authorMatch ? authorMatch[1].trim() : null;
    // Order ID
    const orderMatch = emailContent.match(/order\s*(?:id|number)\s*:?\s*([A-Z0-9]+)/i);
    result.orderId = orderMatch ? orderMatch[1].trim() : null;
    // Price
    const priceMatch = emailContent.match(/price\s*:?\s*([^\n]+)/i);
    result.price = priceMatch ? priceMatch[1].trim() : null;
    return result;
  }
  // Unknown format
  return { error: "Unsupported email format." };
}

