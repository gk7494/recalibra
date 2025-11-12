"""FastAPI application entry point - Simplified for local development"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db.session import engine
from app.db.models import Base

# Create database tables
Base.metadata.create_all(bind=engine)

# Create FastAPI app
app = FastAPI(
    title="Recalibra API",
    description="Automatically keep computational biology models accurate as lab conditions change",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
from app.api.routes_models import router as models_router
app.include_router(models_router)

try:
    from app.api.routes_molecules import router as molecules_router
    app.include_router(molecules_router)
except ImportError:
    pass

try:
    from app.api.routes_predictions import router as predictions_router
    app.include_router(predictions_router)
except ImportError:
    pass

try:
    from app.api.routes_drift import router as drift_router
    app.include_router(drift_router)
except ImportError:
    pass


@app.get("/")
async def root():
    return {"message": "Recalibra API", "version": "1.0.0"}


@app.get("/health")
async def health():
    return {"status": "healthy"}
