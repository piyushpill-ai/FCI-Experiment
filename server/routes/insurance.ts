import express from 'express';
import rateLimit from 'express-rate-limit';
import { AustralianState, AgeGroup, Gender } from '../../src/types/index.js';
import { 
  CompareInsuranceRequest, 
  CompareInsuranceResponse, 
  QuickQuoteRequest, 
  QuickQuoteResponse,
  ProductDetailsResponse,
  AIAgentRequest,
  AIAgentResponse
} from '../types/api.js';
import { 
  getFilteredAndSortedProductsServer, 
  isSponsoredProduct, 
  getProviderUrls 
} from '../utils/insuranceLogic.js';

const router = express.Router();

// Rate limiting for API endpoints
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

router.use(limiter);

// POST /api/insurance/compare
// Main endpoint for insurance comparison
router.post('/compare', async (req, res) => {
  try {
    const request: CompareInsuranceRequest = req.body;
    
    // Validate required fields
    if (!request.state || !request.ageGroup || !request.gender || !request.priority) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: state, ageGroup, gender, priority'
      });
    }

    // Get comparison results
    const sortBy = request.priority === 'Price' ? 'priceRating' : 'finderScore';
    const selectedFeatures = request.selectedFeatures || [];
    
    const products = await getFilteredAndSortedProductsServer(
      request.state,
      request.gender,
      request.ageGroup,
      sortBy,
      selectedFeatures,
      request.priority
    );

    // Get top pick
    const topPick = products[0];
    
    // Get sponsored products with redirect URLs
    const providerUrls = getProviderUrls();
    const sponsoredProducts = products
      .filter(product => isSponsoredProduct(product.name))
      .map(product => ({
        name: product.name,
        redirectUrl: providerUrls[product.name] || '#',
        dynamicFinderScore: product.dynamicFinderScore
      }));

    // Create comparison URL for easy sharing
    const comparisonParams = new URLSearchParams({
      state: request.state,
      age: request.ageGroup,
      gender: request.gender,
      priority: request.priority,
      features: selectedFeatures.join(',')
    });
    const comparisonUrl = `/compare?${comparisonParams.toString()}`;

    const response: CompareInsuranceResponse = {
      success: true,
      data: {
        topPick,
        products: products.slice(0, 10), // Return top 10
        totalFound: products.length,
        criteria: {
          state: request.state,
          ageGroup: request.ageGroup,
          gender: request.gender,
          priority: request.priority,
          selectedFeatures
        },
        sponsoredProducts,
        comparisonUrl
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Error in /compare endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while comparing insurance products'
    });
  }
});

// POST /api/insurance/quick-quote
// Simplified endpoint for quick quotes
router.post('/quick-quote', async (req, res) => {
  try {
    const request: QuickQuoteRequest = req.body;
    
    if (!request.state || !request.ageGroup || !request.gender) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: state, ageGroup, gender'
      });
    }

    const priority = request.priority || 'Price';
    const products = await getFilteredAndSortedProductsServer(
      request.state,
      request.gender,
      request.ageGroup,
      priority === 'Price' ? 'priceRating' : 'finderScore',
      [],
      priority
    );

    // Calculate averages
    const averagePriceRating = products.reduce((sum, p) => sum + p.priceRating, 0) / products.length;
    const averageFeatureScore = products.reduce((sum, p) => sum + p.averageFeatureScore, 0) / products.length;

    const response: QuickQuoteResponse = {
      success: true,
      data: {
        recommendedProducts: products.slice(0, 5),
        averagePriceRating,
        averageFeatureScore,
        totalProducts: products.length
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Error in /quick-quote endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while generating quick quote'
    });
  }
});

// GET /api/insurance/product/:id
// Get details for a specific product
router.get('/product/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { state, ageGroup, gender } = req.query;

    if (!state || !ageGroup || !gender) {
      return res.status(400).json({
        success: false,
        error: 'Missing required query parameters: state, ageGroup, gender'
      });
    }

    const products = await getFilteredAndSortedProductsServer(
      state as AustralianState,
      gender as Gender,
      ageGroup as AgeGroup
    );

    const product = products.find(p => p.id === id);
    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    // Get alternatives (other top products excluding this one)
    const alternatives = products
      .filter(p => p.id !== id)
      .slice(0, 3);

    const providerUrls = getProviderUrls();
    const isSponsored = isSponsoredProduct(product.name);

    const response: ProductDetailsResponse = {
      success: true,
      data: {
        product,
        alternatives,
        redirectUrl: isSponsored ? providerUrls[product.name] : undefined,
        isSponsored
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Error in /product endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while fetching product details'
    });
  }
});

// POST /api/insurance/ai-agent
// Endpoint for AI agent interactions
router.post('/ai-agent', async (req, res) => {
  try {
    const request: AIAgentRequest = req.body;
    
    if (!request.query) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: query'
      });
    }

    // Simple intent detection (in a real app, you'd use NLP)
    const query = request.query.toLowerCase();
    let intent: 'compare' | 'quote' | 'details' | 'help' = 'help';
    let extractedCriteria: Partial<CompareInsuranceRequest> = {};
    let conversationalResponse = '';
    let recommendations: any[] = [];

    if (query.includes('compare') || query.includes('find') || query.includes('best')) {
      intent = 'compare';
      
      // Extract criteria from context or query
      const context = request.context || {};
      extractedCriteria = {
        state: context.state,
        ageGroup: context.ageGroup,
        gender: context.gender,
        priority: context.priority || 'Price'
      };

      // If we have enough info, get recommendations
      if (extractedCriteria.state && extractedCriteria.ageGroup && extractedCriteria.gender) {
        const products = await getFilteredAndSortedProductsServer(
          extractedCriteria.state,
          extractedCriteria.gender,
          extractedCriteria.ageGroup,
          extractedCriteria.priority === 'Features' ? 'finderScore' : 'priceRating',
          [],
          extractedCriteria.priority
        );
        
        recommendations = products.slice(0, 3);
        conversationalResponse = `Based on your criteria (${extractedCriteria.state}, ${extractedCriteria.ageGroup}, ${extractedCriteria.gender}), I found ${products.length} insurance options. Here are the top 3 recommendations sorted by ${extractedCriteria.priority === 'Features' ? 'features' : 'price'}.`;
      } else {
        conversationalResponse = 'I can help you compare car insurance! To get started, I need to know your state, age group, and gender. What state are you in?';
      }
    } else if (query.includes('quote') || query.includes('price')) {
      intent = 'quote';
      conversationalResponse = 'I can help you get a quick insurance quote! Please tell me your state, age group, and gender, and I\'ll show you some pricing estimates.';
    } else {
      conversationalResponse = 'I can help you compare car insurance products, get quotes, or find specific product details. Try asking something like "Compare car insurance for NSW" or "Find the cheapest car insurance for me".';
    }

    const response: AIAgentResponse = {
      success: true,
      data: {
        intent,
        extractedCriteria,
        recommendations,
        conversationalResponse,
        suggestedActions: [
          {
            action: 'Compare Products',
            url: '/api/insurance/compare',
            description: 'Get a full comparison of insurance products'
          },
          {
            action: 'Quick Quote',
            url: '/api/insurance/quick-quote',
            description: 'Get a quick price estimate'
          }
        ]
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Error in /ai-agent endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while processing AI request'
    });
  }
});

export default router; 