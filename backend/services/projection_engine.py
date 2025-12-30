import numpy as np
from sklearn.decomposition import PCA
from sklearn.manifold import TSNE
from uuid import UUID, uuid4
from typing import Optional

from backend.models import Projection, ProjectionType, ProjectedPoint
from backend.services.data_store import DataStore


class ProjectionEngine:
    """Engine for computing projections from high-dimensional to 2D/3D."""

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
        point_ids: Optional[list[UUID]] = None,
    ) -> Optional[Projection]:
        """Create and compute a projection."""
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

        # Compute the projection
        results = self._compute_projection(projection, point_ids)
        if results is None:
            return None

        self._projections[projection.id] = projection
        self._projection_results[projection.id] = results

        return projection

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
            coords = self._compute_pca(vectors, projection.dimensions)
        elif projection.type == ProjectionType.TSNE:
            coords = self._compute_tsne(
                vectors, projection.dimensions, projection.random_seed
            )
        elif projection.type == ProjectionType.CUSTOM_AXES:
            coords = self._compute_custom_axes(
                vectors, projection.dimensions, projection.parameters
            )
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

    def _compute_pca(self, vectors: np.ndarray, dimensions: int) -> np.ndarray:
        """Compute PCA projection."""
        n_components = min(dimensions, vectors.shape[1], vectors.shape[0])
        pca = PCA(n_components=n_components)
        return pca.fit_transform(vectors)

    def _compute_tsne(
        self, vectors: np.ndarray, dimensions: int, random_seed: int
    ) -> np.ndarray:
        """Compute t-SNE projection."""
        n_samples = vectors.shape[0]
        perplexity = min(30, n_samples - 1)  # t-SNE requires perplexity < n_samples

        tsne = TSNE(
            n_components=dimensions,
            random_state=random_seed,
            perplexity=perplexity,
        )
        return tsne.fit_transform(vectors)

    def _compute_custom_axes(
        self, vectors: np.ndarray, dimensions: int, parameters: dict
    ) -> np.ndarray:
        """Compute projection using custom axis definitions.

        Parameters should include 'axes' which is a list of axis definitions.
        Each axis can be defined as:
        - {"type": "direction", "vector": [...]}: Use a specific direction vector
        - {"type": "points", "from_id": ..., "to_id": ...}: Direction from one point to another
        """
        axes = parameters.get("axes", [])
        if not axes:
            # Fall back to PCA if no axes defined
            return self._compute_pca(vectors, dimensions)

        # Build projection matrix from axis definitions
        projection_vectors = []
        for axis_def in axes[:dimensions]:
            if axis_def.get("type") == "direction":
                vec = np.array(axis_def["vector"])
                vec = vec / np.linalg.norm(vec)  # Normalize
                projection_vectors.append(vec)

        if len(projection_vectors) < dimensions:
            # Fill remaining with PCA components
            pca = PCA(n_components=dimensions - len(projection_vectors))
            pca.fit(vectors)
            for comp in pca.components_:
                projection_vectors.append(comp)

        projection_matrix = np.array(projection_vectors[:dimensions])
        return vectors @ projection_matrix.T

    def get_projection(self, projection_id: UUID) -> Optional[Projection]:
        """Get a projection by ID."""
        return self._projections.get(projection_id)

    def get_projection_coordinates(
        self, projection_id: UUID
    ) -> Optional[list[ProjectedPoint]]:
        """Get computed coordinates for a projection."""
        return self._projection_results.get(projection_id)

    def list_projections(self) -> list[Projection]:
        """List all projections."""
        return list(self._projections.values())
