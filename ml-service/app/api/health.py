"""
Health check routes for ML service.
"""

from fastapi import APIRouter
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/health")
async def health_check():
    """
    Health check endpoint.
    
    Returns:
        Status and timestamp
    """
    logger.debug("[HEALTH] Health check requested")
    return {
        "status": "healthy",
        "service": "sentinelx-ml-service",
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }
