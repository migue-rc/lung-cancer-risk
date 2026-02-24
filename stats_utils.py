#  Copyright (c) 2026. Miguel R.
#  This copyright is intended to be included here to enhance the value of the project.

# stats_utils.py

import itertools
import math
import matplotlib.pyplot as plt
import pandas as pd
import numpy as np
import seaborn as sns

def prep_data(df, target_col):
    """
    Prepares a dataframe for statsmodels by dropping missing values
    and converting text columns to numeric dummy variables.
    """
    print("Preparing data for statsmodels...")

    # 1. Drop rows where the target variable is missing (you can't train on these)
    df_clean = df.dropna(subset=[target_col]).copy()

    # 2. Fill or drop remaining missing features
    # (For simplicity here, we drop them, but you could impute them)
    df_clean = df_clean.dropna()

    # 3. Convert text/categorical columns to numeric (0s and 1s)
    # drop_first=True is CRITICAL to avoid the "dummy variable trap" (perfect multicollinearity)
    df_clean = pd.get_dummies(df_clean, drop_first=True, dtype=float)

    # 4. Separate features (X) and target (y)
    X = df_clean.drop(target_col, axis=1)
    y = df_clean[target_col]

    print(f"Data prepped! Final shape - X: {X.shape}, y: {y.shape}\n")
    return X, y


def backward_elimination_logit(X, y, significance_level=0.05):
    """
    Performs backward elimination for a logistic regression model.
    """
    X_opt = sm.add_constant(X)
    features = list(X_opt.columns)

    print("Starting Backward Elimination...")
    print("-" * 40)

    while True:
        model = sm.Logit(y, X_opt[features]).fit(disp=False)
        p_values = model.pvalues
        p_values_features = p_values.drop('const', errors='ignore')

        if len(p_values_features) == 0:
            print("No more features left after backward elimination.")
            break

        max_p_value = p_values_features.max()
        max_p_feature = p_values_features.idxmax()

        if max_p_value > significance_level:
            features.remove(max_p_feature)
            print(f"Dropped: '{max_p_feature}' (p-value: {max_p_value:.4f})")
        else:
            break

    final_model = sm.Logit(y, X_opt[features]).fit(disp=False)

    print("-" * 40)
    print("Backward Elimination Complete!")
    print(f"Remaining features: {len(features) - 1}")

    return final_model, features


def best_subset_selection(X, y, max_features=5):
    """
    Evaluates all possible combinations of features strictly up to max_features.
    Uses AIC to find the best performing subset of variables.
    """
    X_opt = sm.add_constant(X)
    features = list(X.columns)

    # Safety: Ensure max_features isn't larger than your actual column count
    max_features = min(max_features, len(features))

    # Calculate exactly how many models we are about to train
    total_models = sum([math.comb(len(features), k) for k in range(1, max_features + 1)])

    print(f"Starting Best Subset Selection on {len(features)} features.")
    print(f"Testing combinations up to {max_features} features at a time.")
    print(f"Total models to train: {total_models:,}")
    print("-" * 40)

    best_aic = np.inf
    best_features = []
    best_model = None

    # THE FIX: We now loop up to max_features, NOT len(features)
    for k in range(1, max_features + 1):
        print(f"Evaluating subsets of size {k}...")

        # Generate combinations of exact size 'k'
        for combo in itertools.combinations(features, k):
            combo_list = list(combo)
            cols_to_train = ['const'] + combo_list

            try:
                # Train the model silently
                model = sm.Logit(y, X_opt[cols_to_train]).fit(disp=False)

                # If this model has a better (lower) AIC, save it!
                if model.aic < best_aic:
                    best_aic = model.aic
                    best_features = combo_list
                    best_model = model
            except Exception:
                # If a specific subset fails to mathematically converge, skip it
                continue

    print("-" * 40)
    print("Best Subset Selection Complete!")
    print(f"Best AIC Score: {best_aic:.2f}")
    print(f"Optimal features ({len(best_features)}): {best_features}")

    return best_model, best_features


from statsmodels.stats.outliers_influence import variance_inflation_factor


def calculate_and_drop_vif(X, threshold=5.0):
    """
    Iteratively removes features with a VIF score above the threshold.

    Parameters:
    X (DataFrame): Your independent variables.
    threshold (float): The VIF cutoff (5.0 is standard).

    Returns:
    X_clean: A new DataFrame with the highly collinear variables removed.
    dropped_features: A list of the variables that were removed.
    """
    # 1. We must add a constant for statsmodels to calculate VIF correctly
    X_temp = sm.add_constant(X)
    dropped_features = []

    print("Starting VIF Multicollinearity Check...\n")
    print("-" * 40)

    # 2. Start the iterative dropping loop
    while True:
        # Create a DataFrame to hold the VIF results
        vif_data = pd.DataFrame()
        vif_data["Feature"] = X_temp.columns

        # Calculate VIF for each feature
        vif_data["VIF"] = [
            variance_inflation_factor(X_temp.values, i)
            for i in range(X_temp.shape[1])
        ]

        # Isolate features (ignore the 'const' baseline)
        vif_features = vif_data[vif_data["Feature"] != "const"]

        # Find the feature with the absolute highest VIF
        max_vif_value = vif_features["VIF"].max()
        max_vif_feature = vif_features.loc[vif_features["VIF"].idxmax(), "Feature"]

        # 3. Check against the threshold
        if max_vif_value > threshold:
            # Drop the worst feature from our working dataset
            X_temp = X_temp.drop(max_vif_feature, axis=1)
            dropped_features.append(max_vif_feature)
            print(f"Dropped collinear feature: '{max_vif_feature}' (VIF: {max_vif_value:.2f})")
        else:
            # If the highest VIF is below our threshold, we are clean!
            break

    print("-" * 40)
    print("VIF Check Complete!")
    print(f"Features dropped: {len(dropped_features)}")

    # 4. Return the cleaned DataFrame (removing the 'const' so it matches your original format)
    X_clean = X_temp.drop("const", axis=1)

    return X_clean, dropped_features


def forward_selection_logit(X, y, significance_level=0.05):
    """
    Performs Forward Selection for a logistic regression model.
    Starts with an empty model and adds the most significant feature one by one.

    Parameters:
    X (DataFrame): The feature columns
    y (Series): The target column
    significance_level (float): P-value threshold to ADD a feature

    Returns:
    final_model: The fitted statsmodels Logit model
    included: A list of the final selected features
    """
    included = []  # Starts completely empty

    print("Starting Forward Selection...\n")
    print("-" * 40)

    while True:
        changed = False

        # Identify which columns haven't been added yet
        excluded = list(set(X.columns) - set(included))

        # Create a series to store the p-values of the excluded features
        new_pval = pd.Series(index=excluded, dtype=float)

        # Test each excluded feature one by one
        for new_column in excluded:
            # Create a temporary list of features to test: current winners + 1 new one
            cols = included + [new_column]

            # Always add the constant for statsmodels
            X_temp = sm.add_constant(X[cols])

            try:
                # Fit the model and extract the p-value of the newly added feature
                model = sm.Logit(y, X_temp).fit(disp=False)
                new_pval[new_column] = model.pvalues[new_column]
            except Exception:
                # If the math fails to converge, assign a terrible score to skip it
                new_pval[new_column] = np.inf

        # If we successfully tested features
        if not new_pval.empty:
            best_pval = new_pval.min()

            # If the absolute best feature is statistically significant, add it!
            if best_pval < significance_level:
                best_feature = new_pval.idxmin()
                included.append(best_feature)
                changed = True
                print(f"Added: '{best_feature}' (p-value: {best_pval:.4f})")

        # If we went through all remaining features and nothing was good enough to add, stop
        if not changed:
            break

    print("-" * 40)
    print("Forward Selection Complete!")
    print(f"Final number of features: {len(included)}")

    # Fit and return the final model with the winning features
    if len(included) > 0:
        final_X = sm.add_constant(X[included])
        final_model = sm.Logit(y, final_X).fit(disp=False)
    else:
        print("Warning: No features were found to be statistically significant.")
        final_model = None

    return final_model, included


import statsmodels.api as sm


def stepwise_selection_logit(X, y, threshold_in=0.05, threshold_out=0.05):
    """
    Performs Stepwise Selection for a logistic regression model.
    Adds the best features one by one, and drops any that become insignificant.

    Parameters:
    X (DataFrame): The feature columns (your ~40 variables)
    y (Series): The target column (1 for Claimed, 0 for Not Claimed)
    threshold_in (float): P-value threshold to ADD a feature
    threshold_out (float): P-value threshold to DROP a feature

    Returns:
    final_model: The fitted statsmodels Logit model
    included: A list of the final selected features
    """
    included = []  # This list will hold the features currently in our model

    print("Starting Stepwise Selection...\n")
    print("-" * 40)

    while True:
        changed = False

        # --------------------------------------------------
        # PHASE 1: FORWARD STEP (Try to add the best variable)
        # --------------------------------------------------
        excluded = list(set(X.columns) - set(included))
        new_pval = pd.Series(index=excluded, dtype=float)

        # Test every excluded variable one by one
        for new_column in excluded:
            cols = included + [new_column]
            X_temp = sm.add_constant(X[cols])
            try:
                model = sm.Logit(y, X_temp).fit(disp=False)
                new_pval[new_column] = model.pvalues[new_column]
            except Exception:
                # If a combination fails the complex math, assign a terrible score to skip it
                new_pval[new_column] = np.inf

                # If we found at least one valid feature to test
        if not new_pval.empty:
            best_pval = new_pval.min()

            # If the best feature is statistically significant, add it!
            if best_pval < threshold_in:
                best_feature = new_pval.idxmin()
                included.append(best_feature)
                changed = True
                print(f"Added:   '{best_feature}' (p-value: {best_pval:.4f})")

        # --------------------------------------------------
        # PHASE 2: BACKWARD STEP (Check if any included variables went bad)
        # --------------------------------------------------
        if len(included) > 0:
            X_temp = sm.add_constant(X[included])
            model = sm.Logit(y, X_temp).fit(disp=False)

            # Get p-values for included features (ignoring the constant)
            pvals = model.pvalues.drop('const', errors='ignore')
            worst_pval = pvals.max()

            # If the worst feature is no longer significant, drop it!
            if worst_pval > threshold_out:
                worst_feature = pvals.idxmax()
                included.remove(worst_feature)
                changed = True
                print(f"Dropped: '{worst_feature}' (p-value: {worst_pval:.4f})")

        # If we went through both phases and nothing was added or dropped, we are done!
        if not changed:
            break

    # --------------------------------------------------
    # PHASE 3: FINAL FIT
    # --------------------------------------------------
    print("-" * 40)
    print("Stepwise Selection Complete!")
    print(f"Final number of features: {len(included)}")

    # Train the final model with the winning features
    final_X = sm.add_constant(X[included])
    final_model = sm.Logit(y, final_X).fit(disp=False)

    return final_model, included


def drop_highly_correlated_pairs(X, y, threshold=0.80):
    """
    Finds pairs of highly correlated variables and drops the one
    that has a weaker correlation with the target variable.
    """
    print(f"Hunting for pairs with correlation > {threshold}...")

    # Calculate the correlation matrix
    corr_matrix = X.corr().abs()

    # Select the upper triangle of the matrix to avoid duplicates
    upper = corr_matrix.where(np.triu(np.ones(corr_matrix.shape), k=1).astype(bool))

    # Find features with correlation greater than the threshold
    to_drop = []

    for column in upper.columns:
        # Get all the rows that are highly correlated with this column
        highly_correlated_vars = upper.index[upper[column] > threshold].tolist()

        for row_var in highly_correlated_vars:
            # We found a red square! We have a pair: 'column' and 'row_var'
            if column not in to_drop and row_var not in to_drop:

                # Check how strongly each variable correlates with the target (y)
                corr_col_target = abs(y.corr(X[column]))
                corr_row_target = abs(y.corr(X[row_var]))

                # Drop the loser
                if corr_col_target > corr_row_target:
                    print(f"Tie-breaker: Kept '{column}', Dropped '{row_var}'")
                    to_drop.append(row_var)
                else:
                    print(f"Tie-breaker: Kept '{row_var}', Dropped '{column}'")
                    to_drop.append(column)

    # Drop the losers from the dataset
    X_clean = X.drop(columns=to_drop)
    print("-" * 40)
    print(f"Dropped {len(to_drop)} variables due to pairwise correlation.")

    return X_clean


def plot_coef(best_model, title='Impact of Features (Log-Odds)', xLabel='Coefficient Value'):
    df_coef = pd.DataFrame({
        'Coef': best_model.params,
        'Lower_CI': best_model.conf_int()[0],
        'Upper_CI': best_model.conf_int()[1]
    })

    df_coef = df_coef.drop('const')

    df_coef = df_coef.sort_values(by='Coef', ascending=True)

    error_lower = df_coef['Coef'] - df_coef['Lower_CI']
    error_upper = df_coef['Upper_CI'] - df_coef['Coef']

    plt.figure(figsize=(10, 6))

    plt.errorbar(x=df_coef['Coef'], y=df_coef.index,
                 xerr=[error_lower, error_upper],
                 fmt='o', color='royalblue', ecolor='lightgray',
                 elinewidth=3, capsize=0, markersize=8)

    plt.axvline(x=0, color='red', linestyle='--', linewidth=2)

    plt.title(title, fontsize=16, pad=20)
    plt.xlabel(xLabel, fontsize=12)
    plt.grid(axis='x', linestyle='--', alpha=0.5)

    plt.tight_layout()
    plt.show()

def plot_correlation_heatmap(df_features, title):
    """
    Plots a highly formatted, readable correlation heatmap for large datasets.
    """
    corr = df_features.corr()
    mask = np.triu(np.ones_like(corr, dtype=bool))
    plt.figure(figsize=(20, 16))

    sns.heatmap(
        corr,
        mask=mask,
        cmap='coolwarm',
        vmin=-1, vmax=1,
        square=True,
        linewidths=.5,
        cbar_kws={"shrink": .5}
    )

    plt.title(title, fontsize=20, pad=20)
    plt.tight_layout()
    plt.show()
