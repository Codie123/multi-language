// backend/src/services/chatService.js
const axios = require('axios');
const { languageDetection } = require('./languageService');
const { searchWeb } = require('./searchService');

class ChatService {
  constructor() {
    this.conversationHistory = [];
    this.apiKey = process.env.PERPLEXITY_KEY
    this.apiType = 'perplexity'
    // this.apiKey = process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY;
    // this.apiType = process.env.OPENAI_API_KEY ? 'openai' : 'anthropic';
    this.maxHistoryLength = 10;
  }

  /**
   * Process incoming message and generate a response
   */
  async processMessage(message, language = null, location = null) {
    try {
      // 1. Detect language if not provided
      const detectedLanguage = language || await languageDetection(message);
      
      // 2. Add user message to history
      this.addToHistory('user', message);
      
      // 3. Enhance the prompt with context
      const enhancedPrompt = this.buildPrompt(message, detectedLanguage, location);
      
      // 4. Check if web search is needed
      const needsSearch = this.checkIfNeedsSearch(message);
      let searchResults = null;
      
      if (needsSearch) {
        searchResults = await searchWeb(message, detectedLanguage);
        // Add search results to the prompt
        enhancedPrompt.push({
          role: 'system',
          content: `Web search results for "${message}": ${JSON.stringify(searchResults)}`
        });
      }
      
      // 5. Call LLM API based on configured provider
      const response = await this.callLLMApi(enhancedPrompt);
      
      // 6. Post-process the response (extract links, format, etc.)
      const processedResponse = this.postProcessResponse(response, searchResults);
      
      // 7. Add assistant response to history
      this.addToHistory('assistant', processedResponse.text);
      
      return processedResponse;
    } catch (error) {
      console.error('Error in chat service:', error);
      throw new Error('Failed to process message');
    }
  }

  /**
   * Build the prompt with full context
   */
  buildPrompt(message, language, location) {
    const prompt = [
      {
        role: 'system',
        content: `You are a helpful multilingual assistant. Respond in the same language as the user's query. Current language: ${language}.`
      }
    ];
    
    // Add location context if available
    if (location) {
      prompt.push({
        role: 'system',
        content: `The user's location is: ${location.latitude}, ${location.longitude}. This appears to be in or near: ${location.address || 'Unknown location'}.`
      });
    }
    
    // Add conversation history
    this.conversationHistory.forEach(item => {
      prompt.push({
        role: item.role,
        content: item.content
      });
    });
    
    // Add the current user message
    prompt.push({
      role: 'user',
      content: message
    });
    
    return prompt;
  }

  /**
   * Check if the message needs web search
   */
  checkIfNeedsSearch(message) {
    const searchIndicators = [
      'search', 'find', 'look up', 'what is', 'who is', 'where is',
      'how to', 'when did', 'why does', 'latest', 'news about',
      'information on', 'tell me about', 'search for'
    ];
    
    return searchIndicators.some(indicator => 
      message.toLowerCase().includes(indicator.toLowerCase())
    );
  }

  /**
   * Call the appropriate LLM API
   */
  async callLLMApi(prompt) {
    if (this.apiType === 'openai') {
      return this.callOpenAI(prompt);
    } else if(this.apiType === 'anthropic') { 
      return this.callAnthropic(prompt);
    }else if(this.apiType === 'perplexity') {
      return this.callPerplexity(prompt);
    }else if(this.apiType === 'qwen'){
      return this.callQwen(prompt);
    }else{
      return this.callSonar(prompt);
    }
  }

  /**
   * Call OpenAI API
   */
  async callOpenAI(prompt) {
    try {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-4o',
          messages: prompt,
          temperature: 0.7,
          max_tokens: 1000,
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      return response.data.choices[0].message.content;
    } catch (error) {
      console.error('OpenAI API error:', error.response?.data || error.message);
      throw new Error('Failed to get response from OpenAI');
    }
  }

  /**
   * Call Anthropic API
   */
  async callAnthropic(prompt) {
    try {
      // Convert from OpenAI format to Anthropic format
      const systemMessage = prompt.find(msg => msg.role === 'system')?.content || '';
      const userMessages = prompt.filter(msg => msg.role !== 'system');
      
      const messages = userMessages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));
      
      const response = await axios.post(
        'https://api.anthropic.com/v1/messages',
        {
          model: 'claude-3-opus-20240229',
          system: systemMessage,
          messages: messages,
          max_tokens: 1000,
        },
        {
          headers: {
            'x-api-key': process.env.ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json'
          }
        }
      );
      
      return response.data.content[0].text;
    } catch (error) {
      console.error('Anthropic API error:', error.response?.data || error.message);
      throw new Error('Failed to get response from Anthropic');
    }
  }
  // call perplexity API
  async callPerplexity(prompt) {
    try {
      const response = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model: 'perplexity/sonar-deep-research',
          messages: prompt,
          temperature: 0.7,
          max_tokens: 1000,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'HTTP-Referer': '<YOUR_SITE_URL>', // Optional. Replace with your site URL.
            'X-Title': '<YOUR_SITE_NAME>', // Optional. Replace with your site name.
            'Content-Type': 'application/json'
          }
        }
      );
      
      return response.data.choices[0].message.content;
    } catch (error) {
      console.error('Perplexity API error:', error.response?.data || error.message);
      throw new Error('Failed to get response from Perplexity');
    }
  }
  // sonar
  async callSonar(prompt) {
    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "HTTP-Referer": "<YOUR_SITE_URL>", // Optional. Replace with your site URL.
          "X-Title": "<YOUR_SITE_NAME>", // Optional. Replace with your site name.
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "perplexity/sonar",
          messages: prompt
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Sonar API error:', errorData);
        throw new Error('Failed to get response from Sonar');
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error('Sonar API error:', error.message);
      throw new Error('Failed to get response from Sonar');
    }
  }
  // qwen\
  async callQwen(prompt) {
    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "HTTP-Referer": "<YOUR_SITE_URL>", // Optional. Replace with your site URL.
          "X-Title": "<YOUR_SITE_NAME>", // Optional. Replace with your site name.
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "qwen/qwen3-0.6b-04-28:free",
          messages: prompt
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Qwen API error:', errorData);
        throw new Error('Failed to get response from Qwen');
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error('Qwen API error:', error.message);
      throw new Error('Failed to get response from Qwen');
    }
  }




  /**
   * Post-process the LLM response
   */
  postProcessResponse(response, searchResults) {
    // Extract URLs from the response
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const extractedUrls = response.match(urlRegex) || [];
    
    // Add search result links if available
    const links = [...extractedUrls];
    if (searchResults && searchResults.organic_results) {
      searchResults.organic_results.forEach(result => {
        if (result.link && !links.includes(result.link)) {
          links.push(result.link);
        }
      });
    }
    
    return {
      text: response,
      links: links
    };
  }

  /**
   * Add message to conversation history
   */
  addToHistory(role, content) {
    this.conversationHistory.push({ role, content });
    
    // Keep history within the max length
    if (this.conversationHistory.length > this.maxHistoryLength * 2) {
      this.conversationHistory = this.conversationHistory.slice(-this.maxHistoryLength * 2);
    }
  }
}

module.exports = new ChatService();