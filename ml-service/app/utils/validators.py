"""
Input validators for ML analysis requests.
"""

from typing import List, Dict
import logging

logger = logging.getLogger(__name__)


def validate_feature_vectors(vectors: List[Dict]) -> bool:
    """
    Validate list of feature vectors.
    
    Args:
        vectors: List of feature dictionaries
        
    Returns:
        True if valid, False otherwise
    """
    if not vectors:
        logger.warning("Empty vector list provided")
        return False
    
    if len(vectors) > 10000:
        logger.warning(f"Large vector list: {len(vectors)} vectors")
    
    for i, vector in enumerate(vectors):
        if "entity" not in vector:
            logger.error(f"Vector {i} missing 'entity' field")
            return False
        
        if not isinstance(vector["entity"], str):
            logger.error(f"Vector {i} 'entity' is not a string")
            return False
    
    return True


def validate_model_config(config: Dict) -> bool:
    """
    Validate model configuration.
    
    Args:
        config: Model configuration dictionary
        
    Returns:
        True if valid, False otherwise
    """
    if not config:
        return True  # Config is optional
    
    if "contamination" in config:
        if not 0 < config["contamination"] < 1:
            logger.error(f"contamination must be between 0 and 1, got {config['contamination']}")
            return False
    
    if "eps" in config:
        if config["eps"] <= 0:
            logger.error(f"eps must be positive, got {config['eps']}")
            return False
    
    if "minSamples" in config:
        if config["minSamples"] < 1:
            logger.error(f"minSamples must be >= 1, got {config['minSamples']}")
            return False
    
    return True
