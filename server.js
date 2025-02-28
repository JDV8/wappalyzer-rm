const express = require('express');
const cors = require('cors');
const Wappalyzer = require('./driver');
const app = express();
const port = process.env.PORT || 3000;

// Middleware to parse JSON requests
app.use(express.json());

// CORS middleware with domain restriction
const allowedOrigins = [
  'https://yourdomain.com',  // Your main domain
  'https://www.yourdomain.com' // Add any subdomains
];

// Configure CORS middleware
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  methods: ['POST'], // Only allow POST requests
  credentials: true
}));

// Add API key validation middleware
const API_KEY = process.env.API_KEY || 'your-secret-api-key';
const validateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== API_KEY) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  next();
};

// Create the analyze endpoint
app.post('/analyze', validateApiKey, async (req, res) => {
  try {
    const { url, options = {} } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    console.log(`Analyzing: ${url}`);

    // Set up Wappalyzer with default or user-provided options
    const wappalyzer = new Wappalyzer({
      debug: false,
      delay: 500,
      maxUrls: 1,
      maxWait: 10000,
      recursive: false,
      ...options
    });

    await wappalyzer.init();
    const site = await wappalyzer.open(url);
    const results = await site.analyze();
    await wappalyzer.destroy();

    res.json(results);
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({
      error: 'Analysis failed',
      message: error.message || String(error)
    });
  }
});

// Add health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Start the server
app.listen(port, () => {
  console.log(`Wappalyzer API server running on port ${port}`);
});
