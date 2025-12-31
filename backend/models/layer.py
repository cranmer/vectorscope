from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID, uuid4


class PointData(BaseModel):
    """Data for a single point in a layer."""
    id: UUID = Field(default_factory=uuid4)
    label: Optional[str] = None
    metadata: dict = Field(default_factory=dict)
    vector: list[float]
    is_virtual: bool = False


class Point(BaseModel):
    """A point with its vector representation in a layer."""
    id: UUID
    label: Optional[str] = None
    metadata: dict = Field(default_factory=dict)
    vector: list[float]
    is_virtual: bool = False


class LayerCreate(BaseModel):
    """Request model for creating a new layer."""
    name: str
    description: Optional[str] = None
    dimensionality: int
    source_transformation_id: Optional[UUID] = None


class LayerUpdate(BaseModel):
    """Request model for updating a layer."""
    name: Optional[str] = None
    description: Optional[str] = None
    feature_columns: Optional[list[str]] = None
    label_column: Optional[str] = None


class Layer(BaseModel):
    """A named embedding space containing points."""
    id: UUID = Field(default_factory=uuid4)
    name: str
    description: Optional[str] = None
    dimensionality: int
    point_count: int = 0
    source_transformation_id: Optional[UUID] = None
    is_derived: bool = False
    # Column configuration for tabular data (CSV)
    column_names: Optional[list[str]] = None  # All available columns
    feature_columns: Optional[list[str]] = None  # Columns used as features
    label_column: Optional[str] = None  # Column used for labels
