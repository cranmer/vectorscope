import numpy as np
from sklearn.decomposition import PCA
from sklearn.manifold import TSNE
from umap import UMAP
from uuid import UUID, uuid4
from typing import Optional

from backend.models import Projection, ProjectionType, ProjectedPoint
from backend.services.data_store import DataStore


class ProjectionEngine:
    """Engine for computing projections from high-dimensional to 2D/3D.

    Projections are computed lazily - only when coordinates are requested.
    Results are cached for subsequent requests.
    """

    def __init__(self, data_store: DataStore):
        self._data_store = data_store
        self._projections: dict[UUID, Projection] = {}
        self._projection_results: dict[UUID, list[ProjectedPoint]] = {}

    def create_projection(
        self,
        name: str,
        type: ProjectionType,
        layer_id: UUID,
        dimensions: int = 2,
        parameters: Optional[dict] = None,
        compute_now: bool = False,
    ) -> Optional[Projection]:
        """Create a projection. Computation is lazy unless compute_now=True."""
        layer = self._data_store.get_layer(layer_id)
        if layer is None:
            return None

        # Get random seed for reproducibility
        random_seed = (parameters or {}).get("random_seed", np.random.randint(0, 10000))

        projection = Projection(
            id=uuid4(),
            name=name,
            type=type,
            layer_id=layer_id,
            dimensions=dimensions,
            parameters=parameters or {},
            random_seed=random_seed,
        )

        self._projections[projection.id] = projection

        # Only compute if explicitly requested
        if compute_now:
            self._ensure_computed(projection.id)

        return projection

    def _ensure_computed(self, projection_id: UUID) -> bool:
        """Ensure projection coordinates are computed. Returns True if successful."""
        if projection_id in self._projection_results:
            return True

        projection = self._projections.get(projection_id)
        if projection is None:
            return False

        # Update status
        from backend.status import get_status_tracker
        tracker = get_status_tracker()
        tracker.set_status("computing", f"Computing {projection.type.value.upper()}: {projection.name}")

        results = self._compute_projection(projection)
        if results:
            self._projection_results[projection_id] = results
            tracker.set_status("idle", None)
            return True

        tracker.set_status("idle", None)
        return False

    def _compute_projection(
        self, projection: Projection, point_ids: Optional[list[UUID]] = None
    ) -> Optional[list[ProjectedPoint]]:
        """Compute projection coordinates for points."""
        vectors, pids = self._data_store.get_vectors_as_array(
            projection.layer_id, point_ids
        )
        if len(vectors) == 0:
            return None

        # Get source points for metadata
        source_points = {
            p.id: p for p in self._data_store.get_points(projection.layer_id, point_ids)
        }

        # Compute projection
        if projection.type == ProjectionType.PCA:
            coords = self._compute_pca(vectors, projection.dimensions, projection.parameters)
        elif projection.type == ProjectionType.TSNE:
            coords = self._compute_tsne(
                vectors, projection.dimensions, projection.random_seed, projection.parameters
            )
        elif projection.type == ProjectionType.UMAP:
            coords = self._compute_umap(
                vectors, projection.dimensions, projection.random_seed, projection.parameters
            )
        elif projection.type == ProjectionType.CUSTOM_AXES:
            coords = self._compute_custom_axes(
                vectors, projection.dimensions, projection.parameters
            )
        elif projection.type == ProjectionType.DIRECT:
            coords = self._compute_direct(vectors, projection.dimensions, projection.parameters)
        elif projection.type == ProjectionType.DENSITY:
            coords = self._compute_density(vectors, projection.parameters)
        elif projection.type == ProjectionType.BOXPLOT:
            coords = self._compute_boxplot(vectors, projection.parameters)
        elif projection.type == ProjectionType.VIOLIN:
            coords = self._compute_violin(vectors, projection.parameters)
        else:
            return None

        # Build results
        results = []
        for i, pid in enumerate(pids):
            source_point = source_points[pid]
            results.append(
                ProjectedPoint(
                    id=pid,
                    label=source_point.label,
                    metadata=source_point.metadata,
                    coordinates=coords[i].tolist(),
                    is_virtual=source_point.is_virtual,
                )
            )

        return results

    def _compute_pca(
        self, vectors: np.ndarray, dimensions: int, parameters: dict
    ) -> np.ndarray:
        """Compute PCA projection.

        Parameters:
            components: list of component indices to use (0-indexed), e.g., [2, 3] for PC3 and PC4
                       If not specified, uses [0, 1, ...] for top components
        """
        # Get which components to use
        component_indices = parameters.get("components")

        if component_indices:
            # Need to compute enough components to get the ones requested
            max_component = max(component_indices) + 1
            n_components = min(max_component, vectors.shape[1], vectors.shape[0])
        else:
            # Default: use top components
            n_components = min(dimensions, vectors.shape[1], vectors.shape[0])
            component_indices = list(range(n_components))

        pca = PCA(n_components=n_components)
        all_coords = pca.fit_transform(vectors)

        # Select only the requested components
        selected_indices = [i for i in component_indices if i < all_coords.shape[1]]
        if len(selected_indices) < dimensions:
            # Pad with remaining components if requested ones not available
            for i in range(all_coords.shape[1]):
                if i not in selected_indices:
                    selected_indices.append(i)
                if len(selected_indices) >= dimensions:
                    break

        return all_coords[:, selected_indices[:dimensions]]

    def _compute_tsne(
        self, vectors: np.ndarray, dimensions: int, random_seed: int, parameters: dict
    ) -> np.ndarray:
        """Compute t-SNE projection.

        Parameters:
            perplexity: float (default 30), must be less than n_samples
            learning_rate: float or 'auto' (default 'auto')
            n_iter: int (default 1000) - maps to sklearn's max_iter
            early_exaggeration: float (default 12.0)
        """
        n_samples = vectors.shape[0]

        # Get configurable parameters with defaults
        perplexity = parameters.get("perplexity", 30)
        perplexity = min(perplexity, n_samples - 1)  # t-SNE requires perplexity < n_samples

        learning_rate = parameters.get("learning_rate", "auto")
        max_iter = parameters.get("n_iter", 1000)  # UI uses n_iter, sklearn uses max_iter
        early_exaggeration = parameters.get("early_exaggeration", 12.0)

        tsne = TSNE(
            n_components=dimensions,
            random_state=random_seed,
            perplexity=perplexity,
            learning_rate=learning_rate,
            max_iter=max_iter,
            early_exaggeration=early_exaggeration,
        )
        return tsne.fit_transform(vectors)

    def _compute_umap(
        self, vectors: np.ndarray, dimensions: int, random_seed: int, parameters: dict
    ) -> np.ndarray:
        """Compute UMAP projection.

        Parameters:
            n_neighbors: int (default 15) - number of neighbors for local structure
            min_dist: float (default 0.1) - minimum distance between points in embedding
            metric: str (default 'euclidean') - distance metric
            spread: float (default 1.0) - scale of embedded points
        """
        n_neighbors = parameters.get("n_neighbors", 15)
        min_dist = parameters.get("min_dist", 0.1)
        metric = parameters.get("metric", "euclidean")
        spread = parameters.get("spread", 1.0)

        # Ensure n_neighbors doesn't exceed number of samples
        n_neighbors = min(n_neighbors, vectors.shape[0] - 1)

        umap = UMAP(
            n_components=dimensions,
            random_state=random_seed,
            n_neighbors=n_neighbors,
            min_dist=min_dist,
            metric=metric,
            spread=spread,
        )
        return umap.fit_transform(vectors)

    def _compute_custom_axes(
        self, vectors: np.ndarray, dimensions: int, parameters: dict
    ) -> np.ndarray:
        """Compute projection using custom axis definitions.

        Uses oblique coordinate projection: finds coefficients (α, β) such that
        each point's position in the plane is α*v1 + β*v2 (plus orthogonal component).
        This ensures that the original axis directions map to the coordinate axes
        in the output, making the arrows appear orthonormal.

        If not enough axes are provided, returns zeros for missing dimensions.
        """
        axes = parameters.get("axes", [])
        if not axes:
            # No axes defined - return zeros
            return np.zeros((vectors.shape[0], dimensions))

        # Extract direction vectors
        raw_vectors = []
        for axis_def in axes[:dimensions]:
            if axis_def.get("type") == "direction":
                vec = np.array(axis_def["vector"], dtype=np.float64)
                if np.linalg.norm(vec) > 1e-10:  # Skip zero vectors
                    raw_vectors.append(vec)

        if len(raw_vectors) == 0:
            return np.zeros((vectors.shape[0], dimensions))

        if len(raw_vectors) < 2:
            # Only one axis - project onto it
            v1 = raw_vectors[0]
            e1 = v1 / np.linalg.norm(v1)
            mean = np.mean(vectors, axis=0)
            centered = vectors - mean
            coords = (centered @ e1).reshape(-1, 1)
            if dimensions == 2:
                coords = np.column_stack([coords, np.zeros(len(vectors))])
            return coords

        # Build matrix V = [v1 | v2] with axis directions as columns
        v1, v2 = raw_vectors[0], raw_vectors[1]
        V = np.column_stack([v1, v2])

        # Center data on mean
        mean = np.mean(vectors, axis=0)
        centered = vectors - mean

        # Oblique coordinate projection: [α, β] = (V^T V)^{-1} V^T x
        # This finds coefficients such that x ≈ α*v1 + β*v2
        VtV = V.T @ V
        VtV_inv = np.linalg.inv(VtV)
        projection_matrix = VtV_inv @ V.T

        projected = centered @ projection_matrix.T

        # Scale each axis by the original vector magnitude
        # So v1 maps to (||v1||, 0) and v2 maps to (0, ||v2||)
        scales = np.array([np.linalg.norm(v1), np.linalg.norm(v2)])
        projected = projected * scales

        # Pad with zeros if we have fewer axes than dimensions
        if projected.shape[1] < dimensions:
            padding = np.zeros((vectors.shape[0], dimensions - projected.shape[1]))
            projected = np.concatenate([projected, padding], axis=1)

        return projected

    def _compute_direct(
        self, vectors: np.ndarray, dimensions: int, parameters: dict
    ) -> np.ndarray:
        """Directly use raw dimension values as coordinates.

        Parameters:
            dim_x: int (default 0) - dimension index for X axis
            dim_y: int (default 1) - dimension index for Y axis
        """
        dim_x = parameters.get("dim_x", 0)
        dim_y = parameters.get("dim_y", 1)

        n_dims = vectors.shape[1]

        # Ensure indices are valid
        dim_x = min(dim_x, n_dims - 1)
        dim_y = min(dim_y, n_dims - 1)

        if dimensions == 2:
            return np.column_stack([vectors[:, dim_x], vectors[:, dim_y]])
        else:
            # For 3D, also include dim_z
            dim_z = parameters.get("dim_z", 2)
            dim_z = min(dim_z, n_dims - 1)
            return np.column_stack([vectors[:, dim_x], vectors[:, dim_y], vectors[:, dim_z]])

    def _compute_density(
        self, vectors: np.ndarray, parameters: dict
    ) -> np.ndarray:
        """Compute density/KDE data for a single dimension.

        This returns the raw dimension value as X and a small jitter as Y
        for scatter plot display. The actual density/KDE rendering is done in frontend.

        Parameters:
            dim: int (default 0) - dimension index to display
            kde: bool (default True) - whether to show KDE overlay
            bins: int (default 30) - number of bins for histogram background
        """
        dim = parameters.get("dim", 0)
        n_dims = vectors.shape[1]
        dim = min(dim, n_dims - 1)

        # For density view, X is the dimension value
        # Y is a small random jitter for scatter display (strip plot style)
        x_values = vectors[:, dim]
        y_jitter = np.random.uniform(-0.1, 0.1, len(x_values))

        return np.column_stack([x_values, y_jitter])

    def _compute_boxplot(
        self, vectors: np.ndarray, parameters: dict
    ) -> np.ndarray:
        """Compute boxplot data for a single dimension.

        This returns the raw dimension value as X and a small jitter as Y
        for scatter plot display. The actual box plot rendering is done in frontend.

        Parameters:
            dim: int (default 0) - dimension index to boxplot
        """
        dim = parameters.get("dim", 0)
        n_dims = vectors.shape[1]
        dim = min(dim, n_dims - 1)

        # For boxplot view, X is the dimension value
        # Y is a small random jitter for scatter display
        x_values = vectors[:, dim]
        y_jitter = np.random.uniform(-0.1, 0.1, len(x_values))

        return np.column_stack([x_values, y_jitter])

    def _compute_violin(
        self, vectors: np.ndarray, parameters: dict
    ) -> np.ndarray:
        """Compute violin plot data for a single dimension.

        This returns the raw dimension value as X and a small jitter as Y
        for scatter plot display. The actual violin plot rendering is done in frontend.

        Parameters:
            dim: int (default 0) - dimension index to plot
        """
        dim = parameters.get("dim", 0)
        n_dims = vectors.shape[1]
        dim = min(dim, n_dims - 1)

        # For violin view, X is the dimension value
        # Y is a small random jitter for scatter display
        x_values = vectors[:, dim]
        y_jitter = np.random.uniform(-0.1, 0.1, len(x_values))

        return np.column_stack([x_values, y_jitter])

    def update_projection(
        self,
        projection_id: UUID,
        name: Optional[str] = None,
        parameters: Optional[dict] = None,
    ) -> Optional[Projection]:
        """Update a projection's name or parameters.

        If parameters change, the cached coordinates are invalidated.
        """
        projection = self._projections.get(projection_id)
        if projection is None:
            return None

        if name is not None:
            projection.name = name

        if parameters is not None:
            projection.parameters = parameters
            # Invalidate cache since parameters changed - will recompute on next request
            if projection.id in self._projection_results:
                del self._projection_results[projection.id]

        return projection

    def _update_layer_reference(self, old_layer_id: UUID, new_layer_id: UUID):
        """Update projections that reference an old layer to point to a new layer."""
        for projection in self._projections.values():
            if projection.layer_id == old_layer_id:
                projection.layer_id = new_layer_id
                # Invalidate cache - will recompute on next request
                if projection.id in self._projection_results:
                    del self._projection_results[projection.id]

    def invalidate_cache(self, projection_id: Optional[UUID] = None):
        """Invalidate cached results. If projection_id is None, invalidates all."""
        if projection_id is None:
            self._projection_results.clear()
        elif projection_id in self._projection_results:
            del self._projection_results[projection_id]

    def set_cached_coordinates(self, projection_id: UUID, results: list[ProjectedPoint]):
        """Set cached coordinates (used when loading from file)."""
        self._projection_results[projection_id] = results

    def get_projection(self, projection_id: UUID) -> Optional[Projection]:
        """Get a projection by ID."""
        return self._projections.get(projection_id)

    def get_projection_coordinates(
        self, projection_id: UUID
    ) -> Optional[list[ProjectedPoint]]:
        """Get computed coordinates for a projection. Computes lazily if needed."""
        # Ensure computed (lazy load)
        self._ensure_computed(projection_id)
        return self._projection_results.get(projection_id)

    def is_computed(self, projection_id: UUID) -> bool:
        """Check if projection coordinates are already computed."""
        return projection_id in self._projection_results

    def delete_projection(self, projection_id: UUID) -> bool:
        """Delete a projection. Returns True if found and deleted."""
        if projection_id not in self._projections:
            return False
        del self._projections[projection_id]
        if projection_id in self._projection_results:
            del self._projection_results[projection_id]
        return True

    def list_projections(self) -> list[Projection]:
        """List all projections."""
        return list(self._projections.values())


# Singleton instance
_projection_engine: Optional[ProjectionEngine] = None


def get_projection_engine() -> ProjectionEngine:
    """Get the singleton ProjectionEngine instance."""
    global _projection_engine
    if _projection_engine is None:
        from backend.services.data_store import get_data_store
        _projection_engine = ProjectionEngine(get_data_store())
    return _projection_engine
