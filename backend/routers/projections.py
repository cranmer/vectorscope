from fastapi import APIRouter, HTTPException, Depends
from uuid import UUID

from backend.models import Projection, ProjectionCreate, ProjectionUpdate, ProjectedPoint
from backend.services import get_projection_engine, ProjectionEngine

router = APIRouter(prefix="/projections", tags=["projections"])


@router.get("", response_model=list[Projection])
async def list_projections(engine: ProjectionEngine = Depends(get_projection_engine)):
    """List all projections."""
    return engine.list_projections()


@router.post("", response_model=Projection)
async def create_projection(
    projection_create: ProjectionCreate,
    engine: ProjectionEngine = Depends(get_projection_engine),
):
    """Create and compute a projection."""
    projection = engine.create_projection(
        name=projection_create.name,
        type=projection_create.type,
        layer_id=projection_create.layer_id,
        dimensions=projection_create.dimensions,
        parameters=projection_create.parameters,
    )
    if projection is None:
        raise HTTPException(status_code=404, detail="Layer not found")
    return projection


@router.get("/{projection_id}", response_model=Projection)
async def get_projection(
    projection_id: UUID,
    engine: ProjectionEngine = Depends(get_projection_engine),
):
    """Get a projection by ID."""
    projection = engine.get_projection(projection_id)
    if projection is None:
        raise HTTPException(status_code=404, detail="Projection not found")
    return projection


@router.get("/{projection_id}/coordinates", response_model=list[ProjectedPoint])
async def get_projection_coordinates(
    projection_id: UUID,
    engine: ProjectionEngine = Depends(get_projection_engine),
):
    """Get computed coordinates for a projection."""
    coordinates = engine.get_projection_coordinates(projection_id)
    if coordinates is None:
        raise HTTPException(status_code=404, detail="Projection not found")
    return coordinates


@router.patch("/{projection_id}", response_model=Projection)
async def update_projection(
    projection_id: UUID,
    update: ProjectionUpdate,
    engine: ProjectionEngine = Depends(get_projection_engine),
):
    """Update a projection's name or parameters."""
    projection = engine.update_projection(
        projection_id, name=update.name, parameters=update.parameters
    )
    if projection is None:
        raise HTTPException(status_code=404, detail="Projection not found")
    return projection


@router.delete("/{projection_id}")
async def delete_projection(
    projection_id: UUID,
    engine: ProjectionEngine = Depends(get_projection_engine),
):
    """Delete a projection."""
    success = engine.delete_projection(projection_id)
    if not success:
        raise HTTPException(status_code=404, detail="Projection not found")
    return {"status": "deleted"}
