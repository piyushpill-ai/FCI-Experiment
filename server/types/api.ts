import { AustralianState, AgeGroup, Gender, Priority, SelectedFeature, ProcessedInsuranceProduct } from '../../src/types';

export interface CompareInsuranceRequest {
  state: AustralianState;
  ageGroup: AgeGroup;
  gender: Gender;
  priority: Priority;
  selectedFeatures?: SelectedFeature[];
}

export interface CompareInsuranceResponse {
  success: boolean;
  data?: {
    topPick: ProcessedInsuranceProduct;
    products: ProcessedInsuranceProduct[];
    totalFound: number;
    criteria: {
      state: AustralianState;
      ageGroup: AgeGroup;
      gender: Gender;
      priority: Priority;
      selectedFeatures: SelectedFeature[];
    };
    sponsoredProducts: {
      name: string;
      redirectUrl: string;
      dynamicFinderScore: number;
    }[];
    comparisonUrl?: string;
  };
  error?: string;
  message?: string;
}

export interface QuickQuoteRequest {
  state: AustralianState;
  ageGroup: AgeGroup;
  gender: Gender;
  priority?: Priority;
}

export interface QuickQuoteResponse {
  success: boolean;
  data?: {
    recommendedProducts: ProcessedInsuranceProduct[];
    averagePriceRating: number;
    averageFeatureScore: number;
    totalProducts: number;
  };
  error?: string;
}

export interface ProductDetailsRequest {
  productId: string;
  state: AustralianState;
  ageGroup: AgeGroup;
  gender: Gender;
}

export interface ProductDetailsResponse {
  success: boolean;
  data?: {
    product: ProcessedInsuranceProduct;
    alternatives: ProcessedInsuranceProduct[];
    redirectUrl?: string;
    isSponsored: boolean;
  };
  error?: string;
}

export interface AIAgentRequest {
  query: string;
  context?: {
    state?: AustralianState;
    ageGroup?: AgeGroup;
    gender?: Gender;
    priority?: Priority;
    budget?: string;
    requirements?: string[];
  };
}

export interface AIAgentResponse {
  success: boolean;
  data?: {
    intent: 'compare' | 'quote' | 'details' | 'help';
    extractedCriteria?: Partial<CompareInsuranceRequest>;
    recommendations?: ProcessedInsuranceProduct[];
    conversationalResponse: string;
    suggestedActions?: {
      action: string;
      url: string;
      description: string;
    }[];
  };
  error?: string;
} 