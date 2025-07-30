import { useState, useEffect } from 'react';
import { loadInsuranceData } from '../utils/csvLoader';
import { InsuranceProduct } from '../types';

const DataTest = () => {
  const [data, setData] = useState<InsuranceProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const insuranceData = await loadInsuranceData();
        setData(insuranceData);
        console.log('Loaded insurance data:', insuranceData);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) {
    return <div>Loading insurance data...</div>;
  }

  return (
    <div style={{ padding: '20px' }}>
      <h2>Insurance Data Test</h2>
      <p>Loaded {data.length} insurance products</p>
      {data.slice(0, 3).map((product) => (
        <div key={product.ID} style={{ 
          border: '1px solid #ccc', 
          margin: '10px 0', 
          padding: '10px',
          backgroundColor: '#f9f9f9'
        }}>
          <h3>{product.NAME}</h3>
          <p>Price Score: {product.PRICE_SCORE}</p>
          <p>Cover Score: {product.COVER_SCORE}</p>
          <p>NSW Female 30: ${product['2025-AUFCI-NSW-F-30']}</p>
        </div>
      ))}
    </div>
  );
};

export default DataTest; 