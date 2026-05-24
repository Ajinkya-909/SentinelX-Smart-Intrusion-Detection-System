"""
Vector utilities for converting feature vectors to numpy arrays.
Handles conversion, validation, and preparation for ML models.
"""

import numpy as np
from typing import List, Dict, Tuple
import logging

logger = logging.getLogger(__name__)


def extract_feature_values(
    feature_dicts: List[Dict],
    selected_features: List[str]
) -> Tuple[np.ndarray, List[str]]:
    """
    Extract feature values from list of feature dictionaries.
    
    Args:
        feature_dicts: List of feature dictionaries
        selected_features: List of feature names to extract
        
    Returns:
        Tuple of (numpy array, entities)
    """
    if not feature_dicts:
        return np.array([]), []
    
    entities = []
    values_list = []
    
    for feature_dict in feature_dicts:
        entity = feature_dict.get("entity", "unknown")
        entities.append(entity)
        
        # Extract values for selected features
        values = []
        for feature_name in selected_features:
            value = feature_dict.get(feature_name, 0.0)
            # Handle None and NaN
            if value is None:
                value = 0.0
            values.append(float(value))
        
        values_list.append(values)
    
    return np.array(values_list, dtype=np.float64), entities


def get_numeric_features(feature_dict: Dict) -> List[str]:
    """
    Extract numeric feature names from a feature dictionary.
    
    Args:
        feature_dict: Dictionary with features
        
    Returns:
        List of numeric feature names
    """
    numeric_features = []
    
    for key, value in feature_dict.items():
        if key in ["entity", "timestamp", "jobId", "isNightTime", "isWeekend"]:
            continue
        
        if isinstance(value, (int, float)) and not isinstance(value, bool):
            numeric_features.append(key)
    
    return numeric_features


def validate_vector_shape(
    X: np.ndarray,
    expected_features: int = None
) -> bool:
    """
    Validate numpy array shape for ML models.
    
    Args:
        X: Numpy array
        expected_features: Expected number of features (columns)
        
    Returns:
        True if valid, False otherwise
    """
    if X.size == 0:
        logger.warning("Empty array provided for validation")
        return False
    
    if len(X.shape) != 2:
        logger.error(f"Invalid array shape: {X.shape}, expected 2D array")
        return False
    
    if expected_features and X.shape[1] != expected_features:
        logger.error(
            f"Feature count mismatch: got {X.shape[1]}, expected {expected_features}"
        )
        return False
    
    return True


def handle_nan_inf(X: np.ndarray, fill_value: float = 0.0) -> np.ndarray:
    """
    Handle NaN and Inf values in numpy array.
    
    Args:
        X: Numpy array
        fill_value: Value to fill NaN/Inf with
        
    Returns:
        Cleaned numpy array
    """
    X = np.nan_to_num(X, nan=fill_value, posinf=fill_value, neginf=fill_value)
    return X
