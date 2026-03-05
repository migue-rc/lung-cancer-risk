# Biostatistics: Lung Cancer Risk Analysis
[Lung Cancer Prediction](https://www.kaggle.com/datasets/dhrubangtalukdar/lung-cancer-prediction-dataset) from [Kaggle.com](https://www.kaggle.com)

A Python-based biostatistics project focused on analyzing and predicting lung cancer risk factors using statistical modeling and machine learning techniques.

## Project Overview

This project provides an exploratory and predictive analysis of a comprehensive lung cancer dataset (`data/lung_cancer.csv`). The primary analysis is driven through Jupyter Notebooks, supported by a suite of custom statistical utility functions designed to work alongside libraries like `statsmodels` and `scikit-learn`.

### Key Features

*   **Lung Cancer Analysis Notebook:** The `lung cancer.ipynb` notebook contains the core exploratory data analysis (EDA), feature engineering, and model training workflow aimed at predicting `lung_cancer_risk`.
*   **Custom Statsmodels Utilities (`statsmodels_utils`):** A custom Python module providing reusable statistical tools:
    *   **Feature Selection:** Functions for backward elimination, forward selection, stepwise selection, and best subset selection (`selection.py`).
    *   **Diagnostics:** Utilities for calculating Variance Inflation Factors (VIF) and dropping highly correlated features (`diagnostics.py`).
    *   **Plotting & Interpretability:** Comprehensive plotting tools including correlation heatmaps, coefficient visualizations, confusion matrices, and extensive SHAP integration (summary, bar, dependence, and waterfall plots) (`plotting.py`).
    *   **Wrappers:** Data preparation utilities (`wrappers.py`).

## Dataset

The `data/lung_cancer.csv` file contains over 5,000 records with detailed patient demographics, lifestyle factors, and medical history, including:
*   `age`, `gender`, `bmi`
*   `smoker`, `smoking_years`, `pack_years`
*   `air_pollution_index`, `occupational_exposure`, `radon_exposure`
*   `lung_cancer_risk` (Target Variable)

## Setup & Installation

This project uses [Poetry](https://python-poetry.org/) for dependency management and requires Python 3.12 or higher.

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd biostatistics
    ```

2.  **Install dependencies using Poetry:**
    ```bash
    poetry install
    ```
    *Note: This project relies on a local, editable installation of `statsmodels-utils`. Ensure the path specified in `pyproject.toml` (`/home/rev9/Development/sm_sutils`) is accessible or adjust it accordingly.*

3.  **Launch Jupyter Lab/Notebook:**
    ```bash
    poetry run jupyter lab
    ```

## Technologies Used

*   Python >= 3.12
*   Poetry
*   JupyterLab / IPython
*   Scikit-Learn & scikit-learn-intelex
*   SHAP (via custom plotting wrappers)

## Author

Miguel R. (miguel@debloat.us)