"""
Isolation Forest model initialization and management.
"""

from sklearn.ensemble import IsolationForest
import logging

logger = logging.getLogger(__name__)


class IsolationForestModel:
    """Isolation Forest ML model wrapper"""
    
    def __init__(self, contamination: float = 0.05, n_estimators: int = 100, random_state: int = 42):
        """
        Initialize Isolation Forest model.
        
        Args:
            contamination: Expected proportion of outliers
            n_estimators: Number of base estimators
            random_state: Random seed for reproducibility
        """
        self.contamination = contamination
        self.n_estimators = n_estimators
        self.random_state = random_state
        
        self.model = IsolationForest(
            contamination=contamination,
            n_estimators=n_estimators,
            random_state=random_state,
            n_jobs=-1
        )
        
        logger.info(
            f"[ISOLATION FOREST] Initialized with contamination={contamination}, n_estimators={n_estimators}"
        )
    
    def fit(self, X):
        """
        Fit the model on training data.
        
        Args:
            X: Training data (n_samples, n_features)
        """
        self.model.fit(X)
        logger.info("[ISOLATION FOREST] Model fitted")
    
    def predict(self, X):
        """
        Predict anomalies.
        
        Args:
            X: Input data (n_samples, n_features)
            
        Returns:
            Predictions (-1 = anomaly, 1 = normal)
        """
        predictions = self.model.predict(X)
        logger.debug(f"[ISOLATION FOREST] Predictions: {predictions.shape}")
        return predictions
    
    def decision_function(self, X):
        """
        Get anomaly scores.
        
        Args:
            X: Input data (n_samples, n_features)
            
        Returns:
            Anomaly scores (lower = more anomalous)
        """
        scores = self.model.decision_function(X)
        logger.debug(f"[ISOLATION FOREST] Decision function: {scores.shape}")
        return scores
    
    def score_samples(self, X):
        """
        Get anomaly scores (0-1 normalized).
        
        Args:
            X: Input data (n_samples, n_features)
            
        Returns:
            Normalized scores
        """
        scores = self.decision_function(X)
        # Normalize to 0-1 range
        # decision_function returns negative values for anomalies
        # We convert: -inf to 0 = anomaly, 0 to +inf = normal
        normalized_scores = 1.0 / (1.0 + np.exp(scores))
        return normalized_scores


import numpy as np

# Create global model instance
isolation_forest_model = IsolationForestModel()
