"""
FastAPI application entry point for ML service.

Author: Ajinkya Deshmukh <ajinkyadeshmukh8686@gmail.com> (https://github.com/Ajinkya-909)
License: MIT
Copyright (c) 2026 Ajinkya Deshmukh
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

import logging
import sys

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    stream=sys.stdout
)

logger = logging.getLogger(__name__)

# Import routes (after logging setup)
from app.api import health, analysis

# Lifespan context manager
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup and shutdown events"""
    logger.info("[STARTUP] SentinelX ML Service starting")
    logger.info("[STARTUP] Available routes:")
    logger.info("[STARTUP]   - GET /health")
    logger.info("[STARTUP]   - POST /analyze")
    yield
    logger.info("[SHUTDOWN] SentinelX ML Service shutting down")


# Create FastAPI app
app = FastAPI(
    title="SentinelX ML Service",
    description="ML analysis service for SentinelX IDS",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router, tags=["health"])
app.include_router(analysis.router, tags=["analysis"])




# Root endpoint
@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "SentinelX ML Service",
        "version": "1.0.0",
        "status": "running"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
