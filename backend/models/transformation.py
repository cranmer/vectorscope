from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID, uuid4
from enum import Enum


class TransformationType(str, Enum):
    SCALING = "scaling"
    ROTATION = "rotation"
    PCA = "pca"  # PCA-based affine transformation
    CUSTOM_AFFINE = "custom_affine"  # N-D change of basis using custom axes


class TransformationCreate(BaseModel):
    """Request model for creating a transformation."""
    name: str
    type: TransformationType
    source_layer_id: UUID
    parameters: dict = Field(default_factory=dict)


class TransformationUpdate(BaseModel):
    """Request model for updating a transformation."""
    name: Optional[str] = None
    type: Optional[TransformationType] = None
    parameters: Optional[dict] = None


class Transformation(BaseModel):
    """A mapping from one layer to another."""
    id: UUID = Field(default_factory=uuid4)
    name: str
    type: TransformationType
    source_layer_id: UUID
    target_layer_id: Optional[UUID] = None
    parameters: dict = Field(default_factory=dict)
    is_invertible: bool = True
