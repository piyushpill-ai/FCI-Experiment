export type AustralianState = 'NSW' | 'VIC' | 'TAS' | 'WA' | 'SA' | 'QLD';
export type AgeGroup = '< 25 years' | '< 35 years' | '< 65 years';
export type Gender = 'Male' | 'Female' | 'Other';
export type Priority = 'Price' | 'Features';
export type SelectedFeature = 'STORM' | 'WINDSCREEN' | 'PERSONAL_EFFECTS' | 'ACCIDENTAL_DAMAGE' | 'NEW_CAR_REPLACEMENT';

export interface QuizData {
  state: AustralianState | null;
  ageGroup: AgeGroup | null;
  gender: Gender | null;
  priority: Priority | null;
  selectedFeatures: SelectedFeature[];
}

export interface InsuranceProduct {
  ID: string;
  ACTIVE: string;
  NAME: string;
  PROVIDER_ID: string;
  AGREED_OR_MARKET_VALUE: string;
  CHOICE_OF_REPAIRER: string;
  LIFETIME_GUARANTEE_ON_REPAIRS: string;
  NEW_CAR_REPLACEMENT: string;
  NEWCAR_REPLACEMENT_DETAILS: string;
  PERSONAL_EFFECTS: string;
  PERSONALEFFECTS_DETAILS: string;
  ROADSIDE_ASSISTANCE: string;
  ROADSIDE_ASSISTANCE_COST: string;
  STORM: string;
  TOWING: string;
  KEY_REPLACEMENT: string;
  KEYREPLACEMENT_DETAILS: string;
  CHILD_SEAT_BABY_CAPSULES: string;
  CHILD_SEAT_BABY_CAPSULES_DETAILS: string;
  EMERGENCY_TRANSPORT_AND_ACCOMMODATION: string;
  EMERGENCY_TRANSPORT_ACCOMMODATION_DETAILS: string;
  ESSENTIAL_EMERGENCY_REPAIRS: string;
  ESSENTIAL_EMERGENCY_REPAIR_DETAILS: string;
  HIRE_CAR_AFTER_ACCIDENT: string;
  HIRE_CAR_ACCIDENT: string;
  RESTRICTED_DRIVER_OPTION: string;
  NO_EXCESS_WINDSCREEN: string;
  WINDSCREEN: string;
  PAY_MONTHLY_YES: string;
  REDUCED_EXCESS_WINDSCREEN: string;
  PRICE_SCORE: string;
  COVER_SCORE: string;
  FINDER_SCORE: string;
  INSURANCE_TYPE: string;
  ACCIDENTAL_DAMAGE: string;
  
  // Price columns for different states, genders, and ages
  '2025-AUFCI-NSW-F-20': string;
  '2025-AUFCI-NSW-F-30': string;
  '2025-AUFCI-NSW-F-60': string;
  '2025-AUFCI-NSW-M-20': string;
  '2025-AUFCI-NSW-M-30': string;
  '2025-AUFCI-NSW-M-60': string;
  '2025-AUFCI-QLD-F-20': string;
  '2025-AUFCI-QLD-F-30': string;
  '2025-AUFCI-QLD-F-60': string;
  '2025-AUFCI-QLD-M-20': string;
  '2025-AUFCI-QLD-M-30': string;
  '2025-AUFCI-QLD-M-60': string;
  '2025-AUFCI-SA-F-20': string;
  '2025-AUFCI-SA-F-30': string;
  '2025-AUFCI-SA-F-60': string;
  '2025-AUFCI-SA-M-20': string;
  '2025-AUFCI-SA-M-30': string;
  '2025-AUFCI-SA-M-60': string;
  '2025-AUFCI-TAS-F-20': string;
  '2025-AUFCI-TAS-F-30': string;
  '2025-AUFCI-TAS-F-60': string;
  '2025-AUFCI-TAS-M-20': string;
  '2025-AUFCI-TAS-M-30': string;
  '2025-AUFCI-TAS-M-60': string;
  '2025-AUFCI-VIC-F-20': string;
  '2025-AUFCI-VIC-F-30': string;
  '2025-AUFCI-VIC-F-60': string;
  '2025-AUFCI-VIC-M-20': string;
  '2025-AUFCI-VIC-M-30': string;
  '2025-AUFCI-VIC-M-60': string;
  '2025-AUFCI-WA-F-20': string;
  '2025-AUFCI-WA-F-30': string;
  '2025-AUFCI-WA-F-60': string;
  '2025-AUFCI-WA-M-20': string;
  '2025-AUFCI-WA-M-30': string;
  '2025-AUFCI-WA-M-60': string;
  count: string;
}

export interface ProcessedInsuranceProduct {
  id: string;
  name: string;
  providerId: string;
  price: number;
  priceRating: number; // Rating from 1.0 to 9.9 based on price competitiveness
  priceScore: number;
  coverScore: number;
  finderScore: number;
  // Feature sub-scores (calculated but not displayed)
  stormCoverageScore: number;
  windscreenCoverageScore: number;
  personalEffectsCoverageScore: number;
  accidentalDamageCoverageScore: number;
  newCarReplacementScore: number;
  // Average of all feature sub-scores
  averageFeatureScore: number;
  // Dynamic Finder Score based on user priority
  dynamicFinderScore: number;
  features: {
    agreedOrMarketValue: string;
    choiceOfRepairer: boolean;
    lifetimeGuarantee: boolean;
    newCarReplacement: boolean;
    newCarReplacementDetails: string;
    personalEffects: string;
    personalEffectsDetails: string;
    roadsideAssistance: boolean;
    roadsideAssistanceCost: string;
    storm: boolean;
    towing: boolean;
    keyReplacement: string;
    keyReplacementDetails: string;
    childSeatReplacement: boolean;
    childSeatDetails: string;
    emergencyTransport: boolean;
    emergencyTransportDetails: string;
    essentialRepairs: string;
    essentialRepairsDetails: string;
    hireCarAfterAccident: string;
    restrictedDriverOption: string;
    noExcessWindscreen: boolean;
    windscreen: boolean;
    payMonthly: boolean;
    reducedExcessWindscreen: string;
    accidentalDamage: boolean;
  };
}
