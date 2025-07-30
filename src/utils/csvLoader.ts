import Papa from 'papaparse';
import { InsuranceProduct, ProcessedInsuranceProduct, AustralianState, Gender, AgeGroup, SelectedFeature } from '../types';

export const loadInsuranceData = async (): Promise<InsuranceProduct[]> => {
  try {
    const response = await fetch('/insurance-data.csv');
    const csvText = await response.text();
    
    const result = Papa.parse<InsuranceProduct>(csvText, {
      header: true,
      skipEmptyLines: true,
    });
    
    return result.data.filter(product => product.ACTIVE === 'TRUE');
  } catch (error) {
    console.error('Error loading insurance data:', error);
    return [];
  }
};

export const getPriceColumnKey = (state: AustralianState, gender: Gender, ageGroup: AgeGroup): string => {
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
};

// Convert actual prices to a rating scale from 1.0 to 9.9
// Lower prices get higher ratings (inverse relationship)
export const convertPriceToRating = (prices: number[]): Map<number, number> => {
  const validPrices = prices.filter(price => price > 0);
  if (validPrices.length === 0) return new Map();
  
  const minPrice = Math.min(...validPrices);
  const maxPrice = Math.max(...validPrices);
  const priceRange = maxPrice - minPrice;
  
  const ratingMap = new Map<number, number>();
  
  validPrices.forEach(price => {
    // Normalize price to 0-1 range
    const normalizedPrice = priceRange === 0 ? 0 : (price - minPrice) / priceRange;
    
    // Invert the scale (lower price = higher rating) and map to 1.0-9.9 range
    const rating = 9.9 - (normalizedPrice * 8.9);
    ratingMap.set(price, Math.round(rating * 10) / 10); // Round to 1 decimal place
  });
  
  return ratingMap;
};

// Convert numeric values to a rating scale from 1.0 to 9.9
// Higher numeric values get higher ratings (direct relationship)
export const convertNumericToRating = (values: number[]): Map<number, number> => {
  const validValues = values.filter(value => value > 0);
  if (validValues.length === 0) return new Map();
  
  const minValue = Math.min(...validValues);
  const maxValue = Math.max(...validValues);
  const valueRange = maxValue - minValue;
  
  const ratingMap = new Map<number, number>();
  
  validValues.forEach(value => {
    // Normalize value to 0-1 range
    const normalizedValue = valueRange === 0 ? 1 : (value - minValue) / valueRange;
    
    // Map to 1.0-9.9 range (higher value = higher rating)
    const rating = 1.0 + (normalizedValue * 8.9);
    ratingMap.set(value, Math.round(rating * 10) / 10); // Round to 1 decimal place
  });
  
  return ratingMap;
};

// Calculate feature sub-scores
export const calculateFeatureScores = (products: InsuranceProduct[]): {
  stormScoreMap: Map<boolean, number>;
  windscreenScoreMap: Map<boolean, number>;
  personalEffectsScoreMap: Map<number, number>;
  accidentalDamageScoreMap: Map<boolean, number>;
  newCarReplacementScoreMap: Map<boolean, number>;
} => {
  // For boolean features: True = 10, False = 0
  const stormScoreMap = new Map<boolean, number>([[true, 10], [false, 0]]);
  const windscreenScoreMap = new Map<boolean, number>([[true, 10], [false, 0]]);
  const accidentalDamageScoreMap = new Map<boolean, number>([[true, 10], [false, 0]]);
  const newCarReplacementScoreMap = new Map<boolean, number>([[true, 10], [false, 0]]);
  
  // For personal effects (numeric): rank 1.0 to 9.9 based on amount
  const personalEffectsValues = products
    .map(product => parseFloat(product.PERSONAL_EFFECTS) || 0)
    .filter(value => value > 0);
  
  const personalEffectsScoreMap = convertNumericToRating(personalEffectsValues);
  // Add zero values
  personalEffectsScoreMap.set(0, 0);
  
  return {
    stormScoreMap,
    windscreenScoreMap,
    personalEffectsScoreMap,
    accidentalDamageScoreMap,
    newCarReplacementScoreMap,
  };
};

// Calculate weighted feature score based on selected features
export const calculateWeightedFeatureScore = (
  stormScore: number,
  windscreenScore: number,
  personalEffectsScore: number,
  accidentalDamageScore: number,
  newCarReplacementScore: number,
  selectedFeatures: SelectedFeature[]
): number => {
  // If no features selected, use equal weighting (20% each)
  if (selectedFeatures.length === 0) {
    return (stormScore + windscreenScore + personalEffectsScore + accidentalDamageScore + newCarReplacementScore) / 5;
  }

  // Define the weighting logic based on number of selected features
  let selectedWeight: number;
  let remainingWeight: number;
  let remainingCount: number;
  
  switch (selectedFeatures.length) {
    case 1:
      selectedWeight = 0.6; // 60% for selected
      remainingWeight = 0.4; // 40% for remaining
      remainingCount = 4;
      break;
    case 2:
      selectedWeight = 0.4; // 40% each for selected
      remainingWeight = 0.2; // 20% for remaining
      remainingCount = 3;
      break;
    case 3:
      selectedWeight = 0.3; // 30% each for selected
      remainingWeight = 0.1; // 10% for remaining
      remainingCount = 2;
      break;
    case 4:
      selectedWeight = 0.25; // 25% each for selected
      remainingWeight = 0; // 0% for remaining
      remainingCount = 1;
      break;
    case 5:
      selectedWeight = 0.2; // 20% each for all
      remainingWeight = 0; // 0% for remaining (none)
      remainingCount = 0;
      break;
    default:
      // Fallback to equal weighting
      return (stormScore + windscreenScore + personalEffectsScore + accidentalDamageScore + newCarReplacementScore) / 5;
  }

  const nonSelectedWeight = remainingCount > 0 ? remainingWeight / remainingCount : 0;

  // Calculate weighted score
  let weightedScore = 0;

  // Weight selected features
  selectedFeatures.forEach(feature => {
    switch (feature) {
      case 'STORM':
        weightedScore += stormScore * selectedWeight;
        break;
      case 'WINDSCREEN':
        weightedScore += windscreenScore * selectedWeight;
        break;
      case 'PERSONAL_EFFECTS':
        weightedScore += personalEffectsScore * selectedWeight;
        break;
      case 'ACCIDENTAL_DAMAGE':
        weightedScore += accidentalDamageScore * selectedWeight;
        break;
      case 'NEW_CAR_REPLACEMENT':
        weightedScore += newCarReplacementScore * selectedWeight;
        break;
    }
  });

  // Weight non-selected features
  if (nonSelectedWeight > 0) {
    if (!selectedFeatures.includes('STORM')) {
      weightedScore += stormScore * nonSelectedWeight;
    }
    if (!selectedFeatures.includes('WINDSCREEN')) {
      weightedScore += windscreenScore * nonSelectedWeight;
    }
    if (!selectedFeatures.includes('PERSONAL_EFFECTS')) {
      weightedScore += personalEffectsScore * nonSelectedWeight;
    }
    if (!selectedFeatures.includes('ACCIDENTAL_DAMAGE')) {
      weightedScore += accidentalDamageScore * nonSelectedWeight;
    }
    if (!selectedFeatures.includes('NEW_CAR_REPLACEMENT')) {
      weightedScore += newCarReplacementScore * nonSelectedWeight;
    }
  }

  return Math.round(weightedScore * 10) / 10; // Round to 1 decimal place
};

// Calculate dynamic Finder Score based on user priority
export const calculateDynamicFinderScore = (
  priceRating: number,
  averageFeatureScore: number,
  userPriority: 'Price' | 'Features'
): number => {
  let dynamicScore: number;
  
  if (userPriority === 'Price') {
    // 85% Price Rating + 15% Feature Score
    dynamicScore = (priceRating * 0.85) + (averageFeatureScore * 0.15);
  } else {
    // 85% Feature Score + 15% Price Rating
    dynamicScore = (averageFeatureScore * 0.85) + (priceRating * 0.15);
  }
  
  return Math.round(dynamicScore * 10) / 10; // Round to 1 decimal place
};

export const processInsuranceProduct = (
  product: InsuranceProduct,
  state: AustralianState,
  gender: Gender,
  ageGroup: AgeGroup,
  priceRatingMap: Map<number, number>,
  featureScoreMaps: {
    stormScoreMap: Map<boolean, number>;
    windscreenScoreMap: Map<boolean, number>;
    personalEffectsScoreMap: Map<number, number>;
    accidentalDamageScoreMap: Map<boolean, number>;
    newCarReplacementScoreMap: Map<boolean, number>;
  },
  selectedFeatures: SelectedFeature[] = [],
  userPriority: 'Price' | 'Features' = 'Price'
): ProcessedInsuranceProduct => {
  const priceKey = getPriceColumnKey(state, gender, ageGroup);
  const price = parseFloat(product[priceKey as keyof InsuranceProduct] as string) || 0;
  const priceRating = priceRatingMap.get(price) || 1.0;
  
  // Calculate feature scores
  const stormValue = product.STORM.toLowerCase() === 'yes';
  const windscreenValue = product.WINDSCREEN.toLowerCase() === 'yes';
  const personalEffectsValue = parseFloat(product.PERSONAL_EFFECTS) || 0;
  const accidentalDamageValue = product.ACCIDENTAL_DAMAGE.toLowerCase() === 'yes';
  const newCarReplacementValue = product.NEW_CAR_REPLACEMENT.toLowerCase() === 'yes';
  
  // Get individual feature scores
  const stormScore = featureScoreMaps.stormScoreMap.get(stormValue) || 0;
  const windscreenScore = featureScoreMaps.windscreenScoreMap.get(windscreenValue) || 0;
  const personalEffectsScore = featureScoreMaps.personalEffectsScoreMap.get(personalEffectsValue) || 0;
  const accidentalDamageScore = featureScoreMaps.accidentalDamageScoreMap.get(accidentalDamageValue) || 0;
  const newCarReplacementScore = featureScoreMaps.newCarReplacementScoreMap.get(newCarReplacementValue) || 0;
  
  // Calculate weighted average feature score based on selected features
  const averageFeatureScore = calculateWeightedFeatureScore(
    stormScore,
    windscreenScore,
    personalEffectsScore,
    accidentalDamageScore,
    newCarReplacementScore,
    selectedFeatures
  );
  
  // Calculate dynamic Finder Score
  const dynamicFinderScore = calculateDynamicFinderScore(priceRating, averageFeatureScore, userPriority);
  
  return {
    id: product.ID,
    name: product.NAME,
    providerId: product.PROVIDER_ID,
    price: price,
    priceRating: priceRating,
    priceScore: parseFloat(product.PRICE_SCORE) || 0,
    coverScore: parseFloat(product.COVER_SCORE) || 0,
    finderScore: parseFloat(product.FINDER_SCORE) || 0,
    // Feature sub-scores
    stormCoverageScore: stormScore,
    windscreenCoverageScore: windscreenScore,
    personalEffectsCoverageScore: personalEffectsScore,
    accidentalDamageCoverageScore: accidentalDamageScore,
    newCarReplacementScore: newCarReplacementScore,
    // Weighted average of feature sub-scores
    averageFeatureScore: averageFeatureScore,
    // Dynamic Finder Score based on user priority
    dynamicFinderScore: dynamicFinderScore,
    features: {
      agreedOrMarketValue: product.AGREED_OR_MARKET_VALUE,
      choiceOfRepairer: product.CHOICE_OF_REPAIRER.toLowerCase() === 'yes',
      lifetimeGuarantee: product.LIFETIME_GUARANTEE_ON_REPAIRS.toLowerCase() === 'yes',
      newCarReplacement: newCarReplacementValue,
      newCarReplacementDetails: product.NEWCAR_REPLACEMENT_DETAILS || '',
      personalEffects: product.PERSONAL_EFFECTS || '',
      personalEffectsDetails: product.PERSONALEFFECTS_DETAILS || '',
      roadsideAssistance: product.ROADSIDE_ASSISTANCE.toLowerCase() === 'yes',
      roadsideAssistanceCost: product.ROADSIDE_ASSISTANCE_COST || '0',
      storm: stormValue,
      towing: product.TOWING.toLowerCase() === 'yes',
      keyReplacement: product.KEY_REPLACEMENT || '',
      keyReplacementDetails: product.KEYREPLACEMENT_DETAILS || '',
      childSeatReplacement: product.CHILD_SEAT_BABY_CAPSULES.toLowerCase() === 'yes',
      childSeatDetails: product.CHILD_SEAT_BABY_CAPSULES_DETAILS || '',
      emergencyTransport: product.EMERGENCY_TRANSPORT_AND_ACCOMMODATION.toLowerCase() === 'yes',
      emergencyTransportDetails: product.EMERGENCY_TRANSPORT_ACCOMMODATION_DETAILS || '',
      essentialRepairs: product.ESSENTIAL_EMERGENCY_REPAIRS || '',
      essentialRepairsDetails: product.ESSENTIAL_EMERGENCY_REPAIR_DETAILS || '',
      hireCarAfterAccident: product.HIRE_CAR_AFTER_ACCIDENT || '',
      restrictedDriverOption: product.RESTRICTED_DRIVER_OPTION || '',
      noExcessWindscreen: product.NO_EXCESS_WINDSCREEN.toLowerCase() === 'yes',
      windscreen: windscreenValue,
      payMonthly: product.PAY_MONTHLY_YES.toLowerCase() === 'yes',
      reducedExcessWindscreen: product.REDUCED_EXCESS_WINDSCREEN || '',
      accidentalDamage: accidentalDamageValue,
    },
  };
};

// Filter products based on selected features
export const filterByFeatures = (products: ProcessedInsuranceProduct[], selectedFeatures: SelectedFeature[]): ProcessedInsuranceProduct[] => {
  if (selectedFeatures.length === 0) {
    return products;
  }

  return products.filter(product => {
    return selectedFeatures.every(feature => {
      switch (feature) {
        case 'STORM':
          return product.features.storm;
        case 'WINDSCREEN':
          return product.features.windscreen;
        case 'PERSONAL_EFFECTS':
          return product.features.personalEffects && product.features.personalEffects !== '0';
        case 'ACCIDENTAL_DAMAGE':
          return product.features.accidentalDamage;
        case 'NEW_CAR_REPLACEMENT':
          return product.features.newCarReplacement;
        default:
          return true;
      }
    });
  });
};

export const getFilteredAndSortedProducts = (
  products: InsuranceProduct[],
  state: AustralianState,
  gender: Gender,
  ageGroup: AgeGroup,
  sortBy: 'priceRating' | 'finderScore' = 'priceRating',
  selectedFeatures: SelectedFeature[] = [],
  userPriority: 'Price' | 'Features' = 'Price'
): ProcessedInsuranceProduct[] => {
  // First, extract all prices for this criteria to create the rating scale
  const allPrices = products
    .map(product => {
      const priceKey = getPriceColumnKey(state, gender, ageGroup);
      return parseFloat(product[priceKey as keyof InsuranceProduct] as string) || 0;
    })
    .filter(price => price > 0);
  
  const priceRatingMap = convertPriceToRating(allPrices);
  
  // Calculate feature scores once for all products
  const featureScoreMaps = calculateFeatureScores(products);
  
  let processedProducts = products
    .map(product => processInsuranceProduct(product, state, gender, ageGroup, priceRatingMap, featureScoreMaps, selectedFeatures, userPriority))
    .filter(product => product.price > 0); // Filter out products with no price data

  // Apply feature filtering
  processedProducts = filterByFeatures(processedProducts, selectedFeatures);
  
  // Sort by the specified criteria
  if (sortBy === 'priceRating') {
    return processedProducts.sort((a, b) => b.priceRating - a.priceRating); // Higher rating first
  } else {
    return processedProducts.sort((a, b) => b.finderScore - a.finderScore);
  }
};
