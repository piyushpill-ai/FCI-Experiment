import express from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Papa from 'papaparse';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static files from the dist directory (built React app)
app.use(express.static(path.join(__dirname, 'dist')));

// CORS middleware for API routes
app.use('/api', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Load insurance data
let insuranceData = [];

async function loadInsuranceData() {
  try {
    const csvPath = path.join(__dirname, 'public', 'insurance-data.csv');
    const csvContent = await fs.readFile(csvPath, 'utf-8');
    
    return new Promise((resolve, reject) => {
      Papa.parse(csvContent, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          console.log(`✅ Loaded ${results.data.length} insurance products`);
          resolve(results.data);
        },
        error: (error) => {
          console.error('❌ Error parsing CSV:', error);
          reject(error);
        }
      });
    });
  } catch (error) {
    console.error('❌ Error loading insurance data:', error);
    return [];
  }
}

// Initialize data on startup
loadInsuranceData().then(data => {
  insuranceData = data;
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: 'production'
  });
});

// API documentation endpoint
app.get('/api', (req, res) => {
  res.json({
    message: 'FCI Experiment Insurance Comparison API',
    version: '1.0.0',
    endpoints: {
      'POST /api/insurance/compare': 'Compare insurance products',
      'POST /api/insurance/quick-quote': 'Get quick quote for specific product',
      'GET /api/insurance/product/:id': 'Get detailed product information',
      'POST /api/insurance/ai-agent': 'AI agent interface for insurance queries',
      'GET /health': 'Health check endpoint'
    },
    example_requests: {
      compare: {
        method: 'POST',
        url: '/api/insurance/compare',
        body: {
          state: 'NSW',
          ageGroup: '< 35 years',
          gender: 'Male',
          priority: 'Price',
          selectedFeatures: ['storm', 'windscreen']
        }
      }
    }
  });
});

// Insurance comparison endpoint
app.post('/api/insurance/compare', async (req, res) => {
  try {
    const { state, ageGroup, gender, priority = 'Price', selectedFeatures = [] } = req.body;

    // Validate required fields
    if (!state || !ageGroup || !gender) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: state, ageGroup, gender'
      });
    }

    // Simple filtering and processing (simplified for Heroku deployment)
    const filteredProducts = insuranceData
      .filter(product => product.NAME && product.PROVIDER_ID)
      .slice(0, 10)
      .map(product => ({
        id: product.ID || Math.random().toString(36).substr(2, 9),
        name: product.NAME,
        providerId: product.PROVIDER_ID,
        priceRating: Math.random() * 10, // Simplified for demo
        featureScore: Math.random() * 10,
        dynamicFinderScore: Math.random() * 10,
        features: {
          newCarReplacement: Math.random() > 0.5,
          roadsideAssistance: Math.random() > 0.5,
          storm: Math.random() > 0.5,
          windscreen: Math.random() > 0.5,
          accidentalDamage: Math.random() > 0.5
        }
      }));

    res.json({
      success: true,
      data: {
        products: filteredProducts,
        totalProducts: filteredProducts.length,
        criteria: { state, ageGroup, gender, priority }
      }
    });

  } catch (error) {
    console.error('❌ Error in compare endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// AI Agent endpoint
app.post('/api/insurance/ai-agent', async (req, res) => {
  try {
    const { query, context } = req.body;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Query is required'
      });
    }

    // Simple AI response for demo
    const response = {
      query,
      response: `Based on your query "${query}", I recommend comparing insurance products using our API. You can use the /api/insurance/compare endpoint with your specific criteria.`,
      suggestions: [
        'Use POST /api/insurance/compare to get personalized results',
        'Include your state, age group, and gender for accurate quotes',
        'Specify your priority: Price or Features'
      ],
      context
    };

    res.json({
      success: true,
      data: response
    });

  } catch (error) {
    console.error('❌ Error in AI agent endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Catch all handler: send back React app for any non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  res.status(err.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
  });
});

app.listen(PORT, () => {
  console.log(`🚀 FCI Experiment running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`📖 API docs: http://localhost:${PORT}/api`);
  console.log(`🌐 Frontend: http://localhost:${PORT}`);
  console.log(`🔗 Main API: http://localhost:${PORT}/api/insurance/compare`);
});

export default app;
