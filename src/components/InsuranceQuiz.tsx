import { useState, useEffect } from 'react';
import { AustralianState, AgeGroup, Gender, Priority, SelectedFeature, QuizData, InsuranceProduct, ProcessedInsuranceProduct } from '../types';
import { loadInsuranceData, getFilteredAndSortedProducts } from '../utils/csvLoader';

const InsuranceQuiz = () => {
  const [step, setStep] = useState(0);
  const [quizData, setQuizData] = useState<QuizData>({
    state: null,
    ageGroup: null,
    gender: null,
    priority: null,
    selectedFeatures: [],
  });
  const [insuranceData, setInsuranceData] = useState<InsuranceProduct[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<ProcessedInsuranceProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  // New loading states for individual scores
  const [scoresLoading, setScoresLoading] = useState({
    priceRating: true,
    featureScore: true,
    dynamicFinderScore: true,
  });
  // Modal state for Dynamic Finder Score explanation
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [modalPosition, setModalPosition] = useState({ x: 0, y: 0 });
  const [hoveredProduct, setHoveredProduct] = useState<ProcessedInsuranceProduct | null>(null);

  // Modal timeout for smooth hover behavior
  const [modalTimeoutId, setModalTimeoutId] = useState<NodeJS.Timeout | null>(null);

  // Sort state
  const [sortColumn, setSortColumn] = useState<'priceRating' | 'featureScore' | 'dynamicFinderScore' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Comparison modal state
  const [showComparisonModal, setShowComparisonModal] = useState(false);
  const [selectedProductForComparison, setSelectedProductForComparison] = useState<ProcessedInsuranceProduct | null>(null);

  // Voice control state
  const [_voiceSupported, setVoiceSupported] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);
  
  // Mobile responsive state
  const [isMobile, setIsMobile] = useState(false);

  const states: AustralianState[] = ['NSW', 'VIC', 'TAS', 'WA', 'SA', 'QLD'];
  const ageGroups: AgeGroup[] = ['< 25 years', '< 35 years', '< 65 years'];
  const genders: Gender[] = ['Male', 'Female', 'Other'];
  const availableFeatures: SelectedFeature[] = ['STORM', 'WINDSCREEN', 'PERSONAL_EFFECTS', 'ACCIDENTAL_DAMAGE', 'NEW_CAR_REPLACEMENT'];

  // Load insurance data on component mount
  // Mobile detection effect
  useEffect(() => {
    const checkMobile = () => {
      if (typeof window !== 'undefined') {
        setIsMobile(window.innerWidth <= 768);
      }
    };
    
    checkMobile();
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', checkMobile);
      return () => window.removeEventListener('resize', checkMobile);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await loadInsuranceData();
        setInsuranceData(data);
      } catch (error) {
        console.error('Error loading insurance data:', error);
      }
    };
    loadData();
  }, []);

  // Initialize voice recognition on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';
        setRecognition(recognition);
        setVoiceSupported(true);
      } else {
        setVoiceSupported(false);
      }
    }
  }, []);

  // Cleanup recognition on component unmount
  useEffect(() => {
    return () => {
      if (recognition) {
        recognition.stop();
      }
    };
  }, [recognition]);

  const handleStateSelect = (state: AustralianState) => {
    setQuizData({ ...quizData, state });
    setStep(1);
  };

  const handleAgeSelect = (ageGroup: AgeGroup) => {
    setQuizData({ ...quizData, ageGroup });
    setStep(2);
  };

  const handleGenderSelect = (gender: Gender) => {
    setQuizData({ ...quizData, gender });
    setStep(3);
  };

  const handlePrioritySelect = (priority: Priority) => {
    const updatedQuizData = { ...quizData, priority };
    setQuizData(updatedQuizData);
    
    if (priority === 'Price') {
      // Skip feature selection for price priority
      handleFinalSubmit(updatedQuizData);
    } else {
      // Go to feature selection for features priority
      setStep(4);
    }
  };

  const handleFeatureToggle = (feature: SelectedFeature) => {
    const currentFeatures = quizData.selectedFeatures;
    const isSelected = currentFeatures.includes(feature);
    
    const newFeatures = isSelected
      ? currentFeatures.filter(f => f !== feature)
      : [...currentFeatures, feature];
    
    setQuizData({ ...quizData, selectedFeatures: newFeatures });
  };

  const handleFeatureSubmit = () => {
    handleFinalSubmit(quizData);
  };

  const handleFinalSubmit = async (finalQuizData: QuizData) => {
    setLoading(true);

    // Process and filter the insurance products
    if (finalQuizData.state && finalQuizData.ageGroup && finalQuizData.gender && finalQuizData.priority) {
      const sortBy = finalQuizData.priority === 'Price' ? 'priceRating' : 'finderScore';
      const selectedFeatures = finalQuizData.priority === 'Features' ? finalQuizData.selectedFeatures : [];
      
      const filtered = getFilteredAndSortedProducts(
        insuranceData,
        finalQuizData.state,
        finalQuizData.gender,
        finalQuizData.ageGroup,
        sortBy,
        selectedFeatures,
        finalQuizData.priority
      );
      
      // Log feature sub-scores for the first few products (for verification)
      if (filtered.length > 0) {
        console.log('Feature Sub-Scores Sample:', filtered.slice(0, 3).map(product => ({
          name: product.name,
          priceRating: product.priceRating,
          selectedFeatures: selectedFeatures,
          individualScores: {
            stormCoverageScore: product.stormCoverageScore,
            windscreenCoverageScore: product.windscreenCoverageScore,
            personalEffectsCoverageScore: product.personalEffectsCoverageScore,
            accidentalDamageCoverageScore: product.accidentalDamageCoverageScore,
            newCarReplacementScore: product.newCarReplacementScore,
          },
          weightedAverageFeatureScore: product.averageFeatureScore,
          dynamicFinderScore: product.dynamicFinderScore,
        })));
        
        // Log weighting explanation
        if (selectedFeatures.length > 0) {
          let weightingExplanation = '';
          switch (selectedFeatures.length) {
            case 1:
              weightingExplanation = '60% weight for selected feature, 40% distributed among remaining 4 features (10% each)';
              break;
            case 2:
              weightingExplanation = '40% weight each for selected features, 20% distributed among remaining 3 features (6.67% each)';
              break;
            case 3:
              weightingExplanation = '30% weight each for selected features, 10% distributed among remaining 2 features (5% each)';
              break;
            case 4:
              weightingExplanation = '25% weight each for selected features, 0% for non-selected feature';
              break;
            case 5:
              weightingExplanation = '20% weight each for all 5 features (equal weighting)';
              break;
          }
          console.log('Feature Score Weighting:', weightingExplanation);
        } else {
          console.log('Feature Score Weighting: Equal weighting (20% each) - no specific features selected');
        }
        
        // Log Dynamic Finder Score explanation
        if (finalQuizData.priority === 'Price') {
          console.log('Dynamic Finder Score: 85% Price Rating + 15% Feature Score');
        } else {
          console.log('Dynamic Finder Score: 85% Feature Score + 15% Price Rating');
        }
      }
      
      setFilteredProducts(filtered);
    }

    setLoading(false);
    setShowResults(true);
    
    // Reset scores loading state and trigger staggered animations
    setScoresLoading({
      priceRating: true,
      featureScore: true,
      dynamicFinderScore: true,
    });
    
    // Staggered score loading animations
    setTimeout(() => {
      setScoresLoading(prev => ({ ...prev, priceRating: false }));
    }, 300);
    
    setTimeout(() => {
      setScoresLoading(prev => ({ ...prev, featureScore: false }));
    }, 600);
    
    setTimeout(() => {
      setScoresLoading(prev => ({ ...prev, dynamicFinderScore: false }));
    }, 900);
  };

  const resetQuiz = () => {
    setStep(0);
    setShowResults(false);
    setQuizData({ state: null, ageGroup: null, gender: null, priority: null, selectedFeatures: [] });
    setFilteredProducts([]);
    setScoresLoading({
      priceRating: true,
      featureScore: true,
      dynamicFinderScore: true,
    });
  };

  // Helper functions for modal with timeout
  const showModal = (product: ProcessedInsuranceProduct, position: { x: number; y: number }) => {
    if (modalTimeoutId) {
      clearTimeout(modalTimeoutId);
      setModalTimeoutId(null);
    }
    setHoveredProduct(product);
    setModalPosition(position);
    setShowScoreModal(true);
  };

  const hideModalWithDelay = () => {
    const timeoutId = setTimeout(() => {
      setShowScoreModal(false);
      setHoveredProduct(null);
      setModalTimeoutId(null);
    }, 100);
    setModalTimeoutId(timeoutId);
  };

  const cancelHideModal = () => {
    if (modalTimeoutId) {
      clearTimeout(modalTimeoutId);
      setModalTimeoutId(null);
    }
  };

  // Sponsored products logic
  const sponsoredProducts = [
    'Coles Comprehensive',
    'Qantas Comprehensive', 
    'Bingle Comprehensive',
    'Huddle Comprehensive',
    'Kogan Comprehensive'
  ];

  const isSponsoredProduct = (productName: string): boolean => {
    return sponsoredProducts.includes(productName);
  };

  const getComparisonProducts = (selectedProduct: ProcessedInsuranceProduct): ProcessedInsuranceProduct[] => {
    // Get sponsored products that are available in current results
    const availableSponsored = filteredProducts.filter(product => 
      isSponsoredProduct(product.name) && product.id !== selectedProduct.id
    );

    // Sort by dynamic finder score and return top 2
    return availableSponsored
      .sort((a, b) => b.dynamicFinderScore - a.dynamicFinderScore)
      .slice(0, 2);
  };

  const handleGoToSite = (productName: string) => {
    // This would redirect to the specific provider's application page
    // For now, we'll use placeholder URLs
    const providerUrls: { [key: string]: string } = {
      'Coles Comprehensive': 'https://www.coles.com.au/insurance',
      'Qantas Comprehensive': 'https://www.qantas.com/insurance',
      'Bingle Comprehensive': 'https://www.bingle.com.au',
      'Huddle Comprehensive': 'https://www.huddle.com.au',
      'Kogan Comprehensive': 'https://www.kogan.com/insurance'
    };
    
    const url = providerUrls[productName];
    if (url) {
      window.open(url, '_blank');
    }
  };

  const handleContinueComparison = (product: ProcessedInsuranceProduct) => {
    setSelectedProductForComparison(product);
    setShowComparisonModal(true);
  };


  // Sort functionality
  const handleSort = (column: 'priceRating' | 'featureScore' | 'dynamicFinderScore') => {
    if (sortColumn === column) {
      // Toggle direction if same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New column, default to descending (highest first)
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  // Get sorted products
  const getSortedProducts = () => {
    if (!sortColumn) {
      // Default sorting: sponsored products first, then by dynamic finder score
      return [...filteredProducts].sort((a, b) => {
        const aIsSponsored = isSponsoredProduct(a.name);
        const bIsSponsored = isSponsoredProduct(b.name);
        
        // If one is sponsored and the other isn't, sponsored comes first
        if (aIsSponsored && !bIsSponsored) return -1;
        if (!aIsSponsored && bIsSponsored) return 1;
        
        // If both are sponsored or both are not sponsored, sort by dynamic finder score
        return b.dynamicFinderScore - a.dynamicFinderScore;
      });
    }

    return [...filteredProducts].sort((a, b) => {
      let aValue: number;
      let bValue: number;

      switch (sortColumn) {
        case 'priceRating':
          aValue = a.priceRating;
          bValue = b.priceRating;
          break;
        case 'featureScore':
          aValue = a.averageFeatureScore;
          bValue = b.averageFeatureScore;
          break;
        case 'dynamicFinderScore':
          aValue = a.dynamicFinderScore;
          bValue = b.dynamicFinderScore;
          break;
        default:
          return 0;
      }

      if (sortDirection === 'asc') {
        return aValue - bValue;
      } else {
        return bValue - aValue;
      }
    });
  };

  // Style objects
  const containerStyle: React.CSSProperties = {
    minHeight: '100vh',
    backgroundColor: '#2563eb',
    padding: '3rem 1rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: '#fde047',
    borderRadius: '0.75rem',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    padding: '1.5rem',
    maxWidth: showResults ? '80rem' : '28rem',
    width: '100%',
    transition: 'max-width 0.3s ease',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '1.875rem',
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: '0.5rem',
  };

  const subtitleStyle: React.CSSProperties = {
    color: '#4b5563',
    textAlign: 'center',
    marginBottom: '2rem',
  };

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: '0.5rem',
  };

  const sectionDescStyle: React.CSSProperties = {
    color: '#4b5563',
    marginBottom: '1rem',
  };

  const buttonStyle: React.CSSProperties = {
    backgroundColor: 'white',
    border: 'none',
    borderRadius: '0.5rem',
    padding: '1rem',
    fontSize: '1.125rem',
    fontWeight: '500',
    color: '#374151',
    cursor: 'pointer',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    transition: 'all 0.2s',
    width: '100%',
    margin: '0.25rem 0',
  };

  const priorityButtonStyle: React.CSSProperties = {
    backgroundColor: 'white',
    border: 'none',
    borderRadius: '0.5rem',
    padding: '1.5rem',
    fontSize: '1.125rem',
    fontWeight: '500',
    color: '#374151',
    cursor: 'pointer',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    transition: 'all 0.2s',
    width: '100%',
    margin: '0.25rem 0',
    textAlign: 'left',
  };

  const featureButtonStyle = (isSelected: boolean): React.CSSProperties => ({
    backgroundColor: isSelected ? '#3b82f6' : 'white',
    color: isSelected ? 'white' : '#374151',
    border: '2px solid',
    borderColor: isSelected ? '#3b82f6' : '#e5e7eb',
    borderRadius: '0.5rem',
    padding: '1rem',
    fontSize: '1rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s',
    width: '100%',
    margin: '0.25rem 0',
    textAlign: 'left',
  });

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '1rem',
  };

  const flexColStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  };

  const bottomStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '2rem',
  };

  const backButtonStyle: React.CSSProperties = {
    backgroundColor: 'white',
    border: 'none',
    borderRadius: '0.375rem',
    padding: '0.5rem 1rem',
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#374151',
    cursor: 'pointer',
  };

  const resetButtonStyle: React.CSSProperties = {
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '0.375rem',
    padding: '0.5rem 1rem',
    fontSize: '0.875rem',
    fontWeight: '500',
    cursor: 'pointer',
    marginBottom: '1rem',
  };

  const continueButtonStyle: React.CSSProperties = {
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '0.5rem',
    padding: '0.75rem 1.5rem',
    fontSize: '1rem',
    fontWeight: '500',
    cursor: 'pointer',
    marginTop: '1rem',
  };

  const dotsStyle: React.CSSProperties = {
    display: 'flex',
    gap: '0.5rem',
    marginLeft: 'auto',
  };

  const dotStyle = (isActive: boolean): React.CSSProperties => ({
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    backgroundColor: isActive ? '#3b82f6' : '#d1d5db',
  });

  const tableStyle: React.CSSProperties = {
    width: '100%',
    borderCollapse: 'collapse',
    backgroundColor: 'white',
    borderRadius: '0.5rem',
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  };

  const thStyle: React.CSSProperties = {
    backgroundColor: '#f3f4f6',
    padding: '12px',
    textAlign: 'left',
    fontWeight: 'bold',
    color: '#374151',
    borderBottom: '1px solid #e5e7eb',
  };


  const thSortableStyle: React.CSSProperties = {
    backgroundColor: '#f3f4f6',
    padding: '12px',
    textAlign: 'left',
    fontWeight: 'bold',
    color: '#374151',
    borderBottom: '1px solid #e5e7eb',
    cursor: 'pointer',
    userSelect: 'none',
    transition: 'background-color 0.2s',
  };

  const thSortableCenterStyle: React.CSSProperties = {
    backgroundColor: '#f3f4f6',
    padding: '12px',
    textAlign: 'center',
    fontWeight: 'bold',
    color: '#374151',
    borderBottom: '1px solid #e5e7eb',
    cursor: 'pointer',
    userSelect: 'none',
    transition: 'background-color 0.2s',
  };

  const tdStyle: React.CSSProperties = {
    padding: '16px 12px',
    borderBottom: '1px solid #e5e7eb',
    color: '#374151',
    verticalAlign: 'middle',
  };

  // Helper function to get color for feature score
  const getFeatureScoreColor = (score: number): string => {
    if (score >= 9.0) return '#3b82f6'; // Blue for excellent (9+)
    if (score >= 7.0) return '#10b981'; // Green for very good (7-9)
    if (score >= 5.0) return '#f59e0b'; // Orange/Yellow for good (5-7)
    return '#ef4444'; // Red for poor (below 5)
  };

  // Component for circular progress indicator
  const CircularProgress = ({ value, maxValue, size = 60 }: { value: number; maxValue: number; size?: number }) => {
    const percentage = (value / maxValue) * 100;
    const strokeWidth = 6;
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const strokeDasharray = circumference;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;
    
    // Get color based on percentage
    const getProgressColor = (percentage: number): string => {
      if (percentage >= 90) return '#3b82f6'; // Blue for excellent (90%+)
      if (percentage >= 70) return '#10b981'; // Green for very good (70-90%)
      if (percentage >= 50) return '#f59e0b'; // Orange/Yellow for good (50-70%)
      return '#ef4444'; // Red for poor (below 50%)
    };

    const progressColor = getProgressColor(percentage);

    return (
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#e5e7eb"
            strokeWidth={strokeWidth}
            fill="none"
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={progressColor}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{
              transition: 'stroke-dashoffset 0.3s ease',
            }}
          />
        </svg>
        {/* Center text */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '0.875rem',
          fontWeight: 'bold',
          color: '#374151',
        }}>
          {value.toFixed(1)}
        </div>
      </div>
    );
  };

  // Loading spinner component for circular progress
  const CircularLoadingSpinner = ({ size = 60 }: { size?: number }) => {
    return (
      <div style={{ 
        width: size, 
        height: size, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        <div style={{
          width: 24,
          height: 24,
          border: '3px solid #e5e7eb',
          borderTop: '3px solid #3b82f6',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }} />
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  };

  // Loading spinner component for badge
  const BadgeLoadingSpinner = () => {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#f3f4f6',
        padding: '4px 8px',
        borderRadius: '12px',
        minWidth: '60px',
        height: '32px',
      }}>
        <div style={{
          width: 16,
          height: 16,
          border: '2px solid #e5e7eb',
          borderTop: '2px solid #3b82f6',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }} />
      </div>
    );
  };

  // Mobile Card Component for responsive design
  const MobileProductCard = ({ product }: { product: ProcessedInsuranceProduct }) => {
    return (
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '16px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        border: '1px solid #e5e7eb'
      }}>
        {/* Product Header */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
          <ProductLogo providerId={product.providerId} productName={product.name} />
        </div>

        {/* Scores Section */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '16px',
          marginBottom: '16px'
        }}>
          {/* Price Rating */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#6b7280', marginBottom: '8px' }}>
              Price Rating
            </div>
            {scoresLoading.priceRating ? (
              <CircularLoadingSpinner size={50} />
            ) : (
              <CircularProgress value={product.priceRating} maxValue={9.9} size={50} />
            )}
          </div>

          {/* Feature Score */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#6b7280', marginBottom: '8px' }}>
              Feature Score
            </div>
            {scoresLoading.featureScore ? (
              <CircularLoadingSpinner size={50} />
            ) : (
              <CircularProgress value={product.averageFeatureScore} maxValue={10} size={50} />
            )}
          </div>
        </div>

        {/* Dynamic Finder Score */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '16px'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#6b7280', marginBottom: '8px' }}>
              Dynamic Finder Score
            </div>
            {scoresLoading.dynamicFinderScore ? (
              <BadgeLoadingSpinner />
            ) : (
              <span style={{
                backgroundColor: getFeatureScoreColor(product.dynamicFinderScore),
                color: 'white',
                padding: '8px 16px',
                borderRadius: '20px',
                fontSize: '1.25rem',
                fontWeight: 'bold',
                display: 'inline-block'
              }}
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                showModal(product, { x: rect.left + rect.width / 2, y: rect.top - 100 });
              }}
              onMouseLeave={hideModalWithDelay}
              >
                {product.dynamicFinderScore.toFixed(1)}
              </span>
            )}
          </div>
        </div>

        {/* Key Features */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#6b7280', marginBottom: '8px' }}>
            Key Features
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr',
            gap: '4px',
            fontSize: '0.875rem'
          }}>
            {product.features.newCarReplacement && <span style={{ color: '#374151' }}>• New Car Replacement</span>}
            {product.features.roadsideAssistance && <span style={{ color: '#374151' }}>• Roadside Assistance</span>}
            {product.features.storm && <span style={{ color: '#374151' }}>• Storm Coverage</span>}
            {product.features.windscreen && <span style={{ color: '#374151' }}>• Windscreen</span>}
            {product.features.accidentalDamage && <span style={{ color: '#374151' }}>• Accidental Damage</span>}
          </div>
        </div>

        {/* Action Button */}
        <div style={{ display: 'flex', justifyContent: 'stretch' }}>
          {isSponsoredProduct(product.name) ? (
            <button
              onClick={() => handleGoToSite(product.name)}
              style={{
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '12px',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                transition: 'background-color 0.2s',
                width: '100%'
              }}
            >
              Go to site
            </button>
          ) : (
            <button
              onClick={() => handleContinueComparison(product)}
              style={{
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '12px',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                transition: 'background-color 0.2s',
                width: '100%'
              }}
            >
              Continue
            </button>
          )}
        </div>
      </div>
    );
  };

  // Logo component with fallback
  const ProductLogo = ({ providerId, productName }: { providerId: string; productName: string }) => {
    const [logoSrc, setLogoSrc] = useState<string | null>(null);
    const [hasError, setHasError] = useState(false);

    // Try different extensions if the first one fails
    useEffect(() => {
      const extensions = ['png', 'jpg', 'jpeg', 'webp', 'svg'];
      let currentIndex = 0;

      const tryNextExtension = () => {
        if (currentIndex >= extensions.length) {
          setHasError(true);
          return;
        }

        const testSrc = `/logos/${providerId}.${extensions[currentIndex]}`;
        const img = new Image();
        
        img.onload = () => {
          setLogoSrc(testSrc);
          setHasError(false);
        };
        
        img.onerror = () => {
          currentIndex++;
          tryNextExtension();
        };
        
        img.src = testSrc;
      };

      setHasError(false);
      setLogoSrc(null);
      tryNextExtension();
    }, [providerId]);

    if (hasError || !logoSrc) {
      // Return a placeholder or company initials
      const initials = productName.split(' ').map(word => word[0]).join('').substring(0, 2).toUpperCase();
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '60px',
            height: '60px',
            backgroundColor: '#e5e7eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '8px',
            fontSize: '1rem',
            fontWeight: 'bold',
            color: '#6b7280'
          }}>
            {initials}
          </div>
          <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>{productName}</span>
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <img
          src={logoSrc}
          alt={`${productName} logo`}
          style={{
            width: '60px',
            height: '60px',
            objectFit: 'contain',
            borderRadius: '8px',
            backgroundColor: '#f9fafb',
            padding: '6px',
          }}
          onError={() => setHasError(true)}
        />
        <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>{productName}</span>
      </div>
    );
  };

  // Sortable header component
  const SortableHeader = ({ 
    column, 
    children, 
    centered = false 
  }: { 
    column: 'priceRating' | 'featureScore' | 'dynamicFinderScore';
    children: React.ReactNode;
    centered?: boolean;
  }) => {
    const isActive = sortColumn === column;
    
    const SortIcon = () => (
      <svg 
        width="12" 
        height="12" 
        viewBox="0 0 12 12" 
        fill="none" 
        style={{
          transform: isActive && sortDirection === 'asc' ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s ease',
          opacity: isActive ? 1 : 0.4
        }}
      >
        <path 
          d="M3 4.5L6 7.5L9 4.5" 
          stroke="currentColor" 
          strokeWidth="1.5" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        />
      </svg>
    );

    return (
      <th 
        style={centered ? thSortableCenterStyle : thSortableStyle}
        onClick={() => handleSort(column)}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#e5e7eb';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#f3f4f6';
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: centered ? 'center' : 'flex-start', gap: '6px' }}>
          {children}
          <SortIcon />
        </div>
      </th>
    );
  };

  // Pie Chart component for score breakdown
  const PieChart = ({ pricePercentage, featurePercentage, size = 120 }: { pricePercentage: number; featurePercentage: number; size?: number }) => {
    const radius = size / 2 - 10;
    const circumference = 2 * Math.PI * radius;
    const priceArcLength = (pricePercentage / 100) * circumference;
    const featureArcLength = (featurePercentage / 100) * circumference;
    
    return (
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          {/* Price Rating segment */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#3b82f6"
            strokeWidth="20"
            fill="none"
            strokeDasharray={`${priceArcLength} ${circumference}`}
            strokeLinecap="round"
          />
          {/* Feature Score segment */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#10b981"
            strokeWidth="20"
            fill="none"
            strokeDasharray={`${featureArcLength} ${circumference}`}
            strokeDashoffset={-priceArcLength}
            strokeLinecap="round"
          />
        </svg>
        {/* Center text */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '0.75rem',
          fontWeight: 'bold',
          color: '#374151',
          textAlign: 'center',
          transform: 'rotate(0deg)',
        }}>
          Dynamic<br/>Score
        </div>
      </div>
    );
  };

  // Modal component for score explanation
  const ScoreExplanationModal = () => {
    if (!showScoreModal || !hoveredProduct) return null;

    const isPricePriority = quizData.priority === 'Price';
    const pricePercentage = isPricePriority ? 85 : 15;
    const featurePercentage = isPricePriority ? 15 : 85;

    return (
      <div 
        style={{
          position: 'fixed',
          left: modalPosition.x,
          top: modalPosition.y,
          backgroundColor: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          padding: '16px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          zIndex: 1000,
          minWidth: '280px',
          maxWidth: '320px',
        }}
        onMouseEnter={cancelHideModal}
        onMouseLeave={hideModalWithDelay}
      >
        <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem', fontWeight: 'bold', color: '#374151' }}>
          Dynamic Finder Score Breakdown
        </h3>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
          <PieChart pricePercentage={pricePercentage} featurePercentage={featurePercentage} size={100} />
          
          <div style={{ flex: 1 }}>
            <div style={{ marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <div style={{ width: '12px', height: '12px', backgroundColor: '#3b82f6', borderRadius: '2px' }}></div>
                <span style={{ fontSize: '0.875rem', color: '#374151' }}>Price Rating: {pricePercentage}%</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginLeft: '20px' }}>
                {hoveredProduct.priceRating.toFixed(1)}/9.9
              </div>
            </div>
            
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <div style={{ width: '12px', height: '12px', backgroundColor: '#10b981', borderRadius: '2px' }}></div>
                <span style={{ fontSize: '0.875rem', color: '#374151' }}>Feature Score: {featurePercentage}%</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginLeft: '20px' }}>
                {hoveredProduct.averageFeatureScore.toFixed(1)}/10.0
              </div>
            </div>
          </div>
        </div>
        
        <div style={{ 
          padding: '8px', 
          backgroundColor: '#f9fafb', 
          borderRadius: '4px',
          fontSize: '0.75rem',
          color: '#6b7280'
        }}>
          Your priority: <strong>{quizData.priority}</strong><br/>
          Result: <strong>{hoveredProduct.dynamicFinderScore.toFixed(1)}</strong>
        </div>
      </div>
    );
  };





  // Comparison Modal component
  const ComparisonModal = () => {
    if (!showComparisonModal || !selectedProductForComparison) return null;

    const comparisonProducts = getComparisonProducts(selectedProductForComparison);

    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '2rem',
          maxWidth: '900px',
          width: '90%',
          maxHeight: '80vh',
          overflow: 'auto',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1f2937', margin: 0 }}>
              Compare Insurance Products
            </h2>
            <button
              onClick={() => setShowComparisonModal(false)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '1.5rem',
                cursor: 'pointer',
                color: '#6b7280'
              }}
            >
              ×
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
            {/* Selected Product */}
            <div style={{
              border: '2px solid #3b82f6',
              borderRadius: '8px',
              padding: '1rem',
              backgroundColor: '#f8fafc'
            }}>
              <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                <ProductLogo 
                  providerId={selectedProductForComparison.providerId} 
                  productName={selectedProductForComparison.name} 
                />
                <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#3b82f6', fontWeight: 'bold' }}>
                  Your Selection
                </div>
              </div>
              
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Price Score:</span>
                  <span style={{ fontWeight: 'bold' }}>{selectedProductForComparison.priceRating.toFixed(1)}/9.9</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Feature Score:</span>
                  <span style={{ fontWeight: 'bold' }}>{selectedProductForComparison.averageFeatureScore.toFixed(1)}/10.0</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Dynamic Score:</span>
                  <span style={{ 
                    fontWeight: 'bold',
                    color: getFeatureScoreColor(selectedProductForComparison.dynamicFinderScore)
                  }}>
                    {selectedProductForComparison.dynamicFinderScore.toFixed(1)}
                  </span>
                </div>
              </div>

              <div>
                <h4 style={{ fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#374151' }}>
                  Key Features:
                </h4>
                <div style={{ fontSize: '0.75rem', display: 'grid', gap: '2px' }}>
                  {selectedProductForComparison.features.newCarReplacement && <span>• New Car Replacement</span>}
                  {selectedProductForComparison.features.roadsideAssistance && <span>• Roadside Assistance</span>}
                  {selectedProductForComparison.features.storm && <span>• Storm Coverage</span>}
                  {selectedProductForComparison.features.windscreen && <span>• Windscreen</span>}
                  {selectedProductForComparison.features.accidentalDamage && <span>• Accidental Damage</span>}
                </div>
              </div>
            </div>

            {/* Comparison Products */}
            {comparisonProducts.map((product, _index) => (
              <div key={product.id} style={{
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '1rem',
              }}>
                <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                  <ProductLogo 
                    providerId={product.providerId} 
                    productName={product.name} 
                  />
                  <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#10b981', fontWeight: 'bold' }}>
                    Alternative Option
                  </div>
                </div>
                
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Price Score:</span>
                    <span style={{ fontWeight: 'bold' }}>{product.priceRating.toFixed(1)}/9.9</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Feature Score:</span>
                    <span style={{ fontWeight: 'bold' }}>{product.averageFeatureScore.toFixed(1)}/10.0</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Dynamic Score:</span>
                    <span style={{ 
                      fontWeight: 'bold',
                      color: getFeatureScoreColor(product.dynamicFinderScore)
                    }}>
                      {product.dynamicFinderScore.toFixed(1)}
                    </span>
                  </div>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <h4 style={{ fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#374151' }}>
                    Key Features:
                  </h4>
                  <div style={{ fontSize: '0.75rem', display: 'grid', gap: '2px' }}>
                    {product.features.newCarReplacement && <span>• New Car Replacement</span>}
                    {product.features.roadsideAssistance && <span>• Roadside Assistance</span>}
                    {product.features.storm && <span>• Storm Coverage</span>}
                    {product.features.windscreen && <span>• Windscreen</span>}
                    {product.features.accidentalDamage && <span>• Accidental Damage</span>}
                  </div>
                </div>

                <button
                  onClick={() => handleGoToSite(product.name)}
                  style={{
                    width: '100%',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#2563eb';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#3b82f6';
                  }}
                >
                  Go to {product.name.split(' ')[0]} site
                </button>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
            <button
              onClick={() => setShowComparisonModal(false)}
              style={{
                backgroundColor: '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '8px 24px',
                fontSize: '0.875rem',
                cursor: 'pointer'
              }}
            >
              Close Comparison
            </button>
          </div>
        </div>
      </div>
    );
  };

  const getFeatureDisplayName = (feature: SelectedFeature): string => {
    const featureNames: Record<SelectedFeature, string> = {
      'STORM': '🌩️ Storm Coverage',
      'WINDSCREEN': '🪟 Windscreen Coverage',
      'PERSONAL_EFFECTS': '👜 Personal Effects Coverage',
      'ACCIDENTAL_DAMAGE': '🚗 Accidental Damage Coverage',
      'NEW_CAR_REPLACEMENT': '🆕 New Car Replacement',
    };
    return featureNames[feature];
  };

  const getFeatureDescription = (feature: SelectedFeature): string => {
    const descriptions: Record<SelectedFeature, string> = {
      'STORM': 'Protection against storm and weather damage',
      'WINDSCREEN': 'Coverage for windscreen repairs and replacement',
      'PERSONAL_EFFECTS': 'Coverage for personal items in your vehicle',
      'ACCIDENTAL_DAMAGE': 'Protection against accidental damage to your vehicle',
      'NEW_CAR_REPLACEMENT': 'Get a new car if yours is written off in the first few years',
    };
    return descriptions[feature];
  };

  const renderStateSelection = () => (
    <div>
      <h2 style={sectionTitleStyle}>Select Your State</h2>
      <p style={sectionDescStyle}>Choose the state where you currently reside</p>
      <div style={gridStyle}>
        {states.map((state) => (
          <button
            key={state}
            onClick={() => handleStateSelect(state)}
            style={buttonStyle}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#fef3c7';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'white';
            }}
          >
            {state}
          </button>
        ))}
      </div>
    </div>
  );

  const renderAgeSelection = () => (
    <div>
      <h2 style={sectionTitleStyle}>Select Your Age Group</h2>
      <p style={sectionDescStyle}>Choose your age bracket</p>
      <div style={flexColStyle}>
        {ageGroups.map((age) => (
          <button
            key={age}
            onClick={() => handleAgeSelect(age)}
            style={buttonStyle}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#fef3c7';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'white';
            }}
          >
            {age}
          </button>
        ))}
      </div>
    </div>
  );

  const renderGenderSelection = () => (
    <div>
      <h2 style={sectionTitleStyle}>Select Your Gender</h2>
      <p style={sectionDescStyle}>Choose your gender</p>
      <div style={flexColStyle}>
        {genders.map((gender) => (
          <button
            key={gender}
            onClick={() => handleGenderSelect(gender)}
            style={buttonStyle}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#fef3c7';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'white';
            }}
          >
            {gender}
          </button>
        ))}
      </div>
    </div>
  );

  const renderPrioritySelection = () => (
    <div>
      <h2 style={sectionTitleStyle}>What's Most Important to You?</h2>
      <p style={sectionDescStyle}>This will help us sort the results to match your priorities</p>
      <div style={flexColStyle}>
        <button
          onClick={() => handlePrioritySelect('Price')}
          style={priorityButtonStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#fef3c7';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'white';
          }}
        >
          <div>
            <div style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>💰 Price</div>
            <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
              Show me the most competitive pricing options first
            </div>
          </div>
        </button>
        <button
          onClick={() => handlePrioritySelect('Features')}
          style={priorityButtonStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#fef3c7';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'white';
          }}
        >
          <div>
            <div style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>⭐ Features</div>
            <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
              Show me policies with specific features I need
            </div>
          </div>
        </button>
      </div>
    </div>
  );

  const renderFeatureSelection = () => (
    <div>
      <h2 style={sectionTitleStyle}>Select Your Required Features</h2>
      <p style={sectionDescStyle}>Choose the features that are important to you (you can select multiple)</p>
      <div style={flexColStyle}>
        {availableFeatures.map((feature) => (
          <button
            key={feature}
            onClick={() => handleFeatureToggle(feature)}
            style={featureButtonStyle(quizData.selectedFeatures.includes(feature))}
          >
            <div>
              <div style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>
                {getFeatureDisplayName(feature)}
              </div>
              <div style={{ fontSize: '0.875rem', opacity: 0.8 }}>
                {getFeatureDescription(feature)}
              </div>
            </div>
          </button>
        ))}
      </div>
      <div style={{ textAlign: 'center' }}>
        <button
          onClick={handleFeatureSubmit}
          style={continueButtonStyle}
        >
          Continue with {quizData.selectedFeatures.length} selected feature{quizData.selectedFeatures.length !== 1 ? 's' : ''}
        </button>
      </div>
    </div>
  );

  const renderResults = () => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <h2 style={sectionTitleStyle}>Insurance Comparison Results</h2>
          <p style={sectionDescStyle}>
            {quizData.state} • {quizData.ageGroup} • {quizData.gender} • Sorted by {quizData.priority}
            {quizData.selectedFeatures.length > 0 && ` • Filtered by ${quizData.selectedFeatures.length} feature${quizData.selectedFeatures.length !== 1 ? 's' : ''}`} • {filteredProducts.length} products found
          </p>
        </div>
        <button onClick={resetQuiz} style={resetButtonStyle}>
          New Search
        </button>
      </div>
      
      {filteredProducts.length > 0 ? (
        <div>
          <div style={{ 
            marginBottom: '1rem', 
            padding: '8px 12px', 
            backgroundColor: '#eff6ff', 
            borderRadius: '6px',
            fontSize: '0.875rem',
            color: '#1e40af',
            border: '1px solid #dbeafe'
          }}>
            💡 <strong>Tip:</strong> {isMobile ? 'Tap on Dynamic Finder Score badges to see details!' : 'Click on Price Rating, Feature Score, or Dynamic Finder Score column headers to sort the results!'}
            {!isMobile && sortColumn && (
              <span style={{ marginLeft: '8px' }}>
                Currently sorted by <strong>{sortColumn === 'priceRating' ? 'Price Rating' : sortColumn === 'featureScore' ? 'Feature Score' : 'Dynamic Finder Score'}</strong> ({sortDirection === 'desc' ? 'highest first' : 'lowest first'})
                <button 
                  onClick={() => { setSortColumn(null); setSortDirection('desc'); }}
                  style={{
                    marginLeft: '8px',
                    background: 'none',
                    border: 'none',
                    color: '#1e40af',
                    textDecoration: 'underline',
                    cursor: 'pointer',
                    fontSize: '0.875rem'
                  }}
                >
                  Clear sort
                </button>
              </span>
            )}
          </div>

          {/* Temporary: Force desktop table layout to debug white screen */}
          <div style={{ overflowX: 'auto' }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Product</th>
                <SortableHeader column="priceRating">Price Rating</SortableHeader>
                <SortableHeader column="featureScore">Feature Score</SortableHeader>
                <SortableHeader column="dynamicFinderScore" centered>Dynamic Finder Score</SortableHeader>
                <th style={thStyle}>Key Features</th>
                <th style={{...thStyle, width: '100px', textAlign: 'center'}}></th>
              </tr>
            </thead>
            <tbody>
              {getSortedProducts().slice(0, 10).map((product) => {
                return (
                  <tr key={product.id}>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <ProductLogo providerId={product.providerId} productName={product.name} />
                      </div>
                    </td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      {scoresLoading.priceRating ? (
                        <CircularLoadingSpinner size={60} />
                      ) : (
                        <CircularProgress value={product.priceRating} maxValue={9.9} size={60} />
                      )}
                    </div>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      {scoresLoading.featureScore ? (
                        <CircularLoadingSpinner size={60} />
                      ) : (
                        <CircularProgress value={product.averageFeatureScore} maxValue={10} size={60} />
                      )}
                    </div>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {scoresLoading.dynamicFinderScore ? (
                        <BadgeLoadingSpinner />
                      ) : (
                        <span style={{ 
                          backgroundColor: getFeatureScoreColor(product.dynamicFinderScore),
                          color: 'white',
                          padding: '4px 8px',
                          borderRadius: '12px',
                          fontSize: '1rem',
                          fontWeight: 'bold'
                        }}
                        onMouseEnter={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          showModal(product, { x: rect.left + rect.width / 2, y: rect.top - 100 });
                        }}
                        onMouseLeave={hideModalWithDelay}
                        >
                          {product.dynamicFinderScore.toFixed(1)}
                        </span>
                      )}
                    </div>
                  </td>
                    <td style={tdStyle}>
                      <div style={{ 
                        fontSize: '0.875rem',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, 1fr)',
                        gap: '4px'
                      }}>
                        {product.features.newCarReplacement && <span style={{ color: '#374151' }}>• New Car Replacement</span>}
                        {product.features.roadsideAssistance && <span style={{ color: '#374151' }}>• Roadside Assistance</span>}
                        {product.features.storm && <span style={{ color: '#374151' }}>• Storm Coverage</span>}
                        {product.features.windscreen && <span style={{ color: '#374151' }}>• Windscreen</span>}
                        {product.features.accidentalDamage && <span style={{ color: '#374151' }}>• Accidental Damage</span>}
                      </div>
                    </td>
                   <td style={tdStyle}>
                     <div style={{ display: 'flex', justifyContent: 'center' }}>
                        {isSponsoredProduct(product.name) ? (
                          <button
                            onClick={() => handleGoToSite(product.name)}
                            style={{
                              backgroundColor: '#3b82f6',
                              color: 'white',
                              border: 'none',
                              borderRadius: '8px',
                              padding: '8px 12px',
                              fontSize: '0.8rem',
                              fontWeight: '600',
                              cursor: 'pointer',
                              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                              transition: 'background-color 0.2s',
                              minWidth: '85px',
                              whiteSpace: 'nowrap'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#2563eb';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = '#3b82f6';
                            }}
                          >
                            Go to site
                          </button>
                        ) : (
                          <button
                            onClick={() => handleContinueComparison(product)}
                            style={{
                              backgroundColor: '#3b82f6',
                              color: 'white',
                              border: 'none',
                              borderRadius: '8px',
                              padding: '8px 12px',
                              fontSize: '0.8rem',
                              fontWeight: '600',
                              cursor: 'pointer',
                              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                              transition: 'background-color 0.2s',
                              minWidth: '85px',
                              whiteSpace: 'nowrap'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#2563eb';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = '#3b82f6';
                            }}
                          >
                            Continue
                          </button>
                        )}
                      </div>
                   </td>
                </tr>
                );
              })}
            </tbody>
          </table>
          
          </div>
          
          <div style={{ 
            marginTop: '1rem', 
            padding: '1rem', 
            backgroundColor: '#f9fafb', 
            borderRadius: '0.5rem',
            fontSize: '0.875rem',
            color: '#6b7280'
          }}>
            We know price is important for you. However we are not legally allowed to display actual pricing. We know that sucks. But to make things better, our Price Scores give you an indication of how expensive a product would be based on your selections.
          </div>
        </div>
      ) : (
        <p style={{ textAlign: 'center', color: '#6b7280' }}>
          No insurance products found matching your criteria. Try selecting fewer features or adjusting your requirements.
        </p>
      )}
    </div>
  );

  const renderLoading = () => (
    <div style={{ textAlign: 'center', padding: '2rem' }}>
      <h2 style={sectionTitleStyle}>Finding the best insurance for you...</h2>
      <p style={sectionDescStyle}>Please wait while we compare products</p>
    </div>
  );

  const maxSteps = quizData.priority === 'Features' ? 5 : 4;
  const currentStep = showResults ? maxSteps : step;

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        {!showResults && (
          <div>
            <h1 style={titleStyle}>Car Insurance Comparison</h1>
            <p style={subtitleStyle}>Find the best insurance for you</p>
          </div>
        )}
        
        {loading && renderLoading()}
        {!loading && !showResults && step === 0 && renderStateSelection()}
        {!loading && !showResults && step === 1 && renderAgeSelection()}
        {!loading && !showResults && step === 2 && renderGenderSelection()}
        {!loading && !showResults && step === 3 && renderPrioritySelection()}
        {!loading && !showResults && step === 4 && renderFeatureSelection()}
        {!loading && showResults && renderResults()}
        
        {!showResults && !loading && (
          <div style={bottomStyle}>
            {step > 0 && (
              <button
                onClick={() => setStep(step - 1)}
                style={backButtonStyle}
              >
                Back
              </button>
            )}
            <div style={dotsStyle}>
              {Array.from({ length: maxSteps }, (_, index) => (
                <div
                  key={index}
                  style={dotStyle(currentStep === index)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
      <ScoreExplanationModal />

      <ComparisonModal />

    </div>
  );
};

export default InsuranceQuiz;
