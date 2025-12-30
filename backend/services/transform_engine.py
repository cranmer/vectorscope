import numpy as np
from uuid import UUID, uuid4
from typing import Optional

from backend.models import Transformation, TransformationType, PointData
from backend.services.data_store import DataStore


class TransformEngine:
    """Engine for applying transformations to layers."""

    def __init__(self, data_store: DataStore):
        self._data_store = data_store
        self._transformations: dict[UUID, Transformation] = {}

    def create_transformation(
        self,
        name: str,
        type: TransformationType,
        source_layer_id: UUID,
        parameters: Optional[dict] = None,
    ) -> Optional[Transformation]:
        """Create and apply a transformation, creating a new target layer."""
        source_layer = self._data_store.get_layer(source_layer_id)
        if source_layer is None:
            return None

        transformation = Transformation(
            id=uuid4(),
            name=name,
            type=type,
            source_layer_id=source_layer_id,
            parameters=parameters or {},
        )

        # Apply transformation and create target layer
        target_layer = self._apply_transformation(transformation, source_layer)
        if target_layer is None:
            return None

        transformation.target_layer_id = target_layer.id
        self._transformations[transformation.id] = transformation

        return transformation

    def _apply_transformation(
        self, transformation: Transformation, source_layer
    ):
        """Apply transformation to source layer and create target layer."""
        vectors, point_ids = self._data_store.get_vectors_as_array(source_layer.id)
        if len(vectors) == 0:
            return None

        # Get source points for metadata
        source_points = {p.id: p for p in self._data_store.get_points(source_layer.id)}

        # Apply the transformation
        if transformation.type == TransformationType.SCALING:
            transformed = self._apply_scaling(vectors, transformation.parameters)
        elif transformation.type == TransformationType.ROTATION:
            transformed = self._apply_rotation(vectors, transformation.parameters)
        elif transformation.type == TransformationType.AFFINE:
            transformed = self._apply_affine(vectors, transformation.parameters)
        elif transformation.type == TransformationType.LINEAR:
            transformed = self._apply_linear(vectors, transformation.parameters)
        else:
            transformed = vectors

        # Create target layer
        target_layer = self._data_store.create_layer(
            name=f"{source_layer.name}_{transformation.name}",
            dimensionality=transformed.shape[1],
            description=f"Result of {transformation.type.value} transformation",
            source_transformation_id=transformation.id,
        )

        # Add transformed points
        points = []
        for i, pid in enumerate(point_ids):
            source_point = source_points[pid]
            points.append(
                PointData(
                    id=pid,  # Keep same ID for tracking across layers
                    label=source_point.label,
                    metadata=source_point.metadata,
                    vector=transformed[i].tolist(),
                    is_virtual=source_point.is_virtual,
                )
            )

        self._data_store.add_points_bulk(target_layer.id, points)
        return target_layer

    def _apply_scaling(self, vectors: np.ndarray, params: dict) -> np.ndarray:
        """Apply per-axis scaling."""
        scale_factors = params.get("scale_factors", None)
        if scale_factors is None:
            # Default: scale by 2x on all axes
            return vectors * 2.0

        scale = np.array(scale_factors)
        if len(scale) != vectors.shape[1]:
            # If wrong size, broadcast single value
            scale = np.full(vectors.shape[1], scale[0] if len(scale) > 0 else 1.0)

        return vectors * scale

    def _apply_rotation(self, vectors: np.ndarray, params: dict) -> np.ndarray:
        """Apply rotation (2D rotation on first two dimensions)."""
        angle = params.get("angle", 0.0)  # Radians
        dims = params.get("dims", [0, 1])  # Which dimensions to rotate

        result = vectors.copy()
        d1, d2 = dims[0], dims[1]

        cos_a = np.cos(angle)
        sin_a = np.sin(angle)

        new_d1 = vectors[:, d1] * cos_a - vectors[:, d2] * sin_a
        new_d2 = vectors[:, d1] * sin_a + vectors[:, d2] * cos_a

        result[:, d1] = new_d1
        result[:, d2] = new_d2

        return result

    def _apply_affine(self, vectors: np.ndarray, params: dict) -> np.ndarray:
        """Apply affine transformation (matrix + translation)."""
        matrix = params.get("matrix", None)
        translation = params.get("translation", None)

        if matrix is not None:
            matrix = np.array(matrix)
            vectors = vectors @ matrix.T

        if translation is not None:
            vectors = vectors + np.array(translation)

        return vectors

    def _apply_linear(self, vectors: np.ndarray, params: dict) -> np.ndarray:
        """Apply linear transformation (matrix only)."""
        matrix = params.get("matrix", None)
        if matrix is None:
            return vectors

        matrix = np.array(matrix)
        return vectors @ matrix.T

    def get_transformation(self, transformation_id: UUID) -> Optional[Transformation]:
        """Get a transformation by ID."""
        return self._transformations.get(transformation_id)

    def list_transformations(self) -> list[Transformation]:
        """List all transformations."""
        return list(self._transformations.values())


# Singleton instance
_transform_engine: Optional[TransformEngine] = None


def get_transform_engine() -> TransformEngine:
    """Get the singleton TransformEngine instance."""
    global _transform_engine
    if _transform_engine is None:
        from backend.services.data_store import get_data_store
        _transform_engine = TransformEngine(get_data_store())
    return _transform_engine
