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

  const states: AustralianState[] = ['NSW', 'VIC', 'TAS', 'WA', 'SA', 'QLD'];
  const ageGroups: AgeGroup[] = ['< 25 years', '< 35 years', '< 65 years'];
  const genders: Gender[] = ['Male', 'Female', 'Other'];
  const availableFeatures: SelectedFeature[] = ['STORM', 'WINDSCREEN', 'PERSONAL_EFFECTS', 'ACCIDENTAL_DAMAGE', 'NEW_CAR_REPLACEMENT'];

  // Load insurance data on component mount
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

  const tdStyle: React.CSSProperties = {
    padding: '16px 12px',
    borderBottom: '1px solid #e5e7eb',
    color: '#374151',
    verticalAlign: 'middle',
  };

  // Helper function to get color for feature score
  const getFeatureScoreColor = (score: number): string => {
    if (score >= 8.0) return '#10b981'; // Green for excellent
    if (score >= 6.0) return '#f59e0b'; // Orange for good
    if (score >= 4.0) return '#ef4444'; // Red for fair
    return '#6b7280'; // Gray for poor
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
      if (percentage >= 80) return '#10b981'; // Green
      if (percentage >= 60) return '#f59e0b'; // Orange/Yellow
      if (percentage >= 40) return '#ef4444'; // Red
      return '#6b7280'; // Gray
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
        <div style={{ overflowX: 'auto' }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Insurance Provider</th>
                <th style={thStyle}>Price Rating</th>
                <th style={thStyle}>Feature Score</th>
                <th style={thStyle}>Dynamic Finder Score</th>
                {quizData.priority === 'Features' && (
                  <th style={thStyle}>Key Features</th>
                )}
              </tr>
            </thead>
            <tbody>
              {filteredProducts.slice(0, 10).map((product) => (
                <tr key={product.id}>
                  <td style={tdStyle}>
                    <strong>{product.name}</strong>
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
                        }}>
                          {product.dynamicFinderScore.toFixed(1)}
                        </span>
                      )}
                    </div>
                  </td>
                  {quizData.priority === 'Features' && (
                    <td style={tdStyle}>
                      <div style={{ fontSize: '0.875rem' }}>
                        {product.features.newCarReplacement && <span style={{ color: '#059669' }}>✓ New Car Replacement</span>}
                        {product.features.roadsideAssistance && <span style={{ color: '#059669', marginLeft: '8px' }}>✓ Roadside Assistance</span>}
                        {product.features.storm && <span style={{ color: '#059669', marginLeft: '8px' }}>✓ Storm Coverage</span>}
                        {product.features.windscreen && <span style={{ color: '#059669', marginLeft: '8px' }}>✓ Windscreen</span>}
                        {product.features.accidentalDamage && <span style={{ color: '#059669', marginLeft: '8px' }}>✓ Accidental Damage</span>}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          
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
    </div>
  );
};

export default InsuranceQuiz;
