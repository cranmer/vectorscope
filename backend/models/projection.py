from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID, uuid4
from enum import Enum


class ProjectionType(str, Enum):
    PCA = "pca"
    TSNE = "tsne"
    UMAP = "umap"
    CUSTOM_AXES = "custom_axes"
    CUSTOM_AXES_3D = "custom_axes_3d"  # 3D version requiring 3 axes
    DIRECT = "direct"  # Use raw dimensions directly
    DENSITY = "density"  # 1D density/KDE view (formerly histogram)
    BOXPLOT = "boxplot"  # 1D box plot by class
    VIOLIN = "violin"  # 1D violin plot by class


class ProjectionCreate(BaseModel):
    """Request model for creating a projection."""
    name: str
    type: ProjectionType
    layer_id: UUID
    dimensions: int = 2
    parameters: dict = Field(default_factory=dict)
    point_ids: Optional[list[UUID]] = None  # If None, use all points


class ProjectionUpdate(BaseModel):
    """Request model for updating a projection."""
    name: Optional[str] = None
    parameters: Optional[dict] = None


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
