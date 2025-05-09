// backend/src/services/searchService.js
const axios = require('axios');

/**
 * Search the web using SerpAPI
 */
async function searchWeb(query, language = 'en') {
  try {
    // Default to SerpAPI, but can be extended to use other search APIs
    return await searchWithSerpApi(query, language);
  } catch (error) {
    console.error('Search error:', error);
    // Fallback to Google Custom Search if SerpAPI fails
    try {
      return await searchWithGoogleApi(query, language);
    } catch (fallbackError) {
      console.error('Fallback search error:', fallbackError);
      return {
        error: 'Failed to perform web search',
        results: []
      };
    }
  }
}

/**
 * Search using SerpAPI
 */
async function searchWithSerpApi(query, language) {
  const params = {
    api_key: process.env.SERPAPI_API_KEY,
    q: query,
    hl: language,
    gl: getCountryFromLanguage(language), // Map language to likely country code
    num: 5 // Number of results
  };
  
  const response = await axios.get('https://serpapi.com/search', { params });
  
  return {
    query,
    organic_results: response.data.organic_results || [],
    knowledge_graph: response.data.knowledge_graph || null,
    answer_box: response.data.answer_box || null
  };
}

/**
 * Search using Google Custom Search API
 */
async function searchWithGoogleApi(query, language) {
  const params = {
    key: process.env.GOOGLE_SEARCH_API_KEY,
    cx: process.env.GOOGLE_CSE_ID,
    q: query,
    hl: language,
    num: 5
  };
  
  const response = await axios.get('https://www.googleapis.com/customsearch/v1', { params });
  
  // Transform Google API response to match SerpAPI format
  const organicResults = response.data.items.map(item => ({
    position: item.rank,
    title: item.title,
    link: item.link,
    snippet: item.snippet,
    source: item.displayLink
  }));
  
  return {
    query,
    organic_results: organicResults,
    knowledge_graph: null,
    answer_box: null
  };
}

/**
 * Helper function to map language codes to country codes
 */
function getCountryFromLanguage(languageCode) {
  const languageToCountry = {
    en: 'us',
    es: 'es',
    fr: 'fr',
    de: 'de',
    it: 'it',
    pt: 'pt',
    zh: 'cn',
    ja: 'jp',
    ru: 'ru'
    // Add more mappings as needed
  };
  
  return languageToCountry[languageCode] || 'us';
}

module.exports = {
  searchWeb
};