from fastapi import APIRouter, HTTPException
from uuid import UUID

from backend.models import Layer, LayerCreate, LayerUpdate, Point
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


@router.patch("/{layer_id}", response_model=Layer)
async def update_layer(layer_id: UUID, update: LayerUpdate):
    """Update a layer's name or description."""
    store = get_data_store()
    layer = store.update_layer(layer_id, name=update.name, description=update.description)
    if layer is None:
        raise HTTPException(status_code=404, detail="Layer not found")
    return layer
