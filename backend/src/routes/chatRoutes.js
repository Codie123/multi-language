// backend/src/routes/chatRoutes.js
const express = require('express');
const router = express.Router();
const chatService = require('../services/chatServices');

// POST endpoint for chat messages
router.post('/', async (req, res) => {
  try {
    const { message, language, location } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    const response = await chatService.processMessage(message, language, location);
    res.json(response);
  } catch (error) {
    console.error('Error in chat route:', error);
    res.status(500).json({ 
      error: 'Failed to process chat message',
      details: error.message
    });
  }
});

// GET endpoint for conversation history
router.get('/history', (req, res) => {
  try {
    res.json(chatService.conversationHistory);
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ error: 'Failed to fetch conversation history' });
  }
});

// DELETE endpoint to clear conversation history
router.delete('/history', (req, res) => {
  try {
    chatService.conversationHistory = [];
    res.json({ message: 'Conversation history cleared' });
  } catch (error) {
    console.error('Error clearing history:', error);
    res.status(500).json({ error: 'Failed to clear conversation history' });
  }
});

module.exports = router;