from pydantic import BaseModel, Field
from uuid import UUID, uuid4


class CustomAxisCreate(BaseModel):
    """Request model for creating a custom axis from two points."""
    name: str
    layer_id: UUID
    point_a_id: UUID  # Source point
    point_b_id: UUID  # Target point (axis direction is B - A)


class CustomAxis(BaseModel):
    """A custom axis defined by two points.

    The axis direction is computed as the normalized vector from point A to point B
    in the original high-dimensional space.
    """
    id: UUID = Field(default_factory=uuid4)
    name: str
    layer_id: UUID
    point_a_id: UUID
    point_b_id: UUID
    vector: list[float]  # The computed direction vector (normalized)
