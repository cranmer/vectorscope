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
        self, transformation: Transformation, source_layer, preserve_name: str = None
    ):
        """Apply transformation to source layer and create target layer.

        Args:
            transformation: The transformation to apply
            source_layer: The source layer
            preserve_name: If provided, use this name for the target layer instead of generating one
        """
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
        elif transformation.type == TransformationType.PCA:
            transformed = self._apply_pca(vectors, transformation.parameters, transformation)
        elif transformation.type == TransformationType.CUSTOM_AXES:
            transformed = self._apply_custom_axes(vectors, transformation.parameters, transformation)
        else:
            transformed = vectors

        # Create target layer - use preserved name if provided
        layer_name = preserve_name if preserve_name else f"{source_layer.name}_{transformation.name}"
        target_layer = self._data_store.create_layer(
            name=layer_name,
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

    def _apply_pca(self, vectors: np.ndarray, params: dict, transformation: Transformation) -> np.ndarray:
        """Apply PCA-based affine transformation.

        This computes PCA on the input vectors and transforms them to the
        principal component coordinate system. The output axes are the
        principal components.

        Parameters:
            n_components: Number of components to keep (default: all)
            center: Whether to center the data (default: True)
            whiten: Whether to whiten the data (default: False)
        """
        from sklearn.decomposition import PCA

        n_components = params.get("n_components", None)  # None = keep all
        center = params.get("center", True)
        whiten = params.get("whiten", False)

        # If n_components not specified, keep all dimensions
        if n_components is None:
            n_components = vectors.shape[1]

        # Limit to available dimensions
        n_components = min(n_components, vectors.shape[1], vectors.shape[0])

        # Fit PCA
        pca = PCA(n_components=n_components, whiten=whiten)

        if center:
            transformed = pca.fit_transform(vectors)
        else:
            # Just fit without centering - apply transformation manually
            mean = np.mean(vectors, axis=0)
            centered = vectors - mean
            pca.fit(centered)
            transformed = vectors @ pca.components_.T  # No centering in output

        # Store the PCA parameters for reference
        # (These can be used to understand the transformation)
        transformation.parameters = {
            **params,
            "_components": pca.components_.tolist(),
            "_explained_variance_ratio": pca.explained_variance_ratio_.tolist(),
            "_mean": pca.mean_.tolist() if pca.mean_ is not None else None,
        }

        return transformed

    def _apply_custom_axes(self, vectors: np.ndarray, params: dict, transformation: Transformation) -> np.ndarray:
        """Apply custom axes transformation.

        Projects data onto user-defined axes after applying Gram-Schmidt
        orthonormalization to create an orthonormal basis.

        Parameters:
            axes: List of axis definitions, each with:
                - type: "direction"
                - vector: The direction vector in original space
        """
        axes = params.get("axes", [])
        if not axes:
            # No axes - return 2D zeros
            return np.zeros((vectors.shape[0], 2))

        # Extract direction vectors
        raw_vectors = []
        for axis_def in axes:
            if axis_def.get("type") == "direction":
                vec = np.array(axis_def["vector"], dtype=np.float64)
                if np.linalg.norm(vec) > 1e-10:
                    raw_vectors.append(vec)

        if len(raw_vectors) == 0:
            return np.zeros((vectors.shape[0], 2))

        # Apply Gram-Schmidt orthonormalization
        orthonormal_basis = []
        for vec in raw_vectors:
            # Subtract projections onto previous basis vectors
            for basis_vec in orthonormal_basis:
                vec = vec - np.dot(vec, basis_vec) * basis_vec

            norm = np.linalg.norm(vec)
            if norm > 1e-10:
                orthonormal_basis.append(vec / norm)

        if len(orthonormal_basis) == 0:
            return np.zeros((vectors.shape[0], 2))

        # Center data on mean before projecting (so origin is at data center)
        mean = np.mean(vectors, axis=0)
        centered = vectors - mean

        # Project onto orthonormal basis
        projection_matrix = np.array(orthonormal_basis)
        transformed = centered @ projection_matrix.T

        # Store the orthonormal basis and mean for reference
        transformation.parameters = {
            **params,
            "_orthonormal_basis": projection_matrix.tolist(),
            "_mean": mean.tolist(),
        }

        return transformed

    def update_transformation(
        self,
        transformation_id: UUID,
        name: Optional[str] = None,
        type: Optional[TransformationType] = None,
        parameters: Optional[dict] = None,
    ) -> Optional[Transformation]:
        """Update transformation name, type, and/or parameters. Recomputes if type or parameters change."""
        transformation = self._transformations.get(transformation_id)
        if transformation is None:
            return None

        # Update name (doesn't require recomputation)
        if name is not None:
            transformation.name = name

        # Check if we need to recompute (type or parameters changed)
        needs_recompute = type is not None or parameters is not None

        if needs_recompute:
            source_layer = self._data_store.get_layer(transformation.source_layer_id)
            if source_layer is None:
                return None

            # Update type and/or parameters
            if type is not None:
                transformation.type = type
            if parameters is not None:
                transformation.parameters = parameters

            # Find old target layer and preserve its name
            old_target_id = transformation.target_layer_id
            old_target_name = None
            if old_target_id:
                old_target = self._data_store.get_layer(old_target_id)
                if old_target:
                    old_target_name = old_target.name
                self._data_store.delete_layer(old_target_id)

            # Reapply transformation to create new target layer, preserving name
            target_layer = self._apply_transformation(transformation, source_layer, preserve_name=old_target_name)
            if target_layer is None:
                return None

            transformation.target_layer_id = target_layer.id

            # Propagate changes to downstream transformations
            if old_target_id:
                self._propagate_downstream(old_target_id, target_layer.id)

        return transformation

    def _propagate_downstream(self, old_layer_id: UUID, new_layer_id: UUID):
        """Propagate layer changes to downstream transformations and projections."""
        # Update projections that reference the old layer
        from backend.services.projection_engine import get_projection_engine
        proj_engine = get_projection_engine()
        proj_engine._update_layer_reference(old_layer_id, new_layer_id)

        # Find transformations that used the old layer as source
        downstream = [
            t for t in self._transformations.values()
            if t.source_layer_id == old_layer_id
        ]

        for transform in downstream:
            # Update source reference
            transform.source_layer_id = new_layer_id

            # Get the new source layer
            new_source = self._data_store.get_layer(new_layer_id)
            if new_source is None:
                continue

            # Delete old target but preserve its name
            old_target_id = transform.target_layer_id
            old_target_name = None
            if old_target_id:
                old_target = self._data_store.get_layer(old_target_id)
                if old_target:
                    old_target_name = old_target.name
                self._data_store.delete_layer(old_target_id)

            # Reapply transformation, preserving name
            new_target = self._apply_transformation(transform, new_source, preserve_name=old_target_name)
            if new_target:
                transform.target_layer_id = new_target.id

                # Recursively propagate to next level
                if old_target_id:
                    self._propagate_downstream(old_target_id, new_target.id)

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
