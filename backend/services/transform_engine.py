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
        elif transformation.type == TransformationType.CUSTOM_AFFINE:
            # Custom Affine always uses full N-D output
            params = {**transformation.parameters, "output_mode": "full"}
            transformed = self._apply_custom_axes(vectors, params, transformation)
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

        # Propagate custom axes from source layer to target layer
        # The axes will be recomputed using the transformed point coordinates
        source_axes = self._data_store.list_custom_axes(source_layer.id)
        for axis in source_axes:
            try:
                self._data_store.create_custom_axis(
                    name=axis.name,
                    layer_id=target_layer.id,
                    point_a_id=axis.point_a_id,
                    point_b_id=axis.point_b_id,
                )
            except ValueError:
                # Skip if points don't exist in target layer (shouldn't happen)
                pass

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

        Supports two output modes:
        - "2d" (default): Oblique coordinate projection to 2D
        - "full": Full N-dimensional change of basis transformation

        For "2d" mode:
            Uses oblique coordinate projection: finds coefficients (α, β) such that
            each point's position in the plane is α*v1 + β*v2.

        For "full" mode:
            Performs a change of basis where v1, v2 replace e_0, e_1 and the
            remaining dimensions (e_2, ..., e_{N-1}) are preserved.
            Output is N-dimensional with:
            - output[0] = coefficient of v1
            - output[1] = coefficient of v2
            - output[2:] = coefficients of e_2, ..., e_{N-1}

        Parameters:
            axes: List of axis definitions, each with:
                - type: "direction"
                - vector: The direction vector in original space
            output_mode: "2d" (default) or "full" for N-dimensional output
            source_type: "direct" (standard basis) - for future: "pca", "custom_axes"
        """
        output_mode = params.get("output_mode", "2d")

        axes = params.get("axes", [])
        if not axes:
            if output_mode == "full":
                return vectors.copy()  # No axes - return unchanged
            return np.zeros((vectors.shape[0], 2))

        # Extract direction vectors
        raw_vectors = []
        for axis_def in axes:
            if axis_def.get("type") == "direction":
                vec = np.array(axis_def["vector"], dtype=np.float64)
                if np.linalg.norm(vec) > 1e-10:
                    raw_vectors.append(vec)

        if len(raw_vectors) == 0:
            if output_mode == "full":
                return vectors.copy()
            return np.zeros((vectors.shape[0], 2))

        # Center data on mean
        mean = np.mean(vectors, axis=0)
        centered = vectors - mean

        if output_mode == "full":
            return self._apply_custom_axes_full(centered, raw_vectors, params, transformation, mean)
        else:
            return self._apply_custom_axes_2d(centered, raw_vectors, params, transformation, mean)

    def _apply_custom_axes_2d(
        self,
        centered: np.ndarray,
        raw_vectors: list[np.ndarray],
        params: dict,
        transformation: Transformation,
        mean: np.ndarray,
    ) -> np.ndarray:
        """Apply 2D oblique coordinate projection (original behavior)."""
        if len(raw_vectors) < 2:
            # Only one axis - project onto it
            v1 = raw_vectors[0]
            e1 = v1 / np.linalg.norm(v1)
            coords = (centered @ e1).reshape(-1, 1)
            transformed = np.column_stack([coords, np.zeros(len(centered))])
            transformation.parameters = {
                **params,
                "_mean": mean.tolist(),
            }
            return transformed

        # Build matrix V = [v1 | v2] with axis directions as columns
        v1, v2 = raw_vectors[0], raw_vectors[1]
        V = np.column_stack([v1, v2])

        # Oblique coordinate projection: [α, β] = (V^T V)^{-1} V^T x
        # This finds coefficients such that x ≈ α*v1 + β*v2
        VtV = V.T @ V
        VtV_inv = np.linalg.inv(VtV)
        projection_matrix = VtV_inv @ V.T

        transformed = centered @ projection_matrix.T

        # Result: v1 maps to (1, 0) and v2 maps to (0, 1) - unit length arrows

        # Store the projection matrix and mean for reference
        transformation.parameters = {
            **params,
            "_projection_matrix": projection_matrix.tolist(),
            "_mean": mean.tolist(),
        }

        return transformed

    def _apply_custom_axes_full(
        self,
        centered: np.ndarray,
        raw_vectors: list[np.ndarray],
        params: dict,
        transformation: Transformation,
        mean: np.ndarray,
    ) -> np.ndarray:
        """Apply full N-dimensional change of basis transformation.

        Creates target basis B_target = [v1, v2, e_2, e_3, ..., e_{N-1}]
        and transforms points via B_target^{-1}.

        The output has:
        - output[0] = coefficient of v1
        - output[1] = coefficient of v2
        - output[k] for k >= 2: coefficient of e_k (modified by v1, v2 components)
        """
        N = centered.shape[1]  # Input dimensionality

        if len(raw_vectors) < 2:
            # Only one axis - use it as v1, and e_1 as v2 (or e_0 if v1 is parallel to e_0)
            v1 = raw_vectors[0]
            e0 = np.zeros(N)
            e0[0] = 1.0
            if np.abs(np.dot(v1 / np.linalg.norm(v1), e0)) > 0.99:
                # v1 is nearly parallel to e_0, use e_1 as v2
                v2 = np.zeros(N)
                v2[1] = 1.0
            else:
                v2 = e0
            raw_vectors = [v1, v2]

        v1, v2 = raw_vectors[0], raw_vectors[1]

        # Build target basis: [v1, v2, e_2, e_3, ..., e_{N-1}]
        # Start with identity matrix and replace first two columns
        B_target = np.eye(N)
        B_target[:, 0] = v1
        B_target[:, 1] = v2
        # Columns 2..N-1 remain as e_2, e_3, ..., e_{N-1}

        # Check if matrix is invertible
        det = np.linalg.det(B_target)
        if np.abs(det) < 1e-10:
            # Matrix is singular - fall back to 2D projection padded with zeros
            transformed_2d = self._apply_custom_axes_2d(centered, raw_vectors, params, transformation, mean)
            # Pad with original remaining dimensions
            transformed = np.column_stack([transformed_2d, centered[:, 2:]])
            return transformed

        # Compute transformation matrix
        B_target_inv = np.linalg.inv(B_target)

        # Apply transformation
        transformed = centered @ B_target_inv.T

        # Store the transformation matrices for reference
        transformation.parameters = {
            **params,
            "_B_target": B_target.tolist(),
            "_B_target_inv": B_target_inv.tolist(),
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
