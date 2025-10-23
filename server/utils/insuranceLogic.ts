import { promises as fs } from 'fs';
import path from 'path';
import Papa from 'papaparse';
import { AustralianState, AgeGroup, Gender, Priority, SelectedFeature, InsuranceProduct, ProcessedInsuranceProduct } from '../../src/types/index.js';

// Import the existing logic from the frontend
let cachedInsuranceData: InsuranceProduct[] | null = null;

export async function loadInsuranceDataServer(): Promise<InsuranceProduct[]> {
  if (cachedInsuranceData) {
    return cachedInsuranceData;
  }

  try {
    const csvPath = path.join(process.cwd(), 'public', 'insurance-data.csv');
    const csvContent = await fs.readFile(csvPath, 'utf-8');
    
    const parseResult = Papa.parse<InsuranceProduct>(csvContent, {
      header: true,
      skipEmptyLines: true,
      transform: (value: string, field: string) => {
        // Handle boolean fields
        if (['STORM_COVERAGE', 'WINDSCREEN_COVERAGE', 'PERSONAL_EFFECTS_COVERAGE', 
             'ACCIDENTAL_DAMAGE_COVERAGE', 'NEW_CAR_REPLACEMENT'].includes(field)) {
          return value.toLowerCase() === 'true' || value === '1' || value === 'yes';
        }
        return value;
      }
    });

    if (parseResult.errors.length > 0) {
      console.error('CSV parsing errors:', parseResult.errors);
      throw new Error('Failed to parse insurance data');
    }

    cachedInsuranceData = parseResult.data;
    return cachedInsuranceData;
  } catch (error) {
    console.error('Error loading insurance data:', error);
    throw new Error('Failed to load insurance data');
  }
}

// Price column mapping (reused from frontend)
function getPriceColumnKey(state: AustralianState, gender: Gender, ageGroup: AgeGroup): string {
  // Map age groups to the column suffixes
  const ageMap: Record<AgeGroup, string> = {
    '< 25 years': '20',
    '< 35 years': '30',
    '< 65 years': '60',
  };
  
  // Map gender to column prefix
  const genderMap: Record<Gender, string> = {
    'Male': 'M',
    'Female': 'F',
    'Other': 'F', // Default to Female for 'Other'
  };
  
  return `2025-AUFCI-${state}-${genderMap[gender]}-${ageMap[ageGroup]}`;
}

// Feature score calculation (simplified version of frontend logic)
function calculateFeatureScore(product: InsuranceProduct, selectedFeatures: SelectedFeature[] = []): number {
  // Convert string values to boolean/numeric as per frontend logic
  const stormValue = product.STORM.toLowerCase() === 'yes';
  const windscreenValue = product.WINDSCREEN.toLowerCase() === 'yes';
  const personalEffectsValue = parseFloat(product.PERSONAL_EFFECTS) || 0;
  const accidentalDamageValue = product.ACCIDENTAL_DAMAGE.toLowerCase() === 'yes';
  const newCarReplacementValue = product.NEW_CAR_REPLACEMENT.toLowerCase() === 'yes';

  // Simplified scoring (using fixed scores like the previous version but with correct data)
  const features = {
    STORM: stormValue ? 9.0 : 1.0,
    WINDSCREEN: windscreenValue ? 8.5 : 1.0,
    PERSONAL_EFFECTS: personalEffectsValue > 0 ? (4.0 + personalEffectsValue / 10000) : 1.0, // Scale based on amount
    ACCIDENTAL_DAMAGE: accidentalDamageValue ? 9.5 : 1.0,
    NEW_CAR_REPLACEMENT: newCarReplacementValue ? 9.8 : 1.0
  };

  if (selectedFeatures.length === 0) {
    // Equal weighting
    return Object.values(features).reduce((sum, score) => sum + score, 0) / 5;
  }

  let totalWeight = 0;
  let weightedSum = 0;

  const weights = calculateFeatureWeights(selectedFeatures);
  
  Object.entries(features).forEach(([feature, score]) => {
    const weight = weights[feature as SelectedFeature] || 0;
    weightedSum += score * weight;
    totalWeight += weight;
  });

  return totalWeight > 0 ? weightedSum / totalWeight : 0;
}

function calculateFeatureWeights(selectedFeatures: SelectedFeature[]): Record<SelectedFeature, number> {
  const allFeatures: SelectedFeature[] = ['STORM', 'WINDSCREEN', 'PERSONAL_EFFECTS', 'ACCIDENTAL_DAMAGE', 'NEW_CAR_REPLACEMENT'];
  const weights: Record<SelectedFeature, number> = {} as Record<SelectedFeature, number>;

  if (selectedFeatures.length === 0) {
    allFeatures.forEach(feature => weights[feature] = 0.2);
    return weights;
  }

  const selectedWeight = selectedFeatures.length === 1 ? 0.6 :
                        selectedFeatures.length === 2 ? 0.4 :
                        selectedFeatures.length === 3 ? 0.3 :
                        selectedFeatures.length === 4 ? 0.25 : 0.2;

  const remainingWeight = Math.max(0, 1 - (selectedFeatures.length * selectedWeight));
  const nonSelectedCount = allFeatures.length - selectedFeatures.length;
  const nonSelectedWeight = nonSelectedCount > 0 ? remainingWeight / nonSelectedCount : 0;

  allFeatures.forEach(feature => {
    weights[feature] = selectedFeatures.includes(feature) ? selectedWeight : nonSelectedWeight;
  });

  return weights;
}

// Process insurance product (simplified version of frontend logic)
export function processInsuranceProductServer(
  product: InsuranceProduct,
  state: AustralianState,
  gender: Gender,
  ageGroup: AgeGroup,
  priceRatingMap: Map<number, number>,
  selectedFeatures: SelectedFeature[] = [],
  userPriority: Priority = 'Price'
): ProcessedInsuranceProduct {
  const priceKey = getPriceColumnKey(state, gender, ageGroup);
  const price = parseFloat(product[priceKey as keyof InsuranceProduct] as string) || 0;
  const priceRating = priceRatingMap.get(price) || 1.0;
  
  const averageFeatureScore = calculateFeatureScore(product, selectedFeatures);
  
  // Dynamic Finder Score calculation
  const dynamicFinderScore = userPriority === 'Price' 
    ? (priceRating * 0.85) + (averageFeatureScore * 0.15)
    : (averageFeatureScore * 0.85) + (priceRating * 0.15);

  return {
    id: product.ID,
    name: product.NAME,
    providerId: product.PROVIDER_ID,
    price: price,
    priceRating,
    priceScore: parseFloat(product.PRICE_SCORE) || 0,
    coverScore: parseFloat(product.COVER_SCORE) || 0,
    finderScore: parseFloat(product.FINDER_SCORE) || 0,
    averageFeatureScore,
    dynamicFinderScore,
    features: {
      agreedOrMarketValue: product.AGREED_OR_MARKET_VALUE,
      choiceOfRepairer: product.CHOICE_OF_REPAIRER.toLowerCase() === 'yes',
      lifetimeGuarantee: product.LIFETIME_GUARANTEE_ON_REPAIRS.toLowerCase() === 'yes',
      newCarReplacement: product.NEW_CAR_REPLACEMENT.toLowerCase() === 'yes',
      newCarReplacementDetails: product.NEWCAR_REPLACEMENT_DETAILS,
      personalEffects: product.PERSONAL_EFFECTS,
      personalEffectsDetails: product.PERSONALEFFECTS_DETAILS,
      roadsideAssistance: product.ROADSIDE_ASSISTANCE.toLowerCase() === 'yes',
      roadsideAssistanceCost: product.ROADSIDE_ASSISTANCE_COST,
      storm: product.STORM.toLowerCase() === 'yes',
      towing: product.TOWING.toLowerCase() === 'yes',
      keyReplacement: product.KEY_REPLACEMENT,
      keyReplacementDetails: product.KEYREPLACEMENT_DETAILS,
      childSeatReplacement: product.CHILD_SEAT_BABY_CAPSULES.toLowerCase() === 'yes',
      childSeatDetails: product.CHILD_SEAT_BABY_CAPSULES_DETAILS,
      emergencyTransport: product.EMERGENCY_TRANSPORT_AND_ACCOMMODATION.toLowerCase() === 'yes',
      emergencyTransportDetails: product.EMERGENCY_TRANSPORT_ACCOMMODATION_DETAILS,
      essentialRepairs: product.ESSENTIAL_EMERGENCY_REPAIRS,
      essentialRepairsDetails: product.ESSENTIAL_EMERGENCY_REPAIR_DETAILS,
      hireCarAfterAccident: product.HIRE_CAR_AFTER_ACCIDENT,
      restrictedDriverOption: product.RESTRICTED_DRIVER_OPTION,
      noExcessWindscreen: product.NO_EXCESS_WINDSCREEN.toLowerCase() === 'yes',
      windscreen: product.WINDSCREEN.toLowerCase() === 'yes',
      payMonthly: product.PAY_MONTHLY_YES.toLowerCase() === 'yes',
      reducedExcessWindscreen: product.REDUCED_EXCESS_WINDSCREEN,
      accidentalDamage: product.ACCIDENTAL_DAMAGE.toLowerCase() === 'yes',
    },
    // Feature sub-scores for detailed analysis
    stormCoverageScore: product.STORM.toLowerCase() === 'yes' ? 9.0 : 1.0,
    windscreenCoverageScore: product.WINDSCREEN.toLowerCase() === 'yes' ? 8.5 : 1.0,
    personalEffectsCoverageScore: parseFloat(product.PERSONAL_EFFECTS) > 0 ? 8.0 : 1.0,
    accidentalDamageCoverageScore: product.ACCIDENTAL_DAMAGE.toLowerCase() === 'yes' ? 9.5 : 1.0,
    newCarReplacementScore: product.NEW_CAR_REPLACEMENT.toLowerCase() === 'yes' ? 9.8 : 1.0
  };
}

// Main function to get filtered and sorted products (replicates frontend logic)
export async function getFilteredAndSortedProductsServer(
  state: AustralianState,
  gender: Gender,
  ageGroup: AgeGroup,
  sortBy: 'priceRating' | 'finderScore' = 'finderScore',
  selectedFeatures: SelectedFeature[] = [],
  userPriority: Priority = 'Price'
): Promise<ProcessedInsuranceProduct[]> {
  const products = await loadInsuranceDataServer();
  
  // Get price column and collect all valid prices for rating calculation
  const priceKey = getPriceColumnKey(state, gender, ageGroup);
  const allPrices = products
    .map(product => parseFloat(product[priceKey as keyof InsuranceProduct] as string) || 0)
    .filter(price => price > 0)
    .sort((a, b) => a - b);

  // Create price rating map (1.0 to 9.9 scale)
  const priceRatingMap = new Map<number, number>();
  allPrices.forEach((price, index) => {
    const rating = 1.0 + (8.9 * (allPrices.length - 1 - index)) / (allPrices.length - 1);
    priceRatingMap.set(price, rating);
  });

  // Process all products
  const processedProducts = products
    .map(product => processInsuranceProductServer(
      product, state, gender, ageGroup, priceRatingMap, selectedFeatures, userPriority
    ))
    .filter(product => product.priceRating > 0); // Filter out products with no valid price

  // Sort products
  const sortKey = sortBy === 'priceRating' ? 'priceRating' : 'dynamicFinderScore';
  const sorted = processedProducts.sort((a, b) => b[sortKey] - a[sortKey]);

  return sorted;
}

// Sponsored products helper
export const sponsoredProducts = [
  'Coles Comprehensive',
  'Qantas Comprehensive', 
  'Bingle Comprehensive',
  'Huddle Comprehensive',
  'Kogan Comprehensive'
];

export function isSponsoredProduct(productName: string): boolean {
  return sponsoredProducts.includes(productName);
}

export function getProviderUrls(): Record<string, string> {
  return {
    'Coles Comprehensive': 'https://www.coles.com.au/insurance',
    'Qantas Comprehensive': 'https://www.qantas.com/insurance',
    'Bingle Comprehensive': 'https://www.bingle.com.au',
    'Huddle Comprehensive': 'https://www.huddle.com.au',
    'Kogan Comprehensive': 'https://www.kogan.com/insurance'
  };
} 