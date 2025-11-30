// Secure Backend Server for Portfolio Builder
// This server keeps API keys hidden from the client

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static('.')); // Serve static files from current directory

// API Keys stored securely in environment variables
const API_KEYS = {
    CODING: process.env.GEMINI_API_KEY_CODING,
    DESIGN: process.env.GEMINI_API_KEY_DESIGN,
    PLANNING: process.env.GEMINI_API_KEY_PLANNING,
    THEME: process.env.GEMINI_API_KEY_PLANNING // Using planning key for theme
};

// Validate that API keys are loaded
if (!API_KEYS.CODING || !API_KEYS.DESIGN || !API_KEYS.PLANNING) {
    console.error('❌ ERROR: API keys not found in environment variables!');
    console.error('Please create a .env file with your API keys.');
    process.exit(1);
}

console.log('✅ API keys loaded successfully from environment');

// Gemini API endpoint
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

// Secure proxy endpoint for Gemini API calls
app.post('/api/gemini', async (req, res) => {
    try {
        const { keyType, prompt, imageBase64 } = req.body;

        // Validate key type
        if (!keyType || !API_KEYS[keyType.toUpperCase()]) {
            return res.status(400).json({
                error: 'Invalid key type. Must be CODING, DESIGN, PLANNING, or THEME'
            });
        }

        // Get the appropriate API key
        const apiKey = API_KEYS[keyType.toUpperCase()];

        // Build request body
        const parts = [];

        if (prompt) {
            parts.push({ text: prompt });
        }

        if (imageBase64) {
            // Remove data URL prefix if present
            const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
            parts.push({
                inline_data: {
                    mime_type: 'image/jpeg',
                    data: base64Data
                }
            });
        }

        const requestBody = {
            contents: [{
                parts: parts
            }]
        };

        // Call Gemini API
        const response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('Gemini API Error:', data);
            return res.status(response.status).json({
                error: data.error?.message || 'Gemini API request failed'
            });
        }

        // Return the response
        res.json(data);

    } catch (error) {
        console.error('Server Error:', error);
        res.status(500).json({
            error: 'Internal server error: ' + error.message
        });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        message: 'Portfolio Builder API Server is running',
        keysLoaded: {
            coding: !!API_KEYS.CODING,
            design: !!API_KEYS.DESIGN,
            planning: !!API_KEYS.PLANNING
        }
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`
🚀 Portfolio Builder Server Running!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Local:   http://localhost:${PORT}
🔒 API Keys: Securely stored in .env
🛡️  Status:  Protected from exposure
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `);
});
