"""
DBSCAN model initialization and management.
"""

from sklearn.cluster import DBSCAN
import logging
import numpy as np

logger = logging.getLogger(__name__)


class DBSCANModel:
    """DBSCAN clustering model wrapper"""
    
    def __init__(self, eps: float = 0.3, min_samples: int = 5, metric: str = "euclidean"):
        """
        Initialize DBSCAN model.
        
        Args:
            eps: Maximum distance between samples in a cluster
            min_samples: Minimum samples to form a core point
            metric: Distance metric
        """
        self.eps = eps
        self.min_samples = min_samples
        self.metric = metric
        
        self.model = DBSCAN(
            eps=eps,
            min_samples=min_samples,
            metric=metric,
            n_jobs=None
        )
        
        logger.info(
            f"[DBSCAN] Initialized with eps={eps}, min_samples={min_samples}, metric={metric}"
        )
    
    def predict(self, X):
        """
        Predict clusters and anomalies.
        
        Args:
            X: Input data (n_samples, n_features)
            
        Returns:
            Labels (-1 = noise/anomaly, >= 0 = cluster ID)
        """
        n_samples = X.shape[0]
        
        # Determine min_samples dynamically based on batch size.
        # If we have at least 3 samples, we allow a cluster size of n_samples - 1.
        if n_samples >= 3:
            min_samples = max(2, min(self.min_samples, n_samples - 1))
        else:
            min_samples = max(2, min(self.min_samples, n_samples))
        
        if n_samples < 2:
            logger.info(f"[DBSCAN] Not enough samples ({n_samples}) to run DBSCAN. Returning normal labels.")
            return np.zeros(n_samples, dtype=int)

        # Use adjusted min_samples if dataset is small
        if min_samples != self.min_samples:
            model = DBSCAN(
                eps=self.eps,
                min_samples=min_samples,
                metric=self.metric,
                n_jobs=None
            )
        else:
            model = self.model

        labels = model.fit_predict(X)
        logger.debug(f"[DBSCAN] Predicted labels: {labels.shape}")
        return labels
    
    def get_anomaly_scores(self, X, labels):
        """
        Convert DBSCAN labels to anomaly scores (0-1).
        
        Args:
            X: Input data (n_samples, n_features)
            labels: DBSCAN labels from predict
            
        Returns:
            Anomaly scores (higher = more anomalous)
        """
        n_samples = X.shape[0]
        scores = np.zeros(n_samples)

        if n_samples < 2:
            return scores
            
        # If DBSCAN labels all points as noise/outliers (meaning no clusters could be formed),
        # then we have no normal baseline to compare against. To avoid false positive storms
        # on small or highly sparse batches, we set all anomaly scores to 0.0.
        if np.all(labels == -1):
            logger.info("[DBSCAN] All points labeled as noise. Setting all anomaly scores to 0.0.")
            return scores

        if n_samples >= 3:
            min_samples = max(2, min(self.min_samples, n_samples - 1))
        else:
            min_samples = max(2, min(self.min_samples, n_samples))
        
        # Calculate distances to neighbors
        from sklearn.neighbors import NearestNeighbors
        
        try:
            neighbors = NearestNeighbors(n_neighbors=min_samples)
            neighbors.fit(X)
            distances, indices = neighbors.kneighbors(X)
            
            # k-distance (distance to min_samples-th nearest neighbor)
            k_distances = distances[:, -1]
            
            # Normalize k-distances to 0-1
            if k_distances.max() > 0:
                k_distances_norm = k_distances / k_distances.max()
            else:
                k_distances_norm = np.zeros(n_samples)
            
            # Assign scores
            for i in range(n_samples):
                if labels[i] == -1:  # Noise point
                    scores[i] = 0.65  # Moderate anomaly score for outliers
                else:  # In cluster
                    # Score based on distance, scaled to keep it in LOW/MEDIUM risk
                    scores[i] = k_distances_norm[i] * 0.3
            
            logger.debug(f"[DBSCAN] Computed anomaly scores: {scores.shape}")
            return scores
        except Exception as e:
            logger.error(f"[DBSCAN] Error computing anomaly scores: {str(e)}")
            # Fallback: use labels directly
            scores = np.zeros(n_samples)
            for i in range(n_samples):
                scores[i] = 0.65 if labels[i] == -1 else 0.1
            return scores


# Create global model instance
dbscan_model = DBSCANModel()
