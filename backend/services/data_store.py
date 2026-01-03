import numpy as np
from uuid import UUID, uuid4
from typing import Optional

from backend.models import Layer, Point, PointData, Selection, CustomAxis


class DataStore:
    """In-memory store for layers, points, and selections."""

    def __init__(self):
        self._layers: dict[UUID, Layer] = {}
        self._points: dict[UUID, dict[UUID, Point]] = {}  # layer_id -> {point_id -> Point}
        self._selections: dict[UUID, Selection] = {}
        self._custom_axes: dict[UUID, CustomAxis] = {}
        # Raw tabular data storage for CSV-imported layers (for column reconfiguration)
        self._raw_data: dict[UUID, dict] = {}  # layer_id -> {columns: [...], data: [[...]], row_ids: [...]}

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

    def delete_layer(self, layer_id: UUID) -> bool:
        """Delete a layer, its points, and associated custom axes."""
        if layer_id not in self._layers:
            return False
        del self._layers[layer_id]
        if layer_id in self._points:
            del self._points[layer_id]
        # Clean up custom axes associated with this layer
        axes_to_delete = [
            axis_id for axis_id, axis in self._custom_axes.items()
            if axis.layer_id == layer_id
        ]
        for axis_id in axes_to_delete:
            del self._custom_axes[axis_id]
        return True

    def update_layer(
        self,
        layer_id: UUID,
        name: Optional[str] = None,
        description: Optional[str] = None,
        feature_columns: Optional[list[str]] = None,
        label_column: Optional[str] = None,
        label_column_provided: bool = False,
    ) -> Optional[Layer]:
        """Update a layer's name, description, or column configuration."""
        layer = self._layers.get(layer_id)
        if layer is None:
            return None
        if name is not None:
            layer.name = name
        if description is not None:
            layer.description = description

        # Handle column reconfiguration for tabular data
        if (feature_columns is not None or label_column_provided) and layer_id in self._raw_data:
            raw = self._raw_data[layer_id]

            # Update feature columns
            if feature_columns is not None:
                layer.feature_columns = feature_columns
            # Update label column (can be set to None explicitly)
            if label_column_provided:
                layer.label_column = label_column

            # Recompute vectors and labels from raw data
            self._recompute_from_raw(layer, raw)

        return layer

    def _recompute_from_raw(self, layer: Layer, raw: dict) -> None:
        """Recompute points from raw tabular data based on current column config."""
        columns = raw["columns"]
        data = raw["data"]
        row_ids = raw["row_ids"]

        feature_cols = layer.feature_columns or []
        label_col = layer.label_column

        # Get column indices
        feature_indices = [columns.index(c) for c in feature_cols if c in columns]
        label_index = columns.index(label_col) if label_col and label_col in columns else None

        if not feature_indices:
            return  # No features selected

        # Clear existing points
        self._points[layer.id] = {}
        layer.point_count = 0

        # Rebuild points
        for i, (row, point_id) in enumerate(zip(data, row_ids)):
            vector = [float(row[j]) for j in feature_indices]
            label = str(row[label_index]) if label_index is not None else f"point_{i}"

            point = Point(
                id=point_id,
                label=label,
                metadata={"index": i, "class": label_index and row[label_index]},
                vector=vector,
            )
            self._points[layer.id][point.id] = point
            layer.point_count += 1

        # Update dimensionality
        layer.dimensionality = len(feature_indices)

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

    def delete_point(self, layer_id: UUID, point_id: UUID) -> bool:
        """Delete a point from a layer. Returns True if found and deleted."""
        if layer_id not in self._points:
            return False
        if point_id not in self._points[layer_id]:
            return False

        del self._points[layer_id][point_id]
        self._layers[layer_id].point_count -= 1
        return True

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

        # Set column configuration for synthetic data
        feature_names = [f"dim_{i}" for i in range(dimensionality)]
        layer.column_names = feature_names + ["cluster"]
        layer.feature_columns = feature_names
        layer.label_column = "cluster"

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

    def create_barycenter(
        self, layer_id: UUID, point_ids: list[UUID], name: Optional[str] = None
    ) -> Optional[Point]:
        """Create a virtual point at the barycenter (mean) of selected points.

        Args:
            layer_id: The layer containing the points
            point_ids: IDs of points to compute barycenter from
            name: Optional name for the virtual point

        Returns:
            The created virtual point, or None if layer not found or no valid points
        """
        if layer_id not in self._layers:
            return None

        # Get vectors for selected points
        vectors, valid_ids = self.get_vectors_as_array(layer_id, point_ids)
        if len(vectors) == 0:
            return None

        # Compute mean vector (barycenter)
        barycenter_vector = np.mean(vectors, axis=0)

        # Create virtual point
        point_name = name or f"Barycenter ({len(valid_ids)} points)"
        point_data = PointData(
            id=uuid4(),
            label=point_name,
            metadata={
                "is_barycenter": True,
                "source_point_count": len(valid_ids),
                "source_point_ids": [str(pid) for pid in valid_ids],
            },
            vector=barycenter_vector.tolist(),
            is_virtual=True,
        )

        return self.add_point(layer_id, point_data)

    # Custom axis methods
    def create_custom_axis(
        self, name: str, layer_id: UUID, point_a_id: UUID, point_b_id: UUID
    ) -> Optional[CustomAxis]:
        """Create a custom axis from two points.

        The axis direction is computed as the normalized vector from point A to point B.

        Args:
            name: Name for the custom axis
            layer_id: The layer containing the points
            point_a_id: Source point ID
            point_b_id: Target point ID

        Returns:
            The created custom axis, or None if layer or points not found
        """
        if layer_id not in self._layers:
            return None

        # Get the two points
        layer_points = self._points.get(layer_id, {})
        point_a = layer_points.get(point_a_id)
        point_b = layer_points.get(point_b_id)

        if point_a is None or point_b is None:
            return None

        # Compute direction vector (B - A) - NOT normalized
        # The raw direction is needed for oblique coordinate projection
        # to produce unit-length arrows in the output
        vec_a = np.array(point_a.vector)
        vec_b = np.array(point_b.vector)
        direction = vec_b - vec_a

        custom_axis = CustomAxis(
            id=uuid4(),
            name=name,
            layer_id=layer_id,
            point_a_id=point_a_id,
            point_b_id=point_b_id,
            vector=direction.tolist(),
        )
        self._custom_axes[custom_axis.id] = custom_axis
        return custom_axis

    def get_custom_axis(self, axis_id: UUID) -> Optional[CustomAxis]:
        """Get a custom axis by ID."""
        return self._custom_axes.get(axis_id)

    def list_custom_axes(self, layer_id: Optional[UUID] = None) -> list[CustomAxis]:
        """List custom axes, optionally filtered by layer."""
        axes = list(self._custom_axes.values())
        if layer_id is not None:
            axes = [a for a in axes if a.layer_id == layer_id]
        return axes

    def delete_custom_axis(self, axis_id: UUID) -> bool:
        """Delete a custom axis."""
        if axis_id in self._custom_axes:
            del self._custom_axes[axis_id]
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
