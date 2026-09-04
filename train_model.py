import pandas as pd
import numpy as np
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, r2_score
import time
import joblib

print("🚀 Initializing Training Pipeline on RTX 4050...")

# 1. Load your 100,000 rows dataset
# Replace 'construction_delays_dataset.csv' with your actual filename
dataset_path = 'construction_delays_dataset.csv' 

try:
    df = pd.read_csv(dataset_path)
    if len(df) > 40000:
        df = df.iloc[:40000]
        print(f"✅ Successfully loaded dataset (sliced to {df.shape[0]} rows and {df.shape[1]} columns for fast training).")
    else:
        print(f"✅ Successfully loaded dataset with {df.shape[0]} rows and {df.shape[1]} columns.")
except FileNotFoundError:
    print(f"❌ Error: Could not find '{dataset_path}'. Please place your dataset in the project root.")
    exit()

# 2. Define Features (X) and Target (y)
# Modify 'target_delay_days' and drop columns that shouldn't be trained on (like IDs or text descriptions)
target_column = 'target_delay_days' # <--- Change this to your actual target column name

if target_column not in df.columns:
    print(f"❌ Error: Target column '{target_column}' not found in dataset. Check your CSV headers.")
    exit()

X = df.drop(columns=[target_column])
y = df[target_column]

# Handle non-numeric categorical columns if any exist
X = pd.get_dummies(X, drop_first=True)

# 3. Train/Test Split (80% Train, 20% Test)
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

print(f"📊 Training Set: {X_train.shape[0]} rows | Test Set: {X_test.shape[0]} rows")

# 4. Configure XGBoost Model with RTX 4050 GPU Acceleration
print("⚙️ Configuring XGBoost with CUDA support for RTX 4050...")
model = xgb.XGBRegressor(
    n_estimators=500,
    learning_rate=0.05,
    max_depth=6,
    tree_method='hist',     # Uses optimized histogram algorithm
    device='cuda',          # Forces computation onto your RTX 4050 GPU
    random_state=42
)

# 5. Train the Model
print("⏳ Training model on 100,000 rows (this will take just a few seconds on RTX 4050)...")
start_time = time.time()

model.fit(
    X_train, y_train,
    eval_set=[(X_test, y_test)],
    verbose=50
)

end_time = time.time()
print(f"🎉 Training completed in {end_time - start_time:.2f} seconds!")

# 6. Evaluate Model Performance
y_pred = model.predict(X_test)
mse = mean_squared_error(y_test, y_pred)
rmse = np.sqrt(mse)
r2 = r2_score(y_test, y_pred)

print("\n📈 --- Model Evaluation Metrics ---")
print(f"• Root Mean Squared Error (RMSE): {rmse:.4f} days")
print(f"• R² Score (Accuracy Fit): {r2:.4f}")

# 7. Save the Trained Model for your Backend Node.js / Python API
model_filename = 'schedule_variance_xgb_model.json'
model.save_model(model_filename)
print(f"💾 Trained model successfully saved to '{model_filename}'")