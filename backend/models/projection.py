from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID, uuid4
from enum import Enum


class ProjectionType(str, Enum):
    PCA = "pca"
    TSNE = "tsne"
    CUSTOM_AXES = "custom_axes"


class ProjectionCreate(BaseModel):
    """Request model for creating a projection."""
    name: str
    type: ProjectionType
    layer_id: UUID
    dimensions: int = 2
    parameters: dict = Field(default_factory=dict)
    point_ids: Optional[list[UUID]] = None  # If None, use all points


class Projection(BaseModel):
    """A visualization mapping from a layer to 2D or 3D."""
    id: UUID = Field(default_factory=uuid4)
    name: str
    type: ProjectionType
    layer_id: UUID
    dimensions: int = 2
    parameters: dict = Field(default_factory=dict)
    random_seed: Optional[int] = None  # For reproducibility (t-SNE)


class ProjectedPoint(BaseModel):
    """A point with its projected coordinates."""
    id: UUID
    label: Optional[str] = None
    metadata: dict = Field(default_factory=dict)
    coordinates: list[float]  # 2D or 3D coordinates
    is_virtual: bool = False
