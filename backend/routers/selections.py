from fastapi import APIRouter, HTTPException
from uuid import UUID

from backend.models import Selection, SelectionCreate
from backend.services import get_data_store

router = APIRouter(prefix="/selections", tags=["selections"])


@router.get("", response_model=list[Selection])
async def list_selections():
    """List all selections."""
    store = get_data_store()
    return store.list_selections()


@router.post("", response_model=Selection)
async def create_selection(selection_create: SelectionCreate):
    """Create a named selection."""
    store = get_data_store()
    selection = store.create_selection(
        name=selection_create.name,
        layer_id=selection_create.layer_id,
        point_ids=selection_create.point_ids,
    )
    if selection is None:
        raise HTTPException(status_code=404, detail="Layer not found")
    return selection


@router.get("/{selection_id}", response_model=Selection)
async def get_selection(selection_id: UUID):
    """Get a selection by ID."""
    store = get_data_store()
    selection = store.get_selection(selection_id)
    if selection is None:
        raise HTTPException(status_code=404, detail="Selection not found")
    return selection


@router.delete("/{selection_id}")
async def delete_selection(selection_id: UUID):
    """Delete a selection."""
    store = get_data_store()
    if not store.delete_selection(selection_id):
        raise HTTPException(status_code=404, detail="Selection not found")
    return {"status": "deleted"}
