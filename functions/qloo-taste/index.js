import fetch from 'node-fetch';
import { Client, Users } from 'node-appwrite';

// This Appwrite function will be executed every time your function is triggered
export default async ({ req, res, log, error }) => {
  // You can use the Appwrite SDK to interact with other services
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(req.headers['x-appwrite-key'] ?? '');
  const users = new Users(client);

  const startTime = Date.now();
  try {
    log('=== QLOO TASTE FUNCTION TRIGGERED ===');
    log(`Timestamp: ${new Date().toISOString()}`);
    log(`Request method: ${req.method}`);
    log(`Request path: ${req.path}`);
    
    // Parse request body
    let requestData = null;
    try {
      if (req.body) {
        requestData = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        log('Request body parsed successfully');
      } else {
        log('No request body found');
      }
    } catch (parseError) {
      error('Error parsing request body:', parseError.message);
      log('Request body parsing failed');
      return res.json({ success: false, message: 'Invalid request body' }, 400);
    }

    if (!requestData || !requestData.inspiration) {
      log('No inspiration text provided in request');
      return res.json({ success: false, message: 'No inspiration text provided' }, 400);
    }

    const { inspiration } = requestData;
    log(`Processing inspiration: "${inspiration}"`);
    log(`Inspiration length: ${inspiration.length} characters`);

    // Step 1: LLM extracts entity type, filters, signals and output from user enquiry
    log('=== STARTING STEP 1: LLM Analysis ===');
    const llmAnalysis = await analyzeInspirationWithLLM(inspiration, log, error);
    if (!llmAnalysis.success) {
      log('Step 1 failed: LLM analysis unsuccessful');
      return res.json({ success: false, message: 'Failed to analyze inspiration' }, 500);
    }

    log('=== STEP 1 COMPLETED: LLM Analysis ===');
    log(`Entity type detected: ${llmAnalysis.data.entityType}`);
    log(`Keywords extracted: ${llmAnalysis.data.filters?.keywords?.length || 0}`);
    log(`Categories extracted: ${llmAnalysis.data.filters?.categories?.length || 0}`);
    log(JSON.stringify(llmAnalysis.data, null, 2));

    // Step 2: Extract keywords and get IDs using Qloo's Entity Search and Tag Search APIs
    log('=== STARTING STEP 2: Entity and Tag Search ===');
    const entityAndTagIds = await extractEntityAndTagIds(llmAnalysis.data, log, error);
    if (!entityAndTagIds.success) {
      log('Step 2 failed: Entity and tag extraction unsuccessful');
      return res.json({ success: false, message: 'Failed to extract entity and tag IDs' }, 500);
    }

    log('=== STEP 2 COMPLETED: Entity and Tag IDs ===');
    log(`Entities found: ${entityAndTagIds.data.entities.length}`);
    log(`Tags found: ${entityAndTagIds.data.tags.length}`);
    log(`Audiences found: ${entityAndTagIds.data.audiences.length}`);
    // log(JSON.stringify(entityAndTagIds.data, null, 2));

    // Step 3: Combine IDs with analysis output, replacing keywords with IDs
    log('=== STARTING STEP 3: Data Combination ===');
    const combinedData = combineAnalysisWithIds(llmAnalysis.data, entityAndTagIds.data, log);
    
    log('=== STEP 3 COMPLETED: Combined Data ===');
    log(`Combined entity IDs: ${combinedData.entityIds?.length || 0}`);
    log(`Combined tag IDs: ${combinedData.tagIds?.length || 0}`);
    log(`Combined audience IDs: ${combinedData.audienceIds?.length || 0}`);
    //log(JSON.stringify(combinedData, null, 2));

    // Step 4: Map to real parameters of Insights API
    log('=== STARTING STEP 4: Parameter Mapping ===');
    const insightsParams = mapToInsightsApiParams(combinedData, log);
    
    log('=== STEP 4 COMPLETED: Insights API Parameters ===');
    log(`Filter type: ${insightsParams["filter.type"]}`);
    log(`Total parameters: ${Object.keys(insightsParams).length}`);
    log(`Parameters: ${Object.keys(insightsParams).join(', ')}`);
//log(JSON.stringify(insightsParams, null, 2));

    // Step 5: Call Insights API using the parameters
    log('=== STARTING STEP 5: Insights API Call ===');
    const insightsResults = await callInsightsApi(insightsParams, log, error);
    if (!insightsResults.success) {
      log('Step 5 failed: Insights API call unsuccessful');
      return res.json({ success: false, message: 'Failed to fetch insights' }, 500);
    }

         log('=== STEP 5 COMPLETED: Insights API Results ===');
     log(`Insights results count: ${insightsResults.data?.results?.entities?.length || 0}`);
     log(`Total results available: ${insightsResults.data?.total || 0}`);
     //log(JSON.stringify(insightsResults.data, null, 2));

    log('=== FUNCTION EXECUTION COMPLETED SUCCESSFULLY ===');
    log(`Total execution time: ${Date.now() - startTime}ms`);
    
    // Extract simplified results from insights API response
    const simplifiedResults = [];
    if (insightsResults.data && insightsResults.data.results && insightsResults.data.results.entities) {
      insightsResults.data.results.entities.forEach(entity => {
        const result = {
          name: entity.name,
          description: entity.properties?.description || 'No description available'
        };
        
        // Add address if available
        if (entity.properties?.address && entity.properties.address.trim() !== '') {
          result.address = entity.properties.address;
        }
        
        simplifiedResults.push(result);
      });
    }
    
    log(`Simplified ${simplifiedResults.length} results for response`);
    if (simplifiedResults.length > 0) {
      log(`Sample simplified result: ${JSON.stringify(simplifiedResults[0])}`);
    }

    return res.json({
      success: true,
      results: simplifiedResults
    });

  } catch (err) {
    log('=== FUNCTION EXECUTION FAILED ===');
    log(`Error occurred at: ${new Date().toISOString()}`);
    log(`Error message: ${err.message}`);
    log(`Error stack: ${err.stack}`);
    error('Qloo Taste function execution failed: ' + err.message);
    return res.json({ success: false, error: err.message }, 500);
  }
};

// Step 1: LLM extracts entity type, filters, signals and output from user enquiry
async function analyzeInspirationWithLLM(inspiration, log, error) {
  const stepStartTime = Date.now();
  try {
    log('Starting LLM analysis with OpenAI...');
    const prompt = `Analyze the following user inspiration and extract structured information for Qloo API:

User Inspiration: "${inspiration}"

Please extract and return a JSON object with the following structure:
{
  "entityType": "The type of entity (must be one of the exact Qloo entity types listed below)",
  "filters": {
    "keywords": ["list", "of", "relevant", "keywords"],
    "categories": ["list", "of", "categories"],
    "attributes": {
      "year": "specific year if mentioned",
      "country": "specific country if mentioned",
      "genre": "specific genre if mentioned",
      "location": "specific location if mentioned"
    }
  },
       "signals": {
       "interests": {
         "tags": ["list", "of", "genre", "style", "or", "category", "keywords", "like", "action", "comedy", "rock", "pop", "fantasy", "thriller"],
         "audiences": ["list", "of", "audience", "keywords", "with", "parent", "types", "like", {"keyword": "young adults", "parentType": "urn:audience:life_stage"}, {"keyword": "tech professionals", "parentType": "urn:audience:professional_area"}, {"keyword": "gamers", "parentType": "urn:audience:hobbies_and_interests"}]
       },
    "location": {
      "query": "location query if mentioned",
      "radius": "radius in meters (number between 0-800000) if mentioned, or 'N/A' if not specified"
    },
    "trends": "trending level: 'trending' for trending items, 'very_trending' for very trending, 'slightly_trending' for slightly trending, 'not_trending' for not trending, or 'off' if not mentioned. Note: destination/place/location entities do not support trending requests, so use 'off' for these entity types."
  },
  "output": {
    "description": "What the user is looking for",
    "intent": "User's intent (discover, explore, find similar, etc.)"
  }
}

IMPORTANT: Use ONLY these exact Qloo entity types:
- artist
- book
- brand
- destination
- movie
- person
- place
- podcast
- tv_show
- videogame

ENTITY TYPE GUIDANCE:
- Use "destination" for cities, countries, regions, travel destinations (e.g., "Find cities in Europe", "Show me countries in Asia")
- Use "place" for tourist attractions, landmarks, restaurants, hotels, museums, parks within a city (e.g., "Find tourist places in Paris", "Show me restaurants in New York", "Find museums in London")
- Use "movie" for films, cinema
- Use "tv_show" for television series, shows
- Use "videogame" for video games, games
- Use "artist" for musicians, bands, singers
- Use "book" for books, literature
- Use "brand" for companies, products, brands
- Use "person" for celebrities, public figures
- Use "podcast" for podcasts, audio shows

 Use these tag categories when relevant:
 - Media genres: action, comedy, drama, thriller, sci_fi, horror, fantasy, documentary, animation, popular
 - Restaurant genres: Italian, Chinese, Mexican, Japanese, American, French, Indian, Thai
 - Music genres: rock, pop, hip_hop, electronic, jazz, classical, country, r_and_b
 - Book genres: fiction, non_fiction, sci_fi, fantasy, mystery, thriller, romance, biography
 
 IMPORTANT AUDIENCE DETECTION RULES:
 - Put demographic terms in "audiences" array with parent types:
   * Age-related: {"keyword": "young adults", "parentType": "urn:audience:life_stage"}
   * Professional: {"keyword": "tech professionals", "parentType": "urn:audience:professional_area"}
   * Lifestyle: {"keyword": "fitness enthusiasts", "parentType": "urn:audience:lifestyle_preferences_beliefs"}
   * Hobbies: {"keyword": "gamers", "parentType": "urn:audience:hobbies_and_interests"}
   * Communities: {"keyword": "travelers", "parentType": "urn:audience:communities"}
   * Global Issues: {"keyword": "environmentalists", "parentType": "urn:audience:global_issues"}
   * Investing: {"keyword": "investors", "parentType": "urn:audience:investing_interests"}
   * Leisure: {"keyword": "sports fans", "parentType": "urn:audience:leisure"}
   * Political: {"keyword": "conservatives", "parentType": "urn:audience:political_preferences"}
   * Spending: {"keyword": "luxury shoppers", "parentType": "urn:audience:spending_habits"}
 - Put genre/style terms in "tags" array: action, comedy, rock, pop, fantasy, etc.
 - Note: destination/place/location entities do not support audience requests, so use empty array [] for "audiences" when entity type is destination, place, or location.

 Focus on extracting actionable information that can be used with Qloo's Entity Search, Tag Search, and Insights APIs.
 
 EXAMPLE: For "Find movies popular among young adults aged 18-25, preferably action and comedy genres"
 - "tags" should contain: ["action", "comedy"] (genres)
 - "audiences" should contain: [{"keyword": "young adults", "parentType": "urn:audience:life_stage"}, {"keyword": "18-25", "parentType": "urn:audience:life_stage"}] (demographics with parent types)
 - "keywords" should contain: ["action", "comedy", "movies"] (general search terms)

EXAMPLE: For "Find tourist places in Paris"
 - "entityType" should be: "place" (because we're looking for attractions within a city)
 - "keywords" should contain: ["tourist", "places", "Paris"]
 - "location" should contain: {"query": "Paris", "radius": "N/A"}

EXAMPLE: For "Show me cities in Europe"
 - "entityType" should be: "destination" (because we're looking for cities/regions)
 - "keywords" should contain: ["cities", "Europe"]`;

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
        temperature: 0.3
      })
    });

    const openaiData = await openaiResponse.json();
    log(`OpenAI response received in ${Date.now() - stepStartTime}ms`);
    
    if (openaiData.choices && openaiData.choices[0]) {
      const content = openaiData.choices[0].message.content.trim();
      log(`OpenAI response content length: ${content.length} characters`);
      
      try {
        const analysis = JSON.parse(content);
        log('LLM response parsed successfully as JSON');
        log(`LLM analysis completed in ${Date.now() - stepStartTime}ms`);
        return { success: true, data: analysis };
      } catch (parseError) {
        log('Failed to parse LLM response as JSON');
        log(`Parse error: ${parseError.message}`);
        log(`Raw content: ${content.substring(0, 200)}...`);
        error('Failed to parse LLM response as JSON:', parseError.message);
        return { success: false, error: 'Invalid LLM response format' };
      }
    } else {
      log('No valid response from OpenAI');
      log(`OpenAI response: ${JSON.stringify(openaiData)}`);
      return { success: false, error: 'No response from OpenAI' };
    }
  } catch (err) {
    log(`LLM analysis failed after ${Date.now() - stepStartTime}ms`);
    log(`Error: ${err.message}`);
    error('LLM analysis failed:', err.message);
    return { success: false, error: err.message };
  }
}

// Step 2: Extract keywords and get IDs using Qloo's Entity Search and Tag Search APIs
async function extractEntityAndTagIds(analysis, log, error) {
  const stepStartTime = Date.now();
  try {
    log('Starting entity and tag extraction...');
    log(`Entity type: ${analysis.entityType}`);
    log(`Keywords to search: ${analysis.filters?.keywords?.join(', ') || 'none'}`);
    
    const results = {
      entities: [],
      tags: [],
      audiences: []
    };

    // Search for entities using keywords
    if (analysis.filters && analysis.filters.keywords) {
      log(`Starting entity search for ${analysis.filters.keywords.length} keywords`);
      for (const keyword of analysis.filters.keywords.slice(0, 3)) { // Limit to 3 keywords
        try {
          const entityUrl = `https://hackathon.api.qloo.com/search?query=${encodeURIComponent(keyword)}&limit=5&types=urn:entity:${analysis.entityType}`;
          log(`Searching for entity with keyword "${keyword}": ${entityUrl}`);
          
          const entityResponse = await fetch(entityUrl, {
            method: 'GET',
            headers: {
              'X-Api-Key': process.env.QLOO_API_KEY,
              'Content-Type': 'application/json'
            }
          });
          
          const entityData = await entityResponse.json();
          log(`Entity search response for "${keyword}": ${entityData.results?.length || 0} results`);
          
          if (entityData.results && entityData.results.length > 0) {
            const entitiesToAdd = entityData.results.slice(0, 2); // Limit to 2 results per keyword
            results.entities.push(...entitiesToAdd);
            log(`Added ${entitiesToAdd.length} entities for keyword "${keyword}"`);
          } else {
            log(`No entities found for keyword "${keyword}"`);
          }
        } catch (entityError) {
          log(`Error searching for entity with keyword "${keyword}": ${entityError.message}`);
        }
      }
    } else {
      log('No keywords found for entity search');
    }

    // Search for tags using keywords and predefined tag mappings
    if (analysis.filters && analysis.filters.keywords) {
      log(`Starting tag search for ${analysis.filters.keywords.length} keywords`);
      for (const keyword of analysis.filters.keywords.slice(0, 3)) { // Limit to 3 keywords
        try {
          const tagUrl = `https://hackathon.api.qloo.com/v2/tags?filter.query=${encodeURIComponent(keyword)}&take=5`;
          log(`Searching for tag with keyword "${keyword}": ${tagUrl}`);
          
          const tagResponse = await fetch(tagUrl, {
            method: 'GET',
            headers: {
              'X-Api-Key': process.env.QLOO_API_KEY,
              'Content-Type': 'application/json'
            }
          });
          
          const tagData = await tagResponse.json();
          log(`Tag search response for "${keyword}": ${tagData.results?.tags?.length || 0} results`);
          
          if (tagData.results && tagData.results.tags && tagData.results.tags.length > 0) {
            const tagsToAdd = tagData.results.tags.slice(0, 2); // Limit to 2 results per keyword
            results.tags.push(...tagsToAdd);
            log(`Added ${tagsToAdd.length} tags for keyword "${keyword}"`);
          } else {
            log(`No tags found for keyword "${keyword}"`);
          }
        } catch (tagError) {
          log(`Error searching for tag with keyword "${keyword}": ${tagError.message}`);
        }
      }
    } else {
      log('No keywords found for tag search');
    }

         // Search for audiences if mentioned in signals
     if (analysis.signals && analysis.signals.interests && analysis.signals.interests.audiences) {
       log(`Starting audience search for ${analysis.signals.interests.audiences.length} audience keywords`);
       
       for (const audienceItem of analysis.signals.interests.audiences.slice(0, 2)) {
         try {
           // Handle both string format (backward compatibility) and object format
           const audienceKeyword = typeof audienceItem === 'string' ? audienceItem : audienceItem.keyword;
           const parentType = typeof audienceItem === 'string' ? 'urn:audience:communities' : audienceItem.parentType;
           
           log(`Processing audience: "${audienceKeyword}" with parent type: "${parentType}"`);
           
           // Search with the provided parent type
           const audienceUrl = `https://hackathon.api.qloo.com/v2/audiences?filter.parents.types=${parentType}&take=15`;
           log(`Searching for audiences with parent type "${parentType}": ${audienceUrl}`);
           
           const audienceResponse = await fetch(audienceUrl, {
             method: 'GET',
             headers: {
               'X-Api-Key': process.env.QLOO_API_KEY,
               'Content-Type': 'application/json'
             }
           });
           
           const audienceData = await audienceResponse.json();
           log(`Audience search response: ${audienceData.results?.audiences?.length || 0} results`);
           
           if (audienceData.results && audienceData.results.audiences && audienceData.results.audiences.length > 0) {
             // Filter results that match our keyword (case-insensitive)
             const matchingAudiences = audienceData.results.audiences.filter(audience => 
               audience.name && audience.name.toLowerCase().includes(audienceKeyword.toLowerCase())
             );
             
             if (matchingAudiences.length > 0) {
               const audiencesToAdd = matchingAudiences.slice(0, 2);
               results.audiences.push(...audiencesToAdd);
               log(`Added ${audiencesToAdd.length} matching audiences for keyword "${audienceKeyword}"`);
             } else {
               log(`No matching audiences found for keyword "${audienceKeyword}", adding first 2 from category`);
               // If no exact match, add first 2 from the category
               const audiencesToAdd = audienceData.results.audiences.slice(0, 2);
               results.audiences.push(...audiencesToAdd);
               log(`Added ${audiencesToAdd.length} audiences from category for keyword "${audienceKeyword}"`);
             }
           } else {
             log(`No audiences found in response for parent type "${parentType}"`);
           }
         } catch (audienceError) {
           log(`Error searching for audience with keyword "${audienceError}": ${audienceError.message}`);
         }
       }
       
               // If no audiences found, try a broader search with multiple parent types
        if (results.audiences.length === 0) {
          try {
            log('No specific audiences found, trying broader audience search with multiple parent types...');
            
            // Try multiple parent types to find relevant audiences
            const fallbackParentTypes = [
              'urn:audience:life_stage',
              'urn:audience:professional_area',
              'urn:audience:hobbies_and_interests',
              'urn:audience:leisure'
            ];
            
            for (const parentType of fallbackParentTypes) {
              try {
                const fallbackUrl = `https://hackathon.api.qloo.com/v2/audiences?filter.parents.types=${parentType}&take=5`;
                log(`Trying fallback search with parent type: ${parentType}`);
                
                const fallbackResponse = await fetch(fallbackUrl, {
                  method: 'GET',
                  headers: {
                    'X-Api-Key': process.env.QLOO_API_KEY,
                    'Content-Type': 'application/json'
                  }
                });
                
                const fallbackData = await fallbackResponse.json();
                if (fallbackData.results && fallbackData.results.length > 0) {
                  const fallbackAudiences = fallbackData.results.slice(0, 2);
                  results.audiences.push(...fallbackAudiences);
                  log(`Added ${fallbackAudiences.length} audiences from ${parentType} as fallback`);
                  break; // Stop after finding some audiences
                }
              } catch (fallbackError) {
                log(`Error in fallback search for ${parentType}: ${fallbackError.message}`);
              }
            }
            
            // If still no audiences, try a completely broad search
            if (results.audiences.length === 0) {
              log('Still no audiences found, trying completely broad search...');
              const broadAudienceUrl = `https://hackathon.api.qloo.com/v2/audiences?take=10`;
              
              const broadResponse = await fetch(broadAudienceUrl, {
                method: 'GET',
                headers: {
                  'X-Api-Key': process.env.QLOO_API_KEY,
                  'Content-Type': 'application/json'
                }
              });
              
              const broadData = await broadResponse.json();
              if (broadData.results && broadData.results.length > 0) {
                const generalAudiences = broadData.results.slice(0, 3);
                results.audiences.push(...generalAudiences);
                log(`Added ${generalAudiences.length} general audiences as final fallback`);
              }
            }
          } catch (broadError) {
            log(`Error in broad audience search: ${broadError.message}`);
          }
        }
     } else {
       log('No audience keywords found for search');
     }

    log(`Entity and tag extraction completed in ${Date.now() - stepStartTime}ms`);
    log(`Total entities found: ${results.entities.length}`);
    log(`Total tags found: ${results.tags.length}`);
    log(`Total audiences found: ${results.audiences.length}`);
    
    return { success: true, data: results };
  } catch (err) {
    log(`Entity and tag extraction failed after ${Date.now() - stepStartTime}ms`);
    log(`Error: ${err.message}`);
    error('Entity and tag extraction failed:', err.message);
    return { success: false, error: err.message };
  }
}

// Step 3: Combine IDs with analysis output, replacing keywords with IDs
function combineAnalysisWithIds(analysis, entityAndTagIds, log) {
  const stepStartTime = Date.now();
  try {
    log('Starting data combination...');
    log(`Input entities: ${entityAndTagIds.entities.length}`);
    log(`Input tags: ${entityAndTagIds.tags.length}`);
    log(`Input audiences: ${entityAndTagIds.audiences.length}`);
    
    // Debug tag structure
    if (entityAndTagIds.tags.length > 0) {
      log(`Sample tag structure: ${JSON.stringify(entityAndTagIds.tags[0])}`);
    }
    
    // Debug audience structure
    if (entityAndTagIds.audiences.length > 0) {
      log(`Sample audience structure: ${JSON.stringify(entityAndTagIds.audiences[0])}`);
    }
    
    const combined = {
      ...analysis,
      entityIds: entityAndTagIds.entities.map(entity => entity.entity_id),
      tagIds: entityAndTagIds.tags.map(tag => tag.id), // Tags API returns id property
      audienceIds: entityAndTagIds.audiences.map(audience => audience.entity_id),
      entities: entityAndTagIds.entities.map(entity => ({
        id: entity.entity_id,
        name: entity.name,
        type: entity.type
      })),
      tags: entityAndTagIds.tags.map(tag => ({
        id: tag.id, // Tags API returns id property
        name: tag.name
      })),
      audiences: entityAndTagIds.audiences.map(audience => ({
        id: audience.entity_id,
        name: audience.name
      }))
    };

    log(`Data combination completed in ${Date.now() - stepStartTime}ms`);
    log(`Combined ${combined.entityIds.length} entity IDs, ${combined.tagIds.length} tag IDs, and ${combined.audienceIds.length} audience IDs`);
    return combined;
  } catch (err) {
    log(`Data combination failed after ${Date.now() - stepStartTime}ms`);
    log(`Error: ${err.message}`);
    return analysis; // Return original analysis if combination fails
  }
}

// Step 4: Map to real parameters of Insights API
function mapToInsightsApiParams(combinedData, log) {
  const stepStartTime = Date.now();
  try {
    log('Starting parameter mapping...');
    log(`Entity type: ${combinedData.entityType}`);
    log(`Available entity IDs: ${combinedData.entityIds?.length || 0}`);
    log(`Available tag IDs: ${combinedData.tagIds?.length || 0}`);
    log(`Available audience IDs: ${combinedData.audienceIds?.length || 0}`);
    log(`Signals data: ${JSON.stringify(combinedData.signals)}`);
    
    const params = {
      "filter.type": `urn:entity:${combinedData.entityType}`,
      take: 20
    };

    // Add entity filters if available with validation
    if (combinedData.filters && combinedData.filters.attributes) {
      const { year, country, genre, location } = combinedData.filters.attributes;
      if (year && !isNaN(parseInt(year))) {
        const yearNum = parseInt(year);
        if (yearNum >= 1900 && yearNum <= 2030) {
          params['filter.release_year.min'] = yearNum;
          params['filter.release_year.max'] = yearNum;
        }
      }
      if (country && country.trim() !== '' && country !== 'N/A') {
        params['filter.release_country'] = country.trim();
      }
      if (genre && genre.trim() !== '' && genre !== 'N/A') {
        params['filter.tags'] = genre.trim();
      }
      // Note: Removed filter.location as it causes WKT format errors
      // Location filtering is handled via signal.location.query instead
    }

    // Add tag signals if available with validation
    if (combinedData.tagIds && Array.isArray(combinedData.tagIds) && combinedData.tagIds.length > 0) {
      const validTagIds = combinedData.tagIds.filter(id => id && id.trim() !== '' && id !== 'N/A');
      if (validTagIds.length > 0) {
        params['signal.interests.tags'] = validTagIds.slice(0, 5).join(','); // Limit to 5 tags
      }
    }

    // Add audience signals if available with validation (but not for destination entities)
    if (combinedData.audienceIds && Array.isArray(combinedData.audienceIds) && combinedData.audienceIds.length > 0) {
      const entityType = combinedData.entityType || '';
      const unsupportedAudienceEntities = ['destination', 'place', 'location'];
      
      if (!unsupportedAudienceEntities.includes(entityType)) {
        const validAudienceIds = combinedData.audienceIds.filter(id => id && id.trim() !== '' && id !== 'N/A');
        if (validAudienceIds.length > 0) {
          params['signal.demographics.audiences'] = validAudienceIds.slice(0, 3).join(','); // Limit to 3 audiences
        }
      } else {
        log(`Entity type "${entityType}" does not support audience requests, skipping signal.demographics.audiences`);
      }
    }

    // Add entity signals if available with validation
    if (combinedData.entityIds && Array.isArray(combinedData.entityIds) && combinedData.entityIds.length > 0) {
      const validEntityIds = combinedData.entityIds.filter(id => id && id.trim() !== '' && id !== 'N/A');
      if (validEntityIds.length > 0) {
        params['signal.interests.entities'] = validEntityIds.slice(0, 3).join(','); // Limit to 3 entities
      }
    }

    // Add location signals if available with validation
    if (combinedData.signals && combinedData.signals.location) {
      const { query, radius } = combinedData.signals.location;
      if (query && query.trim() !== '' && query !== 'N/A') {
        params['signal.location.query'] = query.trim();
        // Validate and set radius - must be a number between 0 and 800000
        if (radius && radius !== 'N/A') {
          const radiusNum = parseFloat(radius);
          if (!isNaN(radiusNum) && radiusNum >= 0 && radiusNum <= 800000) {
            params['signal.location.radius'] = radiusNum;
          } else {
            log(`Invalid radius value: ${radius}, using default radius of 50000`);
            params['signal.location.radius'] = 50000; // Default radius in meters
          }
        } else {
          log('No valid radius provided, using default radius of 50000');
          params['signal.location.radius'] = 50000; // Default radius in meters
        }
      }
    }

    // Add trends bias if available and entity type supports it
    if (combinedData.signals && combinedData.signals.trends) {
      // Check if entity type supports trending requests
      const entityType = combinedData.entityType || '';
      const unsupportedTrendingEntities = [
        'destination',
        'place',
        'location'
      ];
      
      if (unsupportedTrendingEntities.includes(entityType)) {
        log(`Entity type "${entityType}" does not support trending requests, skipping bias.trends`);
      } else {
        // Map trends values to valid Qloo API values (only low, medium, high are supported)
        const trendsMapping = {
          'trending': 'high',
          'very_trending': 'high',
          'slightly_trending': 'medium',
          'not_trending': 'low',
          'off': 'low',
          'very_low': 'low',
          'low': 'low',
          'mid': 'medium',
          'medium': 'medium',
          'high': 'high',
          'very_high': 'high'
        };
        
        const mappedTrends = trendsMapping[combinedData.signals.trends.toLowerCase()] || 'medium';
        log(`Mapping trends value "${combinedData.signals.trends}" to "${mappedTrends}"`);
        
        params['bias.trends'] = mappedTrends;
      }
    }

    // Clean up parameters - remove any undefined, null, or empty string values
    Object.keys(params).forEach(key => {
      if (params[key] === undefined || params[key] === null || 
          (typeof params[key] === 'string' && params[key].trim() === '') ||
          (Array.isArray(params[key]) && params[key].length === 0)) {
        delete params[key];
        log(`Removed invalid parameter: ${key}`);
      }
    });

    // Ensure we have at least one valid signal or filter beyond the required filter.type
    const hasValidSignals = Object.keys(params).some(key => 
      key !== 'filter.type' && key !== 'take' && 
      params[key] !== undefined && params[key] !== null && 
      (Array.isArray(params[key]) ? params[key].length > 0 : params[key] !== '')
    );

    if (!hasValidSignals) {
      log('No valid signals found, adding default bias.trends to ensure API compliance');
      // Add a default trends bias to ensure we have at least one signal
      const entityType = combinedData.entityType || '';
      const unsupportedTrendingEntities = ['destination', 'place', 'location'];
      
      if (!unsupportedTrendingEntities.includes(entityType)) {
        params['bias.trends'] = 'medium'; // Default to medium trends
        log('Added default bias.trends = medium');
      } else {
        // For unsupported trending entities, add a default location signal
        params['signal.location.query'] = 'global';
        params['signal.location.radius'] = 50000;
        log('Added default location signal for unsupported trending entity');
      }
    }

    log(`Parameter mapping completed in ${Date.now() - stepStartTime}ms`);
    log(`Final parameters: ${JSON.stringify(params)}`);
    return params;
  } catch (err) {
    log(`Parameter mapping failed after ${Date.now() - stepStartTime}ms`);
    log(`Error: ${err.message}`);
    return {
      "filter.type": `urn:entity:${combinedData.entityType}`,
      take: 20,
      'bias.trends': 'medium' // Add default signal to prevent API error
    };
  }
}

// Step 5: Call Insights API using the parameters
async function callInsightsApi(params, log, error) {
  const stepStartTime = Date.now();
  const maxRetries = 3;
  const baseDelay = 1000; // 1 second base delay
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      log(`Starting Insights API call (attempt ${attempt}/${maxRetries})...`);
      log(`Base URL: https://hackathon.api.qloo.com/v2/insights/`);
      
      // Build the URL with query parameters
      const baseUrl = 'https://hackathon.api.qloo.com/v2/insights/';
      const queryParams = new URLSearchParams();

      // Add all parameters directly
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            queryParams.append(key, value.join(','));
          } else {
            queryParams.append(key, value.toString());
          }
        }
      });

      const url = `${baseUrl}?${queryParams.toString()}`;
      log(`Calling Insights API: ${url}`);
      log(`Query parameters count: ${queryParams.toString().split('&').length}`);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-Api-Key': process.env.QLOO_API_KEY,
          'Content-Type': 'application/json'
        }
      });

      log(`Insights API response status: ${response.status}`);
      log(`Insights API response headers: ${JSON.stringify(Object.fromEntries(response.headers.entries()))}`);

      const data = await response.json();
      log(`Insights API response received in ${Date.now() - stepStartTime}ms`);
      
      if (response.status === 429) {
        // Rate limit hit - calculate delay with exponential backoff
        const delay = baseDelay * Math.pow(2, attempt - 1);
        log(`Rate limit hit (429). Waiting ${delay}ms before retry ${attempt + 1}/${maxRetries}...`);
        
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, delay));
          continue; // Retry
        } else {
          log(`Max retries (${maxRetries}) reached for rate limit. Giving up.`);
          throw new Error(`Rate limit exceeded after ${maxRetries} attempts`);
        }
      }
      
      if (!response.ok) {
        log(`Insights API error: ${response.status} - ${data.message || 'Unknown error'}`);
        if (data.errors) {
          log(`Validation errors: ${JSON.stringify(data.errors)}`);
        }
        throw new Error(`Insights API error: ${response.status} - ${data.message || 'Unknown error'}`);
      }

      log(`Insights API call completed successfully in ${Date.now() - stepStartTime}ms`);
      return { success: true, data };
      
    } catch (err) {
      log(`Insights API call failed on attempt ${attempt}/${maxRetries} after ${Date.now() - stepStartTime}ms`);
      log(`Error: ${err.message}`);
      
      // If this is the last attempt or it's not a rate limit error, return failure
      if (attempt === maxRetries || !err.message.includes('429')) {
        error('Insights API call failed:', err.message);
        return { success: false, error: err.message };
      }
      
      // For rate limit errors, continue to next retry attempt
      log(`Retrying due to rate limit error...`);
    }
  }
}