import React, { useState, useEffect } from 'react';
import Slider from './Slider';

type FeatureType = 'number' | 'binary';

interface FeatureMetadata {
  name: string;
  label: string;
  type: FeatureType;
  min?: number;
  max?: number;
}

type ModelWeights = Record<string, number>;
type FormDataState = Record<string, number>;
type DistributionData = Record<string, { counts: number[], bin_edges: number[] }>;

const DEFAULT_FORM_DATA: FormDataState = {
  age: 37,
  smoking_years: 45,
  passive_smoking: 0,
  air_pollution_index: 49,
  occupational_exposure: 0,
  radon_exposure: 1,
  family_history_cancer: 0,
  copd: 0,
  chronic_cough: 1,
  shortness_of_breath: 0,
  bmi: 20,
  oxygen_saturation: 95,
  crp_level: 10,
  xray_abnormal: 1,
  exercise_hours_per_week: 4,
  diet_quality: 3,
  healthcare_access: 2
};

const FEATURE_METADATA: FeatureMetadata[] = [
  { name: "crp_level", label: "C-reactive protein level indicating inflammation", type: "number", min: 0, max: 33 },
  { name: "smoking_years", label: "Total number of years the individual has smoked", type: "number", min: 0, max: 52 },
  { name: "age", label: "Age of the individual in years", type: "number", min: 18, max: 90 },
  { name: "xray_abnormal", label: "Abnormal findings in chest imaging", type: "binary" },
  { name: "air_pollution_index", label: "Air quality index representing long-term pollution exposure", type: "number", min: 20, max: 130 },
  { name: "oxygen_saturation", label: "Blood oxygen saturation level (%)", type: "number", min: 85, max: 100 },
  { name: "copd", label: "Diagnosis of chronic obstructive pulmonary disease", type: "binary" },
  { name: "family_history_cancer", label: "Family history of cancer", type: "binary" },
  { name: "chronic_cough", label: "Presence of long-term cough symptoms", type: "binary" },
  { name: "occupational_exposure", label: "Exposure to hazardous substances at work", type: "binary" },
  { name: "exercise_hours_per_week", label: "Average weekly physical activity duration", type: "number", min: 0, max: 10 },
  { name: "passive_smoking", label: "Exposure to secondhand smoke", type: "binary" },
  { name: "healthcare_access", label: "Access to healthcare services (1 = poor, 5 = excellent)", type: "number", min: 1, max: 5 },
  { name: "diet_quality", label: "Overall dietary quality score (1 = poor, 5 = excellent)", type: "number", min: 1, max: 5 },
  { name: "radon_exposure", label: "History of radon exposure", type: "binary" },
  { name: "bmi", label: "Body mass index category value", type: "number", min: 16, max: 37 },
  { name: "shortness_of_breath", label: "Presence of breathing difficulty", type: "binary" }
];

const getRiskColor = (prob: number) => {
  if (prob < 0.3) return '#4ade80'; // Bright Green
  if (prob < 0.7) return '#facc15'; // Bright Yellow
  return '#ef4444'; // Bright Red
};

function App() {
  const [weights, setWeights] = useState<ModelWeights | null>(null);
  const [distributions, setDistributions] = useState<DistributionData | null>(null);
  const [formData, setFormData] = useState<FormDataState>(DEFAULT_FORM_DATA);
  const [prediction, setPrediction] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.body.style.backgroundColor = '#0f172a';
    document.body.style.color = '#f8fafc';
    
    Promise.all([
      fetch(`${import.meta.env.BASE_URL}ols_weights.json`).then(res => {
        if (!res.ok) throw new Error("Could not load weights.");
        return res.json();
      }),
      fetch(`${import.meta.env.BASE_URL}ols_weights_features.json`).then(res => {
        if (!res.ok) throw new Error("Could not load features list.");
        return res.json();
      }),
      fetch(`${import.meta.env.BASE_URL}feature_distributions.json`).then(res => {
        if (!res.ok) return null; // Make distributions optional
        return res.json();
      })
    ])
      .then(([weightsData, featuresData, distributionsData]) => {
        const weightsMap: ModelWeights = {};

        if (Array.isArray(weightsData) && Array.isArray(featuresData)) {
          featuresData.forEach((featureName: string, index: number) => {
            weightsMap[featureName] = weightsData[index];
          });
        }
        else if (typeof weightsData === 'object' && !Array.isArray(weightsData)) {
          const keys = Object.keys(weightsData);
          if (keys.length > 0 && typeof weightsData[keys[0]] === 'object') {
             Object.assign(weightsMap, weightsData[keys[0]]);
          } else {
             Object.assign(weightsMap, weightsData);
          }
        }

        console.log("Successfully mapped weights:", weightsMap);
        setWeights(weightsMap);
        if (distributionsData) {
            setDistributions(distributionsData);
        }
      })
      .catch(err => setError(err instanceof Error ? err.message : String(err)));
  }, []);

  useEffect(() => {
    if (!weights) return;

    let z = weights['const'] || 0;

    FEATURE_METADATA.forEach(feature => {
      const weight = weights[feature.name] || 0;
      const inputValue = formData[feature.name] || 0;
      z += (weight * inputValue);
    });

    const probability = 1 / (1 + Math.exp(-z));
    setPrediction(probability);
  }, [formData, weights]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>, feature: FeatureMetadata) => {
    const value = feature.type === 'binary'
      ? (e.target.checked ? 1 : 0)
      : parseFloat(e.target.value) || 0;

    setFormData(prev => ({ ...prev, [feature.name]: value }));
  };

  if (error) return <div style={{ color: '#ef4444', padding: '20px' }}>Error: {error}</div>;
  if (!weights) return <div style={{ padding: '20px' }}>Loading model weights...</div>;

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px', fontFamily: 'sans-serif', backgroundColor: '#0f172a', minHeight: '100vh', color: '#f8fafc' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <h1 style={{ margin: 0, fontSize: '28px' }}>Lung Cancer Risk Predictor</h1>
        <a 
          href="https://github.com/migue-rc/biostatistics" 
          target="_blank" 
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            backgroundColor: '#3b82f6',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '6px',
            fontWeight: 'bold',
            fontSize: '14px',
            transition: 'background-color 0.2s'
          }}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
        >
          <svg height="20" width="20" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path>
          </svg>
          View Research on GitHub
        </a>
      </div>
      
      <p style={{ marginBottom: '30px', color: '#94a3b8' }}>Adjust the parameters below to automatically calculate the estimated risk using our Logistic Regression model. Options are ordered by their relative impact on the prediction.</p>

      {prediction !== null && (
        <div style={{
          position: 'sticky',
          top: '20px',
          zIndex: 100,
          padding: '25px',
          margin: '0 0 40px 0',
          backgroundColor: '#1e293b',
          borderRadius: '16px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          border: `2px solid ${getRiskColor(prediction)}`,
          transition: 'border-color 0.4s ease'
        }}>
          <h2 style={{ margin: '0 0 10px 0', color: '#cbd5e1', fontSize: '20px', textTransform: 'uppercase', letterSpacing: '1px' }}>Estimated Risk</h2>
          <div style={{ fontSize: '56px', fontWeight: '900', color: getRiskColor(prediction), textShadow: '0 2px 10px rgba(0,0,0,0.5)', transition: 'color 0.4s ease' }}>
            {(prediction * 100).toFixed(1)}%
          </div>
          <div style={{ width: '100%', height: '12px', backgroundColor: '#0f172a', borderRadius: '6px', marginTop: '15px', overflow: 'hidden', border: '1px solid #334155' }}>
            <div style={{ 
              width: `${prediction * 100}%`, 
              height: '100%', 
              backgroundColor: getRiskColor(prediction),
              transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.4s ease',
              boxShadow: '0 0 10px rgba(0,0,0,0.5)'
            }} />
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gap: '20px' }}>
        {FEATURE_METADATA.map((feature) => (
          <div key={feature.name} style={{ display: 'flex', flexDirection: 'column', padding: '20px', backgroundColor: '#1e293b', borderRadius: '12px', border: '1px solid #334155', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)' }}>
            {feature.type === 'binary' ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontWeight: '600', fontSize: '15px', color: '#f8fafc', flex: 1 }}>
                  {feature.label}
                </label>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '8px', fontWeight: 'bold', color: '#f8fafc' }}>
                  <input
                    type="checkbox"
                    checked={formData[feature.name] === 1}
                    onChange={(e) => handleInputChange(e, feature)}
                    style={{ width: '24px', height: '24px', cursor: 'pointer', accentColor: '#3b82f6' }}
                  /> Yes
                </label>
              </div>
            ) : (
              <Slider
                label={feature.label}
                value={formData[feature.name]}
                min={feature.min}
                max={feature.max}
                step={feature.name === 'bmi' || feature.name === 'crp_level' ? "any" : 1}
                onChange={(val) => setFormData(prev => ({ ...prev, [feature.name]: val }))}
                distribution={distributions?.[feature.name]}
              />
            )}
          </div>
        ))}
      </div>

    </div>
  );
}

export default App;