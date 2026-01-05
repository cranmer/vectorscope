import os
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from backend.routers import layers_router, transformations_router, projections_router, selections_router, scenarios_router, custom_axes_router

app = FastAPI(
    title="VectorScope",
    description="Interactive vector embedding visualization and transformation system",
    version="1.2.5",
)

# Determine frontend dist path
# Check multiple locations: installed package, development
_FRONTEND_DIST = None
_possible_paths = []

# Try to find via importlib.resources (Python 3.9+) - most reliable for installed packages
try:
    from importlib.resources import files
    frontend_pkg = files("frontend_dist")
    # Check if it has index.html
    if (frontend_pkg / "index.html").is_file():
        # Get the actual path - need to use as_file for older Python or traverse
        import importlib.util
        spec = importlib.util.find_spec("frontend_dist")
        if spec and spec.origin:
            _possible_paths.append(Path(spec.origin).parent)
except Exception:
    pass

# Fallback: try direct import
try:
    import frontend_dist
    if hasattr(frontend_dist, '__file__') and frontend_dist.__file__:
        _possible_paths.append(Path(frontend_dist.__file__).parent)
except ImportError:
    pass

# Development paths
_possible_paths.extend([
    Path(__file__).parent.parent / "frontend_dist",  # Installed package (sibling to backend)
    Path(__file__).parent.parent / "frontend" / "dist",  # Development location
])

for p in _possible_paths:
    if p.exists() and (p / "index.html").exists():
        _FRONTEND_DIST = p
        break

# Configure CORS for frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers under /api prefix for production
# Also include at root for backwards compatibility with dev proxy
from fastapi import APIRouter

api_router = APIRouter(prefix="/api")
api_router.include_router(layers_router)
api_router.include_router(transformations_router)
api_router.include_router(projections_router)
api_router.include_router(selections_router)
api_router.include_router(scenarios_router)
api_router.include_router(custom_axes_router)

app.include_router(api_router)

# Also mount at root for backwards compatibility (dev server proxy)
app.include_router(layers_router)
app.include_router(transformations_router)
app.include_router(projections_router)
app.include_router(selections_router)
app.include_router(scenarios_router)
app.include_router(custom_axes_router)


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "healthy"}


@app.get("/api")
async def api_info():
    """API info endpoint."""
    return {
        "name": "VectorScope",
        "version": "1.2.5",
        "status": "running",
        "frontend_available": _FRONTEND_DIST is not None,
    }


# Mount static files and serve frontend if available
if _FRONTEND_DIST:
    # Mount assets directory
    app.mount("/assets", StaticFiles(directory=_FRONTEND_DIST / "assets"), name="assets")

    # Serve static files at root (logo.svg, etc.)
    @app.get("/logo.svg")
    async def serve_logo():
        return FileResponse(_FRONTEND_DIST / "logo.svg")

    @app.get("/logo_no_name.svg")
    async def serve_logo_no_name():
        return FileResponse(_FRONTEND_DIST / "logo_no_name.svg")

    # Catch-all route to serve index.html for SPA routing
    @app.get("/")
    async def serve_frontend():
        """Serve the frontend application."""
        return FileResponse(_FRONTEND_DIST / "index.html")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        """Catch-all for SPA routing - serve index.html for non-API routes."""
        # Don't intercept API routes
        if full_path.startswith(("layers", "transformations", "projections",
                                  "selections", "scenarios", "custom-axes",
                                  "health", "api", "assets")):
            return {"error": "Not found"}
        # Check if it's a static file
        static_file = _FRONTEND_DIST / full_path
        if static_file.exists() and static_file.is_file():
            return FileResponse(static_file)
        # Otherwise serve index.html for SPA routing
        return FileResponse(_FRONTEND_DIST / "index.html")
else:
    @app.get("/")
    async def root():
        """Root endpoint when frontend is not available."""
        return {
            "name": "VectorScope",
            "version": "1.2.5",
            "status": "running",
            "message": "Frontend not installed. Use 'pip install vectorscope[frontend]' or run frontend dev server separately.",
        }
