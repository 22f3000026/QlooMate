# Booking Email Monitor - Appwrite Function

This Appwrite function monitors Gmail for new booking emails and returns the extracted booking details.

## 🚀 Features

- **Manual Execution**: Can be triggered manually or via API calls
- **Multi-User Support**: Processes all users in your Appwrite project
- **Gmail Integration**: Uses Gmail API to search for booking emails
- **Smart Extraction**: Extracts booking details from movie and train emails
- **Limited Results**: Returns maximum 5 emails per user
- **Notification History**: Stores all found bookings in database

## 📋 Prerequisites

1. **Appwrite Project** with Functions enabled
2. **Google Cloud Project** with Gmail API enabled
3. **Database Collections** for user preferences and notification history

## 🛠️ Setup Instructions

### 1. Create Database Collections

#### User Preferences Collection (`user_preferences`)
```json
{
  "userId": "string",
  "gmailRefreshToken": "string",
  "lastEmailCheckTime": "datetime",
  "isActive": "boolean"
}
```

#### Notification History Collection (`notification_history`)
```json
{
  "userId": "string",
  "bookings": "string", // JSON stringified booking data
  "sentAt": "datetime",
  "notificationType": "string",
  "status": "string"
}
```

### 2. Environment Variables

Set these environment variables in your Appwrite function:

```bash
# Appwrite Configuration
APPWRITE_FUNCTION_API_ENDPOINT=https://cloud.appwrite.io/v1
APPWRITE_FUNCTION_PROJECT_ID=your_project_id

# Database Configuration
DATABASE_ID=your_database_id
USER_PREFERENCES_COLLECTION_ID=user_preferences
NOTIFICATION_HISTORY_COLLECTION_ID=notification_history

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=your_redirect_uri
```

### 3. Deploy the Function

1. **Create Function in Appwrite Console**
   - Go to Functions in your Appwrite console
   - Create a new function named "booking-email-monitor"
   - Set runtime to Node.js 18+

2. **Upload Function Code**
   - Upload the `index.js` file
   - Upload the `package.json` file

3. **Set Environment Variables**
   - Add all the environment variables listed above

4. **Set Function Permissions**
   - Enable "Users" permission
   - Enable "Databases" permission

### 4. User Setup

Users need to:

1. **Connect Gmail**: Provide Gmail refresh token
2. **Enable Monitoring**: Set `isActive` to true in user preferences

## 📧 Email Detection

The function searches for emails with these subjects:
- `subject:(Showtime! OR e-ticket OR "booking confirmed")`

### Supported Email Types

#### Movie Bookings
- **Detection**: Contains "booking confirmed" and "screen"
- **Extracted Data**:
  - Movie name (after Order ID, before UA16+)
  - Date & Time
  - Theatre/Venue

#### Train Reservations
- **Detection**: Contains "electronic reservation slip" or "pnr"
- **Extracted Data**:
  - From station
  - To station
  - Departure time
  - Arrival time

## 📤 Function Response Format

The function returns a JSON response with booking details:

```json
{
  "success": true,
  "message": "Processed 5 users",
  "totalBookingsFound": 3,
  "userBookings": [
    {
      "userId": "user123",
      "userEmail": "user@example.com",
      "bookings": [
        {
          "id": "email123",
          "subject": "It's Showtime! 🎬 Your movie tickets for Maa are confirmed",
          "from": "District",
          "date": "2025-06-30T19:37:00.000Z",
          "bookingDetails": {
            "movie": "Maa",
            "dateTime": "Mon, 30 June 2025 | 10:00 PM",
            "theatre": "INOX Phoenix Market City (formerly Jazz Cinemas), Velachery, Chennai"
          },
          "type": "movie"
        }
      ]
    }
  ],
  "timestamp": "2025-06-30T19:42:00.000Z"
}
```

## 🔧 Customization

### Modify Search Keywords
Edit the `searchQuery` in `checkForNewBookings()` function:

```javascript
const searchQuery = `subject:(Showtime! OR e-ticket OR "booking confirmed") after:${afterDate}`;
```

### Change Email Limit
Modify the `maxResults` parameter in the Gmail API call:

```javascript
maxResults: 5 // Change this number to limit results
```

### Add New Email Types
Extend the `extractBookingDetails()` function to support new email formats.

## 📊 Monitoring & Logs

The function provides detailed logs:
- User processing status
- Gmail search results
- Booking extraction status
- Error handling

View logs in Appwrite Console > Functions > Your Function > Logs

## 🚨 Error Handling

The function handles:
- Missing user preferences
- Invalid Gmail tokens
- Database errors
- Individual user failures (continues with next user)

## 🔒 Security Considerations

1. **Token Storage**: Gmail refresh tokens stored securely in database
2. **API Keys**: All sensitive keys stored as environment variables
3. **User Isolation**: Each user's emails processed separately
4. **Error Logging**: No sensitive data in error logs

## 📈 Performance

- **Efficient Processing**: Only checks last 5 minutes of emails
- **Batch Processing**: Processes all users in single function execution
- **Rate Limiting**: Respects Gmail API rate limits
- **Memory Management**: Processes emails one by one to avoid memory issues
- **Result Limiting**: Maximum 5 emails per user to prevent overload

## 🆘 Troubleshooting

### Common Issues

1. **"Missing Gmail token"**: User needs to connect Gmail account
2. **"Database permission denied"**: Verify function permissions
3. **"No emails found"**: Check Gmail search query and user's email

### Debug Steps

1. Check function logs in Appwrite console
2. Verify environment variables
3. Test Gmail API access manually
4. Check database collection permissions

## 📞 Support

For issues or questions:
1. Check Appwrite function logs
2. Verify all environment variables
3. Test Gmail API access manually
4. Review database permissions and structure 