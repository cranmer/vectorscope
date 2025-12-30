import numpy as np
from uuid import UUID, uuid4
from typing import Optional

from backend.models import Layer, Point, PointData, Selection


class DataStore:
    """In-memory store for layers, points, and selections."""

    def __init__(self):
        self._layers: dict[UUID, Layer] = {}
        self._points: dict[UUID, dict[UUID, Point]] = {}  # layer_id -> {point_id -> Point}
        self._selections: dict[UUID, Selection] = {}

    def create_layer(
        self,
        name: str,
        dimensionality: int,
        description: Optional[str] = None,
        source_transformation_id: Optional[UUID] = None,
    ) -> Layer:
        """Create a new layer."""
        layer = Layer(
            id=uuid4(),
            name=name,
            description=description,
            dimensionality=dimensionality,
            source_transformation_id=source_transformation_id,
            is_derived=source_transformation_id is not None,
        )
        self._layers[layer.id] = layer
        self._points[layer.id] = {}
        return layer

    def get_layer(self, layer_id: UUID) -> Optional[Layer]:
        """Get a layer by ID."""
        return self._layers.get(layer_id)

    def list_layers(self) -> list[Layer]:
        """List all layers."""
        return list(self._layers.values())

    def add_point(self, layer_id: UUID, point_data: PointData) -> Optional[Point]:
        """Add a point to a layer."""
        if layer_id not in self._layers:
            return None

        point = Point(
            id=point_data.id,
            label=point_data.label,
            metadata=point_data.metadata,
            vector=point_data.vector,
            is_virtual=point_data.is_virtual,
        )
        self._points[layer_id][point.id] = point
        self._layers[layer_id].point_count += 1
        return point

    def add_points_bulk(self, layer_id: UUID, points: list[PointData]) -> int:
        """Add multiple points to a layer efficiently."""
        if layer_id not in self._layers:
            return 0

        count = 0
        for point_data in points:
            point = Point(
                id=point_data.id,
                label=point_data.label,
                metadata=point_data.metadata,
                vector=point_data.vector,
                is_virtual=point_data.is_virtual,
            )
            self._points[layer_id][point.id] = point
            count += 1

        self._layers[layer_id].point_count += count
        return count

    def get_points(
        self, layer_id: UUID, point_ids: Optional[list[UUID]] = None
    ) -> list[Point]:
        """Get points from a layer, optionally filtered by IDs."""
        if layer_id not in self._points:
            return []

        layer_points = self._points[layer_id]
        if point_ids is None:
            return list(layer_points.values())

        return [layer_points[pid] for pid in point_ids if pid in layer_points]

    def get_vectors_as_array(
        self, layer_id: UUID, point_ids: Optional[list[UUID]] = None
    ) -> tuple[np.ndarray, list[UUID]]:
        """Get vectors as a numpy array for efficient computation.

        Returns (vectors_array, point_ids) where vectors_array has shape (n_points, dimensionality).
        """
        points = self.get_points(layer_id, point_ids)
        if not points:
            return np.array([]), []

        vectors = np.array([p.vector for p in points])
        ids = [p.id for p in points]
        return vectors, ids

    def generate_synthetic_data(
        self,
        n_points: int = 1000,
        dimensionality: int = 30,
        n_clusters: int = 5,
        layer_name: str = "synthetic",
    ) -> Layer:
        """Generate synthetic clustered data for testing."""
        np.random.seed(42)

        # Generate cluster centers
        centers = np.random.randn(n_clusters, dimensionality) * 3

        # Assign points to clusters
        cluster_assignments = np.random.randint(0, n_clusters, n_points)

        # Generate points around cluster centers
        vectors = np.zeros((n_points, dimensionality))
        for i in range(n_points):
            cluster = cluster_assignments[i]
            vectors[i] = centers[cluster] + np.random.randn(dimensionality) * 0.5

        # Create layer
        layer = self.create_layer(
            name=layer_name,
            dimensionality=dimensionality,
            description=f"Synthetic dataset with {n_clusters} clusters",
        )

        # Add points
        points = []
        for i in range(n_points):
            points.append(
                PointData(
                    id=uuid4(),
                    label=f"point_{i}",
                    metadata={"cluster": int(cluster_assignments[i]), "index": i},
                    vector=vectors[i].tolist(),
                )
            )

        self.add_points_bulk(layer.id, points)
        return layer

    # Selection methods
    def create_selection(
        self, name: str, layer_id: UUID, point_ids: list[UUID]
    ) -> Optional[Selection]:
        """Create a named selection."""
        if layer_id not in self._layers:
            return None

        selection = Selection(
            id=uuid4(),
            name=name,
            layer_id=layer_id,
            point_ids=point_ids,
            point_count=len(point_ids),
        )
        self._selections[selection.id] = selection
        return selection

    def get_selection(self, selection_id: UUID) -> Optional[Selection]:
        """Get a selection by ID."""
        return self._selections.get(selection_id)

    def list_selections(self) -> list[Selection]:
        """List all selections."""
        return list(self._selections.values())

    def delete_selection(self, selection_id: UUID) -> bool:
        """Delete a selection."""
        if selection_id in self._selections:
            del self._selections[selection_id]
            return True
        return False


# Singleton instance
_data_store: Optional[DataStore] = None


def get_data_store() -> DataStore:
    """Get the singleton DataStore instance."""
    global _data_store
    if _data_store is None:
        _data_store = DataStore()
    return _data_store
