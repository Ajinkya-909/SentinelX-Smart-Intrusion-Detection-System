"""
Preprocessing service for feature scaling and normalization.
"""

import numpy as np
from sklearn.preprocessing import StandardScaler, MinMaxScaler
import logging

logger = logging.getLogger(__name__)


class PreprocessingService:
    """Handles feature scaling and normalization"""
    
    def __init__(self, method: str = "StandardScaler"):
        """
        Initialize preprocessing service.
        
        Args:
            method: Scaling method - 'StandardScaler' or 'MinMaxScaler'
        """
        self.method = method
        
        if method == "StandardScaler":
            self.scaler = StandardScaler()
        elif method == "MinMaxScaler":
            self.scaler = MinMaxScaler()
        else:
            logger.warning(f"Unknown method {method}, using StandardScaler")
            self.scaler = StandardScaler()
        
        logger.info(f"[PREPROCESSING] Initialized with {method}")
    
    def fit_transform(self, X: np.ndarray) -> np.ndarray:
        """
        Fit scaler on data and transform.
        
        Args:
            X: Input array (n_samples, n_features)
            
        Returns:
            Scaled array
        """
        try:
            # Handle NaN/Inf values
            X = np.nan_to_num(X, nan=0.0, posinf=0.0, neginf=0.0)
            
            # Fit and transform
            X_scaled = self.scaler.fit_transform(X)
            
            logger.debug(f"[PREPROCESSING] Fit-transformed {X.shape}")
            return X_scaled
        except Exception as e:
            logger.error(f"[PREPROCESSING] Error in fit_transform: {str(e)}")
            return X
    
    def transform(self, X: np.ndarray) -> np.ndarray:
        """
        Transform data using fitted scaler.
        
        Args:
            X: Input array (n_samples, n_features)
            
        Returns:
            Scaled array
        """
        try:
            # Handle NaN/Inf values
            X = np.nan_to_num(X, nan=0.0, posinf=0.0, neginf=0.0)
            
            # Transform
            X_scaled = self.scaler.transform(X)
            
            logger.debug(f"[PREPROCESSING] Transformed {X.shape}")
            return X_scaled
        except Exception as e:
            logger.error(f"[PREPROCESSING] Error in transform: {str(e)}")
            return X


# Global preprocessing service
preprocessing_service = PreprocessingService()
