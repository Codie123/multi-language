// backend/src/routes/searchRoutes.js
const express = require('express');
const router = express.Router();
const { searchWeb } = require('../services/searchService');

// GET endpoint for web search
router.get('/', async (req, res) => {
  try {
    const { query, language } = req.query;
    
    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }
    
    const results = await searchWeb(query, language || 'en');
    res.json(results);
  } catch (error) {
    console.error('Error in search route:', error);
    res.status(500).json({ 
      error: 'Failed to perform search',
      details: error.message
    });
  }
});

module.exports = router;