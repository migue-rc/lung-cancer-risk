import React, { useState, useEffect } from 'react';

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

// Your requested default values
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
  { name: "age", label: "Age of the individual in years", type: "number" },
  { name: "smoking_years", label: "Total number of years the individual has smoked", type: "number" },
  { name: "passive_smoking", label: "Exposure to secondhand smoke", type: "binary" },
  { name: "air_pollution_index", label: "Air quality index representing long-term pollution exposure", type: "number" },
  { name: "occupational_exposure", label: "Exposure to hazardous substances at work", type: "binary" },
  { name: "radon_exposure", label: "History of radon exposure", type: "binary" },
  { name: "family_history_cancer", label: "Family history of cancer", type: "binary" },
  { name: "copd", label: "Diagnosis of chronic obstructive pulmonary disease", type: "binary" },
  { name: "chronic_cough", label: "Presence of long-term cough symptoms", type: "binary" },
  { name: "shortness_of_breath", label: "Presence of breathing difficulty", type: "binary" },
  { name: "bmi", label: "Body mass index category value", type: "number" },
  { name: "oxygen_saturation", label: "Blood oxygen saturation level (%)", type: "number" },
  { name: "crp_level", label: "C-reactive protein level indicating inflammation", type: "number" },
  { name: "xray_abnormal", label: "Abnormal findings in chest imaging", type: "binary" },
  { name: "exercise_hours_per_week", label: "Average weekly physical activity duration", type: "number" },
  { name: "diet_quality", label: "Overall dietary quality score (1 = poor, 5 = excellent)", type: "number", min: 1, max: 5 },
  { name: "healthcare_access", label: "Access to healthcare services (1 = poor, 5 = excellent)", type: "number", min: 1, max: 5 }
];

function App() {
  const [weights, setWeights] = useState<ModelWeights | null>(null);
  // Initialize state directly with your defaults
  const [formData, setFormData] = useState<FormDataState>(DEFAULT_FORM_DATA);
  const [prediction, setPrediction] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}ols_weights.json`)
      .then(res => {
        if (!res.ok) throw new Error("Could not load weights file.");
        return res.json();
      })
      .then((data: ModelWeights) => {
        setWeights(data);
      })
      .catch(err => setError(err instanceof Error ? err.message : String(err)));
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>, feature: FeatureMetadata) => {
    const value = feature.type === 'binary'
      ? (e.target.checked ? 1 : 0)
      : parseFloat(e.target.value) || 0;

    setFormData(prev => ({ ...prev, [feature.name]: value }));
  };

  const calculatePrediction = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!weights) return;

    let z = weights['const'] || 0;

    FEATURE_METADATA.forEach(feature => {
      const weight = weights[feature.name] || 0;
      const inputValue = formData[feature.name] || 0;
      z += (weight * inputValue);
    });

    const probability = 1 / (1 + Math.exp(-z));
    setPrediction(probability);
  };

  if (error) return <div style={{ color: 'red', padding: '20px' }}>Error: {error}</div>;
  if (!weights) return <div style={{ padding: '20px' }}>Loading model weights...</div>;

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>Lung Cancer Risk Predictor</h1>
      <p>Fill out the parameters below to calculate the estimated risk using our Logistic Regression model.</p>

      <form onSubmit={calculatePrediction} style={{ display: 'grid', gap: '15px', marginBottom: '30px' }}>
        {FEATURE_METADATA.map((feature) => (
          <div key={feature.name} style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={{ fontWeight: 'bold', marginBottom: '5px' }}>
              {feature.label}
            </label>

            {feature.type === 'binary' ? (
              <label>
                <input
                  type="checkbox"
                  checked={formData[feature.name] === 1}
                  onChange={(e) => handleInputChange(e, feature)}
                /> Yes
              </label>
            ) : (
              <input
                type="number"
                step="any"
                min={feature.min}
                max={feature.max}
                value={formData[feature.name]}
                onChange={(e) => handleInputChange(e, feature)}
                style={{ padding: '8px', maxWidth: '200px' }}
              />
            )}
          </div>
        ))}

        <button
          type="submit"
          style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer', backgroundColor: '#0056b3', color: 'white', border: 'none', borderRadius: '4px', marginTop: '10px' }}
        >
          Calculate Risk
        </button>
      </form>

      {prediction !== null && (
        <div style={{ padding: '20px', backgroundColor: '#eef8ff', border: '1px solid #bce0fd', borderRadius: '4px' }}>
          <h2>Prediction Result</h2>
          <p style={{ fontSize: '24px', margin: 0 }}>
            Estimated Risk Probability: <strong>{(prediction * 100).toFixed(2)}%</strong>
          </p>
        </div>
      )}
    </div>
  );
}

export default App;