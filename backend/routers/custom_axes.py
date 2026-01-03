from fastapi import APIRouter, HTTPException
from uuid import UUID

from backend.models import CustomAxis, CustomAxisCreate
from backend.services import get_data_store

router = APIRouter(prefix="/custom-axes", tags=["custom-axes"])


@router.get("", response_model=list[CustomAxis])
async def list_custom_axes(layer_id: UUID | None = None):
    """List all custom axes, optionally filtered by layer."""
    store = get_data_store()
    return store.list_custom_axes(layer_id)


@router.post("", response_model=CustomAxis)
async def create_custom_axis(axis_create: CustomAxisCreate):
    """Create a custom axis from two points.

    The axis direction is computed as the normalized vector from point A to point B.
    """
    store = get_data_store()
    axis = store.create_custom_axis(
        name=axis_create.name,
        layer_id=axis_create.layer_id,
        point_a_id=axis_create.point_a_id,
        point_b_id=axis_create.point_b_id,
    )
    if axis is None:
        raise HTTPException(
            status_code=404,
            detail="Layer not found or one or both points not found"
        )
    return axis


@router.get("/{axis_id}", response_model=CustomAxis)
async def get_custom_axis(axis_id: UUID):
    """Get a custom axis by ID."""
    store = get_data_store()
    axis = store.get_custom_axis(axis_id)
    if axis is None:
        raise HTTPException(status_code=404, detail="Custom axis not found")
    return axis


@router.delete("/{axis_id}")
async def delete_custom_axis(axis_id: UUID):
    """Delete a custom axis."""
    store = get_data_store()
    if not store.delete_custom_axis(axis_id):
        raise HTTPException(status_code=404, detail="Custom axis not found")
    return {"status": "deleted"}
