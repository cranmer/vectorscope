from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID, uuid4


class SelectionCreate(BaseModel):
    """Request model for creating a selection."""
    name: str
    layer_id: UUID
    point_ids: list[UUID]


class Selection(BaseModel):
    """A named subset of points."""
    id: UUID = Field(default_factory=uuid4)
    name: str
    layer_id: UUID
    point_ids: list[UUID]
    point_count: int = 0
