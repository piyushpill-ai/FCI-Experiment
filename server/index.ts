import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import insuranceRoutes from './routes/insurance.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-domain.com'] // Replace with your actual domain
    : ['http://localhost:5173', 'http://localhost:5174'], // Vite dev server
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API documentation endpoint
app.get('/api', (_req, res) => {
  res.json({
    name: 'Car Insurance Comparison API',
    version: '1.0.0',
    description: 'API for comparing car insurance products and getting quotes',
    endpoints: {
      'POST /api/insurance/compare': {
        description: 'Compare insurance products based on user criteria',
        parameters: {
          state: 'AustralianState (NSW|VIC|QLD|SA|WA|TAS)',
          ageGroup: 'AgeGroup (< 25 years|< 35 years|< 65 years)',
          gender: 'Gender (Male|Female|Other)',
          priority: 'Priority (Price|Features)',
          selectedFeatures: 'SelectedFeature[] (optional)'
        }
      },
      'POST /api/insurance/quick-quote': {
        description: 'Get a quick insurance quote',
        parameters: {
          state: 'AustralianState',
          ageGroup: 'AgeGroup', 
          gender: 'Gender',
          priority: 'Priority (optional, defaults to Price)'
        }
      },
      'GET /api/insurance/product/:id': {
        description: 'Get details for a specific insurance product',
        parameters: {
          id: 'Product ID (path parameter)',
          state: 'AustralianState (query parameter)',
          ageGroup: 'AgeGroup (query parameter)',
          gender: 'Gender (query parameter)'
        }
      },
      'POST /api/insurance/ai-agent': {
        description: 'AI agent endpoint for natural language queries',
        parameters: {
          query: 'string (natural language query)',
          context: 'object (optional context with user preferences)'
        }
      }
    },
    examples: {
      compare: {
        url: 'POST /api/insurance/compare',
        body: {
          state: 'NSW',
          ageGroup: '< 35 years',
          gender: 'Male',
          priority: 'Price',
          selectedFeatures: ['STORM', 'WINDSCREEN']
        }
      },
      quickQuote: {
        url: 'POST /api/insurance/quick-quote',
        body: {
          state: 'VIC',
          ageGroup: '< 25 years',
          gender: 'Female'
        }
      },
      aiAgent: {
        url: 'POST /api/insurance/ai-agent',
        body: {
          query: 'Find me the cheapest car insurance in NSW',
          context: {
            state: 'NSW',
            ageGroup: '< 35 years',
            gender: 'Male',
            priority: 'Price'
          }
        }
      }
    }
  });
});

// API routes
app.use('/api/insurance', insuranceRoutes);

// Catch-all for unknown routes
app.use('*', (_req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    availableEndpoints: [
      'GET /health',
      'GET /api',
      'POST /api/insurance/compare',
      'POST /api/insurance/quick-quote',
      'GET /api/insurance/product/:id',
      'POST /api/insurance/ai-agent'
    ]
  });
});

// Global error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Global error handler:', err);
  
  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  res.status(err.status || 500).json({
    success: false,
    error: isDevelopment ? err.message : 'Internal server error',
    ...(isDevelopment && { stack: err.stack })
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Insurance API server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`📖 API docs: http://localhost:${PORT}/api`);
  console.log(`🔗 Main endpoint: http://localhost:${PORT}/api/insurance/compare`);
  
  if (process.env.NODE_ENV !== 'production') {
    console.log(`🎯 Test the API with:`);
    console.log(`   curl -X POST http://localhost:${PORT}/api/insurance/quick-quote \\`);
    console.log(`   -H "Content-Type: application/json" \\`);
    console.log(`   -d '{"state":"NSW","ageGroup":"< 35 years","gender":"Male"}'`);
  }
});

export default app; 