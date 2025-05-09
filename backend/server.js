// backend/server.js
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const dotenv = require('dotenv');
const { createProxyMiddleware } = require('http-proxy-middleware');

// Load environment variables
dotenv.config();

// Import routes
const chatRoutes = require('./src/routes/chatRoutes');
const searchRoutes = require('./src/routes/searchRoutes');

// Initialize express app
const app = express();
const server = http.createServer(app);

// WebSocket server for real-time chat
const wss = new WebSocket.Server({ server });

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/chat', chatRoutes);
app.use('/api/search', searchRoutes);

// WebSocket connection handling
wss.on('connection', (ws) => {
  console.log('Client connected');
  
  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      console.log('Received message:', data);
      // Handle different message types
      if (data.type === 'chat') {
        // Process the chat message through your LLM service
        const chatService = require('./src/services/chatServices');
        const response = await chatService.processMessage(data.message, data.language, data.location);
        
        ws.send(JSON.stringify({
          type: 'chat_response',
          data: response
        }));
      }
    } catch (error) {
      console.error('Error processing message:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Error processing your request'
      }));
    }
  });
  
  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = { app, server };