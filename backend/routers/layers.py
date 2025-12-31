from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from uuid import UUID
import numpy as np
import io

from backend.models import Layer, LayerCreate, LayerUpdate, Point, PointData
from backend.services import get_data_store

router = APIRouter(prefix="/layers", tags=["layers"])


@router.get("", response_model=list[Layer])
async def list_layers():
    """List all layers."""
    store = get_data_store()
    return store.list_layers()


@router.post("", response_model=Layer)
async def create_layer(layer_create: LayerCreate):
    """Create a new layer."""
    store = get_data_store()
    return store.create_layer(
        name=layer_create.name,
        dimensionality=layer_create.dimensionality,
        description=layer_create.description,
        source_transformation_id=layer_create.source_transformation_id,
    )


@router.get("/{layer_id}", response_model=Layer)
async def get_layer(layer_id: UUID):
    """Get a layer by ID."""
    store = get_data_store()
    layer = store.get_layer(layer_id)
    if layer is None:
        raise HTTPException(status_code=404, detail="Layer not found")
    return layer


@router.get("/{layer_id}/points", response_model=list[Point])
async def get_layer_points(layer_id: UUID):
    """Get all points in a layer."""
    store = get_data_store()
    layer = store.get_layer(layer_id)
    if layer is None:
        raise HTTPException(status_code=404, detail="Layer not found")
    return store.get_points(layer_id)


@router.post("/synthetic", response_model=Layer)
async def create_synthetic_layer(
    n_points: int = 1000,
    dimensionality: int = 30,
    n_clusters: int = 5,
    name: str = "synthetic",
):
    """Generate a synthetic dataset for testing."""
    store = get_data_store()
    return store.generate_synthetic_data(
        n_points=n_points,
        dimensionality=dimensionality,
        n_clusters=n_clusters,
        layer_name=name,
    )


@router.post("/upload", response_model=Layer)
async def upload_layer(
    file: UploadFile = File(...),
    name: str = Form("uploaded"),
):
    """Upload a numpy file (.npy or .npz) to create a new layer.

    Accepts:
    - .npy file: 2D array of shape (n_points, dimensionality)
    - .npz file: Must contain 'vectors' or 'data' or 'embeddings' key
    - .csv file: Comma-separated values, each row is a point
    """
    store = get_data_store()

    content = await file.read()
    filename = file.filename or "data"

    try:
        if filename.endswith('.npy'):
            vectors = np.load(io.BytesIO(content))
        elif filename.endswith('.npz'):
            npz_data = np.load(io.BytesIO(content))
            # Try common key names
            for key in ['vectors', 'data', 'embeddings', 'X', 'x']:
                if key in npz_data:
                    vectors = npz_data[key]
                    break
            else:
                # Use first array found
                keys = list(npz_data.keys())
                if keys:
                    vectors = npz_data[keys[0]]
                else:
                    raise ValueError("No arrays found in npz file")
        elif filename.endswith('.csv'):
            vectors = np.loadtxt(io.BytesIO(content), delimiter=',')
        else:
            raise ValueError(f"Unsupported file type: {filename}")

        # Ensure 2D
        if vectors.ndim == 1:
            vectors = vectors.reshape(1, -1)
        elif vectors.ndim != 2:
            raise ValueError(f"Expected 2D array, got {vectors.ndim}D")

        n_points, dimensionality = vectors.shape

        # Create layer
        layer = store.create_layer(
            name=name,
            dimensionality=dimensionality,
            description=f"Uploaded from {filename}",
        )

        # Add points
        for i, vector in enumerate(vectors):
            point_data = PointData(
                vector=vector.tolist(),
                label=f"point_{i}",
            )
            store.add_point(layer.id, point_data)

        # Update point count
        layer.point_count = n_points

        return layer

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.patch("/{layer_id}", response_model=Layer)
async def update_layer(layer_id: UUID, update: LayerUpdate):
    """Update a layer's name or description."""
    store = get_data_store()
    layer = store.update_layer(layer_id, name=update.name, description=update.description)
    if layer is None:
        raise HTTPException(status_code=404, detail="Layer not found")
    return layer
