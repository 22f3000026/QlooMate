'use client';

import { useState, useCallback } from 'react';
import React from 'react';

export default function QlooTestPage() {
  const [selectedEndpoint, setSelectedEndpoint] = useState('search');
  const [query, setQuery] = useState('');
  const [entityType, setEntityType] = useState('');
  const [expectedCity, setExpectedCity] = useState('');
  const [expectedCountry, setExpectedCountry] = useState('');
  const [filterType, setFilterType] = useState('urn:entity:destination');
  const [signalParam, setSignalParam] = useState('signal.location.query');
  const [signalValue, setSignalValue] = useState('');
  const [take, setTake] = useState(10);
  const [generatedUrl, setGeneratedUrl] = useState('');
  const [showRawUrl, setShowRawUrl] = useState(true);

  // Supported endpoints based on the TypeScript service
  const endpoints = [
    { value: 'search', label: 'Search API', description: 'Search for entities by name' },
    { value: 'insights', label: 'Insights API', description: 'Get recommendations and insights' },
    { value: 'entities', label: 'Entities API', description: 'Get entity details' },
    { value: 'tags', label: 'Tags API', description: 'Search for tags' },
    { value: 'audiences', label: 'Audiences API', description: 'Get audience data' },
    { value: 'analysis', label: 'Analysis API', description: 'Get entity analysis' },
    { value: 'compare', label: 'Compare API', description: 'Compare two entities' }
  ];

  // Entity types from the TypeScript service
  const entityTypes = [
    { value: 'urn:entity:movie', label: 'Movie' },
    { value: 'urn:entity:tv_show', label: 'TV Show' },
    { value: 'urn:entity:music_artist', label: 'Music Artist' },
    { value: 'urn:entity:music_album', label: 'Music Album' },
    { value: 'urn:entity:music_track', label: 'Music Track' },
    { value: 'urn:entity:book', label: 'Book' },
    { value: 'urn:entity:restaurant', label: 'Restaurant' },
    { value: 'urn:entity:podcast', label: 'Podcast' },
    { value: 'urn:entity:video_game', label: 'Video Game' },
    { value: 'urn:entity:hotel', label: 'Hotel' },
    { value: 'urn:entity:destination', label: 'Destination' },
    { value: 'urn:entity:place', label: 'Place' },
    { value: 'urn:entity:artist', label: 'Artist' },
    { value: 'urn:entity:brand', label: 'Brand' },
    { value: 'urn:entity:person', label: 'Person' }
  ];

  // Predefined tags from the TypeScript service
  const predefinedTags = {
    'urn:tag:genre:media': [
      { id: 'urn:tag:genre:media:action', name: 'Action' },
      { id: 'urn:tag:genre:media:comedy', name: 'Comedy' },
      { id: 'urn:tag:genre:media:drama', name: 'Drama' },
      { id: 'urn:tag:genre:media:thriller', name: 'Thriller' },
      { id: 'urn:tag:genre:media:sci_fi', name: 'Sci-Fi' },
      { id: 'urn:tag:genre:media:horror', name: 'Horror' },
      { id: 'urn:tag:genre:media:fantasy', name: 'Fantasy' },
      { id: 'urn:tag:genre:media:documentary', name: 'Documentary' },
      { id: 'urn:tag:genre:media:animation', name: 'Animation' },
      { id: 'urn:tag:genre:media:popular', name: 'Popular' }
    ],
    'urn:tag:genre:restaurant': [
      { id: 'urn:tag:genre:restaurant:Italian', name: 'Italian' },
      { id: 'urn:tag:genre:restaurant:Chinese', name: 'Chinese' },
      { id: 'urn:tag:genre:restaurant:Mexican', name: 'Mexican' },
      { id: 'urn:tag:genre:restaurant:Japanese', name: 'Japanese' },
      { id: 'urn:tag:genre:restaurant:American', name: 'American' },
      { id: 'urn:tag:genre:restaurant:French', name: 'French' },
      { id: 'urn:tag:genre:restaurant:Indian', name: 'Indian' },
      { id: 'urn:tag:genre:restaurant:Thai', name: 'Thai' }
    ],
    'urn:tag:genre:music': [
      { id: 'urn:tag:genre:music:rock', name: 'Rock' },
      { id: 'urn:tag:genre:music:pop', name: 'Pop' },
      { id: 'urn:tag:genre:music:hip_hop', name: 'Hip Hop' },
      { id: 'urn:tag:genre:music:electronic', name: 'Electronic' },
      { id: 'urn:tag:genre:music:jazz', name: 'Jazz' },
      { id: 'urn:tag:genre:music:classical', name: 'Classical' },
      { id: 'urn:tag:genre:music:country', name: 'Country' },
      { id: 'urn:tag:genre:music:r_and_b', name: 'R&B' }
    ],
    'urn:tag:genre:book': [
      { id: 'urn:tag:genre:book:fiction', name: 'Fiction' },
      { id: 'urn:tag:genre:book:non_fiction', name: 'Non-Fiction' },
      { id: 'urn:tag:genre:book:sci_fi', name: 'Science Fiction' },
      { id: 'urn:tag:genre:book:fantasy', name: 'Fantasy' },
      { id: 'urn:tag:genre:book:mystery', name: 'Mystery' },
      { id: 'urn:tag:genre:book:thriller', name: 'Thriller' },
      { id: 'urn:tag:genre:book:romance', name: 'Romance' },
      { id: 'urn:tag:genre:book:biography', name: 'Biography' }
    ]
  };

  // Signal parameters for insights
  const signalParams = [
    {
      value: 'signal.interests.tags',
      label: 'Tags (IDs)',
      placeholder: 'Comma-separated tag IDs'
    },
    {
      value: 'signal.demographics.audiences',
      label: 'Audiences (IDs)',
      placeholder: 'Comma-separated audience IDs'
    },
    {
      value: 'signal.location',
      label: 'Location (WKT or Qloo ID)',
      placeholder: 'e.g. POINT(-73.99823 40.722668) or urn:entity:place:new-york'
    },
    {
      value: 'signal.location.query',
      label: 'Location Query',
      placeholder: 'e.g. New York City, Los Angeles, Chennai'
    },
    {
      value: 'signal.location.radius',
      label: 'Location Radius (meters)',
      placeholder: 'e.g. 1000'
    },
    {
      value: 'bias.trends',
      label: 'Bias Trends',
      placeholder: 'e.g. trending'
    }
  ];

  // Predefined examples based on the TypeScript service functions
  const predefinedExamples = [
    {
      name: 'Search: Chennai Tourist Attractions',
      endpoint: 'search',
      query: 'Chennai tourist attractions',
      entityType: '',
      expectedCity: 'Chennai',
      expectedCountry: 'India',
      description: 'Search for tourist attractions in Chennai'
    },
    {
      name: 'Insights: Popular Tourist Destinations in Chennai',
      endpoint: 'insights',
      filterType: 'urn:entity:destination',
      signalParam: 'signal.location.query',
      signalValue: 'Chennai',
      take: 15,
      description: 'Get popular tourist destinations in Chennai using location-based insights'
    },
    {
      name: 'Insights: Chennai Destinations',
      endpoint: 'insights',
      filterType: 'urn:entity:destination',
      signalParam: 'signal.location.query',
      signalValue: 'Chennai',
      take: 10,
      description: 'Get destination insights for Chennai'
    },
    {
      name: 'Insights: Action Movies',
      endpoint: 'insights',
      filterType: 'urn:entity:movie',
      signalParam: 'signal.interests.tags',
      signalValue: 'urn:tag:genre:media:action',
      take: 10,
      description: 'Get action movie recommendations'
    },
    {
      name: 'Insights: Italian Restaurants',
      endpoint: 'insights',
      filterType: 'urn:entity:restaurant',
      signalParam: 'signal.interests.tags',
      signalValue: 'urn:tag:genre:restaurant:Italian',
      take: 10,
      description: 'Get Italian restaurant recommendations'
    },
    {
      name: 'Insights: Pop Music Artists',
      endpoint: 'insights',
      filterType: 'urn:entity:music_artist',
      signalParam: 'signal.interests.tags',
      signalValue: 'urn:tag:genre:music:pop',
      take: 10,
      description: 'Get pop music artist recommendations'
    },
    {
      name: 'Insights: Fiction Books',
      endpoint: 'insights',
      filterType: 'urn:entity:book',
      signalParam: 'signal.interests.tags',
      signalValue: 'urn:tag:genre:book:fiction',
      take: 10,
      description: 'Get fiction book recommendations'
    },
    {
      name: 'Search: Tokyo Music Venues',
      endpoint: 'search',
      query: 'Tokyo music venues',
      entityType: '',
      expectedCity: 'Tokyo',
      expectedCountry: 'Japan',
      description: 'Search for music venues in Tokyo'
    },
    {
      name: 'Search: Paris Restaurants',
      endpoint: 'search',
      query: 'Paris restaurants',
      entityType: '',
      expectedCity: 'Paris',
      expectedCountry: 'France',
      description: 'Search for restaurants in Paris'
    },
    {
      name: 'Insights: Trending Destinations',
      endpoint: 'insights',
      filterType: 'urn:entity:destination',
      signalParam: 'bias.trends',
      signalValue: 'trending',
      take: 10,
      description: 'Get trending destination recommendations'
    },
    {
      name: 'Search: Mumbai Attractions',
      endpoint: 'search',
      query: 'Mumbai attractions',
      entityType: '',
      expectedCity: 'Mumbai',
      expectedCountry: 'India',
      description: 'Search for attractions in Mumbai'
    },
    {
      name: 'Insights: Comedy Movies',
      endpoint: 'insights',
      filterType: 'urn:entity:movie',
      signalParam: 'signal.interests.tags',
      signalValue: 'urn:tag:genre:media:comedy',
      take: 10,
      description: 'Get comedy movie recommendations'
    },
    {
      name: 'Search: London Theaters',
      endpoint: 'search',
      query: 'London theaters',
      entityType: '',
      expectedCity: 'London',
      expectedCountry: 'United Kingdom',
      description: 'Search for theaters in London'
    },
    {
      name: 'Insights: Popular Restaurants in Chennai',
      endpoint: 'insights',
      filterType: 'urn:entity:restaurant',
      signalParam: 'signal.location.query',
      signalValue: 'Chennai',
      take: 10,
      description: 'Get popular restaurant recommendations in Chennai'
    },
    {
      name: 'Insights: Trending Destinations Worldwide',
      endpoint: 'insights',
      filterType: 'urn:entity:destination',
      signalParam: 'bias.trends',
      signalValue: 'trending',
      take: 20,
      description: 'Get globally trending destinations'
    },
    {
      name: 'Search: Mumbai Popular Attractions',
      endpoint: 'search',
      query: 'Mumbai popular attractions',
      entityType: 'attraction',
      expectedCity: 'Mumbai',
      expectedCountry: 'India',
      description: 'Search for popular attractions in Mumbai'
    }
  ];

  // Generate URL function
  const generateUrl = useCallback(() => {
    const baseUrl = 'https://hackathon.api.qloo.com';
    let url = '';
    const params = new URLSearchParams();

    switch (selectedEndpoint) {
      case 'search':
        url = `${baseUrl}/search`;
        if (query.trim()) {
          params.append('query', query.trim());
        }
        if (entityType.trim()) {
          params.append('types', entityType.trim());
        }
        if (take > 0) {
          params.append('limit', take.toString());
        }
        break;

      case 'insights':
        url = `${baseUrl}/v2/insights/`;
        if (filterType) {
          params.append('filter.type', filterType);
        }
        if (take > 0) {
          params.append('take', take.toString());
        }
        if (signalValue.trim()) {
          params.append(signalParam, signalValue.trim());
        }
        break;

      case 'entities':
        url = `${baseUrl}/v2/entities`;
        if (query.trim()) {
          params.append('q', query.trim());
        }
        if (filterType) {
          params.append('filter.type', filterType);
        }
        if (take > 0) {
          params.append('take', take.toString());
        }
        break;

      case 'tags':
        url = `${baseUrl}/v2/tags`;
        if (query.trim()) {
          params.append('q', query.trim());
        }
        if (take > 0) {
          params.append('take', take.toString());
        }
        break;

      case 'audiences':
        url = `${baseUrl}/v2/audiences`;
        if (query.trim()) {
          params.append('q', query.trim());
        }
        if (take > 0) {
          params.append('take', take.toString());
        }
        break;

      case 'analysis':
        url = `${baseUrl}/v2/analysis`;
        if (query.trim()) {
          params.append('entity_ids', query.trim());
        }
        if (take > 0) {
          params.append('take', take.toString());
        }
        break;

      case 'compare':
        url = `${baseUrl}/v2/compare`;
        if (query.trim()) {
          params.append('entity1.id', query.trim());
        }
        if (signalValue.trim()) {
          params.append('entity2.id', signalValue.trim());
        }
        break;

      default:
        url = `${baseUrl}/search`;
    }

    const queryString = params.toString();
    const finalUrl = queryString ? `${url}?${queryString}` : url;
    setGeneratedUrl(finalUrl);
  }, [selectedEndpoint, query, entityType, filterType, signalParam, signalValue, take]);

  // Get display URL (raw format)
  const getDisplayUrl = () => {
    const baseUrl = 'https://hackathon.api.qloo.com';
    let url = '';
    const rawParams = [];

    switch (selectedEndpoint) {
      case 'search':
        url = `${baseUrl}/search`;
        if (query.trim()) {
          rawParams.push(`query=${query.trim()}`);
        }
        if (entityType.trim()) {
          rawParams.push(`types=${entityType.trim()}`);
        }
        if (take > 0) {
          rawParams.push(`limit=${take}`);
        }
        break;

      case 'insights':
        url = `${baseUrl}/v2/insights/`;
        if (filterType) {
          rawParams.push(`filter.type=${filterType}`);
        }
        if (take > 0) {
          rawParams.push(`take=${take}`);
        }
        if (signalValue.trim()) {
          rawParams.push(`${signalParam}=${signalValue.trim()}`);
        }
        break;

      case 'entities':
        url = `${baseUrl}/v2/entities`;
        if (query.trim()) {
          rawParams.push(`q=${query.trim()}`);
        }
        if (filterType) {
          rawParams.push(`filter.type=${filterType}`);
        }
        if (take > 0) {
          rawParams.push(`take=${take}`);
        }
        break;

      case 'tags':
        url = `${baseUrl}/v2/tags`;
        if (query.trim()) {
          rawParams.push(`q=${query.trim()}`);
        }
        if (take > 0) {
          rawParams.push(`take=${take}`);
        }
        break;

      case 'audiences':
        url = `${baseUrl}/v2/audiences`;
        if (query.trim()) {
          rawParams.push(`q=${query.trim()}`);
        }
        if (take > 0) {
          rawParams.push(`take=${take}`);
        }
        break;

      case 'analysis':
        url = `${baseUrl}/v2/analysis`;
        if (query.trim()) {
          rawParams.push(`entity_ids=${query.trim()}`);
        }
        if (take > 0) {
          rawParams.push(`take=${take}`);
        }
        break;

      case 'compare':
        url = `${baseUrl}/v2/compare`;
        if (query.trim()) {
          rawParams.push(`entity1.id=${query.trim()}`);
        }
        if (signalValue.trim()) {
          rawParams.push(`entity2.id=${signalValue.trim()}`);
        }
        break;

      default:
        url = `${baseUrl}/search`;
    }

    return rawParams.length > 0 ? `${url}?${rawParams.join('&')}` : url;
  };

  // Load example
  const loadExample = (example) => {
    setSelectedEndpoint(example.endpoint);
    setQuery(example.query || '');
    setEntityType(example.entityType || '');
    setExpectedCity(example.expectedCity || '');
    setExpectedCountry(example.expectedCountry || '');
    setFilterType(example.filterType || 'urn:entity:destination');
    setSignalParam(example.signalParam || 'signal.location.query');
    setSignalValue(example.signalValue || '');
    setTake(example.take || 10);
  };

  // Copy URL to clipboard
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(getDisplayUrl());
      alert('URL copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  // Auto-generate URL whenever any parameter changes
  React.useEffect(() => {
    generateUrl();
  }, [selectedEndpoint, query, entityType, filterType, signalParam, signalValue, take, generateUrl]);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Qloo API Testing</h1>
          <p className="text-gray-600 mb-6">
            Test Qloo&apos;s Search, Insights, and other APIs with dynamic URL generation
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-blue-800 mb-2">🔍 Qloo API Endpoints</h3>
            <p className="text-blue-700 text-sm mb-2">
              This interface tests the same functions as your TypeScript service:
            </p>
            <ul className="text-blue-700 text-sm list-disc list-inside space-y-1">
              <li><code className="bg-blue-100 px-1 rounded">getInsights()</code> - Get recommendations and insights</li>
              <li><code className="bg-blue-100 px-1 rounded">searchEntities()</code> - Search for entities by type and query</li>
              <li><code className="bg-blue-100 px-1 rounded">getTrendingEntitiesV2()</code> - Get trending entities</li>
              <li><code className="bg-blue-100 px-1 rounded">getAnalysis()</code> - Get entity analysis</li>
              <li><code className="bg-blue-100 px-1 rounded">getRecommendations()</code> - Get recommendations based on entity</li>
            </ul>
            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded">
              <p className="text-green-800 text-sm font-medium">💡 Quick Start:</p>
              <p className="text-green-700 text-sm">
                Try the &quot;Popular Tourist Destinations in Chennai&quot; example below to get location-based destination recommendations using Qloo&apos;s cultural intelligence!
              </p>
            </div>
          </div>

          {/* Endpoint Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              API Endpoint
            </label>
            <select
              value={selectedEndpoint}
              onChange={(e) => setSelectedEndpoint(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {endpoints.map((endpoint) => (
                <option key={endpoint.value} value={endpoint.value}>
                  {endpoint.label} - {endpoint.description}
                </option>
              ))}
            </select>
          </div>

          {/* Dynamic Form Based on Endpoint */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {/* Query - Common for most endpoints */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Query
              </label>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g., Chennai tourist attractions, Tokyo music venues"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Entity Type - For search and entities */}
            {(selectedEndpoint === 'search' || selectedEndpoint === 'entities') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Entity Type (Optional)
                </label>
                <input
                  type="text"
                  value={entityType}
                  onChange={(e) => setEntityType(e.target.value)}
                  placeholder="e.g., restaurant, attraction, venue"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            {/* Expected City - For search filtering */}
            {selectedEndpoint === 'search' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Expected City (Optional)
                </label>
                <input
                  type="text"
                  value={expectedCity}
                  onChange={(e) => setExpectedCity(e.target.value)}
                  placeholder="e.g., Chennai, Tokyo, Paris"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            {/* Expected Country - For search filtering */}
            {selectedEndpoint === 'search' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Expected Country (Optional)
                </label>
                <input
                  type="text"
                  value={expectedCountry}
                  onChange={(e) => setExpectedCountry(e.target.value)}
                  placeholder="e.g., India, Japan, France"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            {/* Filter Type - For insights and entities */}
            {(selectedEndpoint === 'insights' || selectedEndpoint === 'entities') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Filter Type
                </label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {entityTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Signal Parameter - For insights */}
            {selectedEndpoint === 'insights' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Signal Parameter
                </label>
                <select
                  value={signalParam}
                  onChange={(e) => setSignalParam(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {signalParams.map((param) => (
                    <option key={param.value} value={param.value}>
                      {param.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Signal Value - For insights */}
            {selectedEndpoint === 'insights' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Signal Value
                </label>
                <input
                  type="text"
                  value={signalValue}
                  onChange={(e) => setSignalValue(e.target.value)}
                  placeholder={signalParams.find(p => p.value === signalParam)?.placeholder}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            {/* Take/Limit - Common for all endpoints */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Limit (take/limit)
              </label>
              <input
                type="number"
                value={take}
                onChange={(e) => setTake(parseInt(e.target.value))}
                min="1"
                max="50"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Generated URL - Always visible and dynamic */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Generated URL (Live)
              </label>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Show encoded format:</label>
                <input
                  type="checkbox"
                  checked={!showRawUrl}
                  onChange={(e) => setShowRawUrl(!e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={showRawUrl ? getDisplayUrl() : generatedUrl}
                readOnly
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
              />
              <button
                onClick={copyToClipboard}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                Copy
              </button>
            </div>
            <div className="mt-2 text-xs text-gray-500">
              {showRawUrl ? 
                "Raw format (for readability) - use encoded version in Postman" : 
                "URL-encoded format (ready for Postman)"
              }
            </div>
          </div>
        </div>

        {/* Predefined Examples */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Examples</h2>
          <p className="text-gray-600 mb-4">Click any example to load it and generate the URL automatically</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {predefinedExamples.map((example, index) => (
              <button
                key={index}
                onClick={() => loadExample(example)}
                className="text-left p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
              >
                <h3 className="font-medium text-gray-900 mb-1">{example.name}</h3>
                <p className="text-sm text-gray-600 mb-2">
                  {example.endpoint.toUpperCase()} API
                </p>
                <p className="text-xs text-gray-500">
                  {example.description}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Postman Instructions */}
        <div className="bg-white rounded-lg shadow-lg p-6 mt-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Postman Setup</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Headers Required:</h3>
              <div className="bg-gray-100 p-3 rounded-md">
                <code className="text-sm">
                  X-Api-Key: your-api-key-here<br />
                  Content-Type: application/json
                </code>
              </div>
            </div>
            
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Method:</h3>
              <div className="bg-gray-100 p-3 rounded-md">
                <code className="text-sm">GET</code>
              </div>
            </div>

            <div>
              <h3 className="font-medium text-gray-900 mb-2">Example Response Structure:</h3>
              <div className="bg-gray-100 p-3 rounded-md">
                <pre className="text-sm overflow-x-auto">
{`{
  "success": true,
  "results": [
    {
      "name": "...",
      "type": "...",
      "location": {...},
      "properties": {...}
    }
  ]
}`}
                </pre>
              </div>
            </div>
          </div>
        </div>

        {/* API Documentation Link */}
        <div className="bg-blue-50 rounded-lg p-4 mt-6">
          <h3 className="font-medium text-blue-900 mb-2">Need Help?</h3>
          <p className="text-blue-700 text-sm mb-2">
            This interface tests the same Qloo API functions used in your TypeScript service for cultural intelligence and destination recommendations.
          </p>
          <div className="space-y-2">
            <a
              href="https://docs.qloo.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 text-sm font-medium block"
            >
              View API Documentation →
            </a>
            <a
              href="/dashboard"
              className="text-blue-600 hover:text-blue-800 text-sm font-medium block"
            >
              ← Back to Dashboard
            </a>
          </div>
        </div>
      </div>
    </div>
  );
} 