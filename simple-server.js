import http from 'http';
import url from 'url';

// Mock insurance data for demonstration
const mockInsuranceData = [
  {
    name: "Bingle Comprehensive",
    provider: "Bingle", 
    priceRating: 9.5,
    featureScore: 7.8,
    dynamicFinderScore: 8.9,
    estimatedPrice: "$850/year",
    keyFeatures: ["Storm Coverage", "Windscreen Repair"],
    isSponsored: true,
    redirectUrl: "https://www.bingle.com.au"
  },
  {
    name: "Kogan Comprehensive",
    provider: "Kogan",
    priceRating: 9.2,
    featureScore: 8.1, 
    dynamicFinderScore: 8.7,
    estimatedPrice: "$920/year",
    keyFeatures: ["Storm Coverage", "New Car Replacement"],
    isSponsored: true,
    redirectUrl: "https://www.kogan.com/insurance"
  },
  {
    name: "Budget Direct Comprehensive",
    provider: "Budget Direct",
    priceRating: 9.7,
    featureScore: 7.2,
    dynamicFinderScore: 8.1,
    estimatedPrice: "$780/year", 
    keyFeatures: ["Basic Coverage", "Windscreen Repair"],
    isSponsored: false,
    redirectUrl: null
  }
];

const server = http.createServer((req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;

  // Health check endpoint
  if (path === '/health' && req.method === 'GET') {
    res.writeHead(200);
    res.end(JSON.stringify({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    }));
    return;
  }

  // API documentation endpoint  
  if (path === '/api' && req.method === 'GET') {
    res.writeHead(200);
    res.end(JSON.stringify({
      name: 'Car Insurance Comparison API',
      version: '1.0.0',
      description: 'API for comparing car insurance products',
      endpoints: {
        'POST /api/insurance/compare': 'Compare insurance products',
        'GET /health': 'Health check',
        'GET /api': 'API documentation'
      },
      exampleUsage: {
        url: 'POST /api/insurance/compare',
        body: {
          state: 'NSW',
          ageGroup: '< 35 years',
          gender: 'Male', 
          priority: 'Price'
        }
      }
    }));
    return;
  }

  // Main compare endpoint
  if (path === '/api/insurance/compare' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        const requestData = JSON.parse(body);
        
        // Validate required fields
        if (!requestData.state || !requestData.ageGroup || !requestData.gender || !requestData.priority) {
          res.writeHead(400);
          res.end(JSON.stringify({
            success: false,
            error: 'Missing required fields: state, ageGroup, gender, priority'
          }));
          return;
        }

        // Sort by priority (Price = highest priceRating first)
        const sortedProducts = [...mockInsuranceData].sort((a, b) => {
          if (requestData.priority === 'Price') {
            return b.priceRating - a.priceRating;
          } else {
            return b.dynamicFinderScore - a.dynamicFinderScore;
          }
        });

        const topPick = sortedProducts[0];
        const sponsoredProducts = sortedProducts
          .filter(product => product.isSponsored)
          .map(product => ({
            name: product.name,
            redirectUrl: product.redirectUrl,
            dynamicFinderScore: product.dynamicFinderScore
          }));

        const response = {
          success: true,
          data: {
            topPick,
            products: sortedProducts.slice(0, 5),
            totalFound: sortedProducts.length,
            criteria: {
              state: requestData.state,
              ageGroup: requestData.ageGroup,
              gender: requestData.gender,
              priority: requestData.priority,
              selectedFeatures: requestData.selectedFeatures || []
            },
            sponsoredProducts,
            comparisonUrl: `/compare?state=${requestData.state}&age=${requestData.ageGroup}&gender=${requestData.gender}&priority=${requestData.priority}`
          }
        };

        res.writeHead(200);
        res.end(JSON.stringify(response));
      } catch (error) {
        res.writeHead(500);
        res.end(JSON.stringify({
          success: false,
          error: 'Invalid JSON or server error'
        }));
      }
    });
    return;
  }

  // 404 for unknown routes
  res.writeHead(404);
  res.end(JSON.stringify({
    success: false,
    error: 'Endpoint not found',
    availableEndpoints: [
      'GET /health',
      'GET /api', 
      'POST /api/insurance/compare'
    ]
  }));
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Insurance API server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`📖 API docs: http://localhost:${PORT}/api`);
  console.log(`🔗 Main endpoint: http://localhost:${PORT}/api/insurance/compare`);
  console.log(`🎯 Test with: curl -X POST http://localhost:${PORT}/api/insurance/compare -H "Content-Type: application/json" -d '{"state":"NSW","ageGroup":"< 35 years","gender":"Male","priority":"Price"}'`);
}); 