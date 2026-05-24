"""
Configuration settings for ML service.
Contains thresholds, model parameters, and other configuration.
"""

import os
from typing import Dict

# ===== ISOLATION FOREST CONFIGURATION =====
ISOLATION_FOREST_ENABLED = True
ISOLATION_FOREST_CONTAMINATION = float(os.getenv("IF_CONTAMINATION", "0.05"))
ISOLATION_FOREST_N_ESTIMATORS = int(os.getenv("IF_N_ESTIMATORS", "100"))
ISOLATION_FOREST_RANDOM_STATE = 42

# ===== DBSCAN CONFIGURATION =====
DBSCAN_ENABLED = True
DBSCAN_EPS = float(os.getenv("DBSCAN_EPS", "0.3"))
DBSCAN_MIN_SAMPLES = int(os.getenv("DBSCAN_MIN_SAMPLES", "5"))
DBSCAN_METRIC = "euclidean"

# ===== RISK THRESHOLD MAPPING =====
RISK_THRESHOLDS: Dict[str, float] = {
    "CRITICAL": 0.8,
    "HIGH": 0.6,
    "MEDIUM": 0.4,
    "LOW": 0.2,
}

# ===== FEATURE SCALING =====
SCALING_ENABLED = True
SCALING_METHOD = "StandardScaler"  # StandardScaler or MinMaxScaler

# ===== PREPROCESSING =====
FILL_NAN_VALUE = 0.0  # Fill NaN values with this
FILL_INF_VALUE = 0.0  # Fill Inf values with this

# ===== LOGGING =====
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
LOG_ML_REQUESTS = True
LOG_ML_RESPONSES = True

# ===== BATCH PROCESSING =====
MAX_VECTORS_PER_REQUEST = int(os.getenv("MAX_VECTORS", "10000"))

# ===== MODEL PATHS =====
MODEL_DIR = os.path.join(os.path.dirname(__file__), "..", "models", "data")
os.makedirs(MODEL_DIR, exist_ok=True)
