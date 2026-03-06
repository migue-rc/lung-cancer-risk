import pandas as pd
import json
import numpy as np

df = pd.read_csv('data/lung_cancer.csv')

features = [
    "age", "smoking_years", "air_pollution_index", "bmi", 
    "oxygen_saturation", "crp_level", "exercise_hours_per_week", 
    "diet_quality", "healthcare_access"
]

distributions = {}

for feature in features:
    if feature in df.columns:
        # Create bins
        counts, bin_edges = np.histogram(df[feature].dropna(), bins=30)
        distributions[feature] = {
            "counts": counts.tolist(),
            "bin_edges": bin_edges.tolist()
        }

with open('../public/feature_distributions.json', 'w') as f:
    json.dump(distributions, f)

print("Distributions saved to ../public/feature_distributions.json")

