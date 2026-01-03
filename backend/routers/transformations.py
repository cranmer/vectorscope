from fastapi import APIRouter, HTTPException, Depends
from uuid import UUID

from backend.models import Transformation, TransformationCreate, TransformationUpdate
from backend.services import get_transform_engine, TransformEngine

router = APIRouter(prefix="/transformations", tags=["transformations"])


@router.get("", response_model=list[Transformation])
async def list_transformations(engine: TransformEngine = Depends(get_transform_engine)):
    """List all transformations."""
    return engine.list_transformations()


@router.post("", response_model=Transformation)
async def create_transformation(
    transform_create: TransformationCreate,
    engine: TransformEngine = Depends(get_transform_engine),
):
    """Create and apply a transformation."""
    transformation = engine.create_transformation(
        name=transform_create.name,
        type=transform_create.type,
        source_layer_id=transform_create.source_layer_id,
        parameters=transform_create.parameters,
    )
    if transformation is None:
        raise HTTPException(status_code=404, detail="Source layer not found")
    return transformation


@router.get("/{transformation_id}", response_model=Transformation)
async def get_transformation(
    transformation_id: UUID,
    engine: TransformEngine = Depends(get_transform_engine),
):
    """Get a transformation by ID."""
    transformation = engine.get_transformation(transformation_id)
    if transformation is None:
        raise HTTPException(status_code=404, detail="Transformation not found")
    return transformation


@router.patch("/{transformation_id}", response_model=Transformation)
async def update_transformation(
    transformation_id: UUID,
    update: TransformationUpdate,
    engine: TransformEngine = Depends(get_transform_engine),
):
    """Update transformation name, type, and/or parameters."""
    transformation = engine.update_transformation(
        transformation_id,
        name=update.name,
        type=update.type,
        parameters=update.parameters,
    )
    if transformation is None:
        raise HTTPException(status_code=404, detail="Transformation not found")
    return transformation


@router.delete("/{transformation_id}")
async def delete_transformation(
    transformation_id: UUID,
    engine: TransformEngine = Depends(get_transform_engine),
):
    """Delete a transformation and its target layer (including projections)."""
    success = engine.delete_transformation(transformation_id)
    if not success:
        raise HTTPException(status_code=404, detail="Transformation not found")
    return {"status": "deleted"}
