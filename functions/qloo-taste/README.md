# Qloo Taste Function

This Appwrite function processes user inspiration text and extracts personalized insights using Qloo's AI-powered recommendation APIs.

## Overview

The Qloo Taste function implements a 5-step workflow to transform user inspiration into actionable insights:

1. **LLM Analysis**: Extracts entity type, filters, signals, and output from user enquiry
2. **Entity & Tag Search**: Retrieves IDs using Qloo's Entity Search and Tag Search APIs
3. **Data Combination**: Combines analysis output with retrieved IDs
4. **Parameter Mapping**: Maps combined data to Insights API parameters
5. **Insights Generation**: Calls Qloo's Insights API to generate personalized recommendations

## Supported Entity Types

The function supports the following Qloo entity types (confirmed from `qloo/params/entity` folder):
- `urn:entity:artist` - Music artists and performers
- `urn:entity:book` - Books and literature  
- `urn:entity:brand` - Brands and companies
- `urn:entity:destination` - Travel destinations (does not support trending requests)
- `urn:entity:movie` - Movies and films
- `urn:entity:person` - People and personalities
- `urn:entity:place` - Places and locations (does not support trending requests)
- `urn:entity:podcast` - Podcasts and audio content
- `urn:entity:tv_show` - TV shows and series
- `urn:entity:videogame` - Video games

**Note**: Destination and place entities do not support trending requests, so the function automatically sets `biasTrends` to `off` for these entity types.

## Workflow

### Step 1: LLM Analysis
- Uses OpenAI GPT-3.5-turbo to analyze user inspiration
- Extracts structured information including:
  - Entity type (urn:entity:artist, urn:entity:book, urn:entity:brand, urn:entity:destination, urn:entity:movie, urn:entity:person, urn:entity:place, urn:entity:podcast, urn:entity:tv_show, urn:entity:videogame)
  - Keywords and categories
  - Attributes (year, country, genre, location, etc.)
  - Interest signals (tags, audiences)
  - Location signals (query, radius)
  - Trends bias (with validation for unsupported entity types)
  - User intent and description

### Step 2: Entity & Tag Search
- Searches Qloo's Entity Search API using extracted keywords
- Searches Qloo's Tag Search API for relevant tags
- Searches Qloo's Audiences API for demographic signals
- Uses predefined tag mappings for common genres
- Limits searches to prevent API rate limiting
- Returns entity IDs, tag IDs, and audience IDs for further processing

### Step 3: Data Combination
- Combines LLM analysis with retrieved entity, tag, and audience IDs
- Replaces keyword references with actual Qloo IDs
- Creates a unified data structure for API parameter mapping
- Handles location and trends data

### Step 4: Parameter Mapping
- Maps combined data to Qloo Insights API parameters
- Handles different entity types and their specific filter requirements
- Configures signals for personalized recommendations
- Supports location-based filtering and trends bias
- Maps audience demographics and tag interests

### Step 5: Insights Generation
- Calls Qloo's Insights API with mapped parameters
- Returns personalized recommendations based on user inspiration
- Handles API errors and response formatting

## API Endpoints Used

- **Qloo Search API**: `https://hackathon.api.qloo.com/search`
- **Qloo Insights API**: `https://hackathon.api.qloo.com/v2/insights/`
- **Qloo Audiences API**: `https://hackathon.api.qloo.com/v2/audiences`
- **Qloo Tags API**: `https://hackathon.api.qloo.com/v2/tags`
- **OpenAI API**: `https://api.openai.com/v1/chat/completions`

## Environment Variables

Required environment variables:

- `QLOO_API_KEY`: Your Qloo API key for accessing Qloo services
- `OPENAI_API_KEY`: Your OpenAI API key for LLM analysis
- `APPWRITE_FUNCTION_API_ENDPOINT`: Appwrite function API endpoint
- `APPWRITE_FUNCTION_PROJECT_ID`: Your Appwrite project ID
- `APPWRITE_FUNCTION_KEY`: Your Appwrite function key (passed via headers)

## Request Format

```json
{
  "inspiration": "I want to discover movies similar to Inception with mind-bending plots"
}
```

## Response Format

```json
{
  "success": true,
  "inspiration": "I want to discover movies similar to Inception with mind-bending plots",
  "analysis": {
    "entityType": "movie",
    "filters": {
      "keywords": ["inception", "mind-bending", "plots"],
      "categories": ["sci-fi", "thriller"],
      "attributes": {
        "genre": "sci-fi thriller"
      }
    },
    "signals": {
      "interests": ["complex narratives", "psychological thrillers"],
      "preferences": ["mind-bending plots"]
    },
    "output": {
      "description": "Movies with complex, mind-bending narratives",
      "intent": "discover similar"
    }
  },
  "entityAndTagIds": {
    "entities": [...],
    "tags": [...]
  },
  "combinedData": {
    "entityIds": ["entity_id_1", "entity_id_2"],
    "tagIds": ["tag_id_1", "tag_id_2"],
    "entities": [...],
    "tags": [...]
  },
  "insightsParams": {
    "filter": {
      "type": "urn:entity:movie"
    },
    "signal": {
      "interests": {
        "tags": ["tag_id_1", "tag_id_2"]
      },
      "entities": ["entity_id_1", "entity_id_2"]
    },
    "sort_by": "affinity",
    "limit": 20
  },
  "insights": {
    "results": [...]
  }
}
```

## Error Handling

The function includes comprehensive error handling:

- Request body validation
- LLM analysis error handling
- API call error handling
- Response parsing error handling
- Graceful fallbacks for failed steps

## Rate Limiting

The function implements rate limiting measures:

- Limits keyword searches to 3 keywords per request
- Limits entity results to 2 per keyword
- Limits tag results to 2 per keyword
- Limits audience results to 2 per keyword
- Limits tag signals to 5 tags
- Limits entity signals to 3 entities
- Limits audience signals to 3 audiences

## Usage Examples

### Movie Discovery
```json
{
  "inspiration": "I love Christopher Nolan movies, especially those with complex time travel"
}
```

### Place Discovery
```json
{
  "inspiration": "I want to find restaurants in Paris that serve authentic French cuisine"
}
```

### Artist Discovery
```json
{
  "inspiration": "I'm looking for indie rock bands similar to Arctic Monkeys"
}
```

### Trending Destinations
```json
{
  "inspiration": "Show me trending tourist destinations around the world"
}
```

### Location-Based Recommendations
```json
{
  "inspiration": "Find popular attractions near Chennai, India within 10km"
}
```

## Dependencies

- `node-appwrite`: Appwrite SDK for server-side operations
- `node-fetch`: HTTP client for API calls

## Deployment

1. Install dependencies: `npm install`
2. Set up environment variables in Appwrite
3. Deploy the function to your Appwrite project
4. Configure function triggers as needed

## Testing

Test the function with various inspiration texts to ensure proper handling of different entity types and edge cases.

## Recent Fixes

### Qloo API Parameter Structure
- **Fixed parameter mapping** to use correct Qloo API parameter names based on TypeScript definitions
- **Updated from nested structure** to flat parameter structure (e.g., `signal.interests.tags` → `signalInterestsTags`)
- **Fixed filter parameters** to use correct naming (e.g., `filter.type` → `filterType`)

### Trending Requests
- **Fixed unsupported entity types** for trending requests (destination, place, location)
- **Added entity type validation** to skip `biasTrends` for unsupported entities
- **Updated trends mapping** to use only valid values: `low`, `medium`, `high`

### Radius Validation
- **Fixed radius validation** to ensure values are within 0-800000 range
- **Added default radius** of 50000 meters when invalid or missing
- **Enhanced error logging** for radius-related issues

### Parameter Mapping
- **Updated signal parameters** to use correct Qloo API structure
- **Fixed location parameters** to use `signalLocationQuery` and `signalLocationRadius`
- **Fixed audience parameters** to use `signalDemographicsAudiences`
- **Fixed entity parameters** to use `signalInterestsEntities`
- **Fixed tag parameters** to use `signalInterestsTags` with comma-separated values 