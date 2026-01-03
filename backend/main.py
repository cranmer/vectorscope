from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.routers import layers_router, transformations_router, projections_router, selections_router, scenarios_router, custom_axes_router

app = FastAPI(
    title="VectorScope",
    description="Interactive vector embedding visualization and transformation system",
    version="0.1.0",
)

# Configure CORS for frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(layers_router)
app.include_router(transformations_router)
app.include_router(projections_router)
app.include_router(selections_router)
app.include_router(scenarios_router)
app.include_router(custom_axes_router)


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "name": "VectorScope",
        "version": "0.1.0",
        "status": "running",
    }


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "healthy"}
