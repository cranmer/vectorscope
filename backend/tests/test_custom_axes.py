import pytest
import numpy as np
from uuid import uuid4
from sklearn.datasets import load_iris

from backend.services.data_store import DataStore
from backend.services.projection_engine import ProjectionEngine
from backend.models import ProjectionType, PointData


class TestCustomAxesProjection:
    """Test custom axes projection with iris dataset."""

    def test_custom_axes_unit_length(self):
        """
        Load iris dataset, create barycenters for each class, define custom axes
        between barycenters, and verify the transformed axes have unit length.

        Axis 1: versicolor → virginica
        Axis 2: versicolor → setosa
        """
        # Load iris dataset directly from sklearn
        iris = load_iris()
        vectors = iris.data
        targets = iris.target
        target_names = iris.target_names

        # Create layer and add points
        store = DataStore()
        layer = store.create_layer(
            name="Iris",
            dimensionality=vectors.shape[1],
            description="Iris dataset"
        )

        # Add points with class metadata
        points_data = []
        for i, (vec, target) in enumerate(zip(vectors, targets)):
            points_data.append(PointData(
                label=str(target_names[target]),
                vector=vec.tolist(),
                metadata={"class": int(target)}
            ))
        store.add_points_bulk(layer.id, points_data)

        assert layer.point_count == 150, "Iris should have 150 points"

        # Get all points and group by class
        points = store.get_points(layer.id)

        # Iris classes: 0=setosa, 1=versicolor, 2=virginica
        points_by_class = {0: [], 1: [], 2: []}
        vectors_by_class = {0: [], 1: [], 2: []}

        for point in points:
            class_id = point.metadata.get("class")
            if class_id is not None:
                points_by_class[class_id].append(point)
                vectors_by_class[class_id].append(point.vector)

        assert len(points_by_class[0]) == 50, "Setosa should have 50 points"
        assert len(points_by_class[1]) == 50, "Versicolor should have 50 points"
        assert len(points_by_class[2]) == 50, "Virginica should have 50 points"

        # Compute barycenters (mean vectors) for each class
        barycenter_setosa = np.mean(vectors_by_class[0], axis=0)
        barycenter_versicolor = np.mean(vectors_by_class[1], axis=0)
        barycenter_virginica = np.mean(vectors_by_class[2], axis=0)

        # Create virtual points for barycenters
        setosa_barycenter_id = uuid4()
        versicolor_barycenter_id = uuid4()
        virginica_barycenter_id = uuid4()

        store.add_point(layer.id, PointData(
            id=setosa_barycenter_id,
            label="setosa_barycenter",
            vector=barycenter_setosa.tolist(),
            is_virtual=True,
            metadata={"class": 0}
        ))
        store.add_point(layer.id, PointData(
            id=versicolor_barycenter_id,
            label="versicolor_barycenter",
            vector=barycenter_versicolor.tolist(),
            is_virtual=True,
            metadata={"class": 1}
        ))
        store.add_point(layer.id, PointData(
            id=virginica_barycenter_id,
            label="virginica_barycenter",
            vector=barycenter_virginica.tolist(),
            is_virtual=True,
            metadata={"class": 2}
        ))

        # Define axis directions
        # Axis 1: versicolor → virginica
        axis1_direction = (barycenter_virginica - barycenter_versicolor).tolist()

        # Axis 2: versicolor → setosa
        axis2_direction = (barycenter_setosa - barycenter_versicolor).tolist()

        # Create custom axes projection
        engine = ProjectionEngine(store)
        projection = engine.create_projection(
            name="custom_axes_test",
            type=ProjectionType.CUSTOM_AXES,
            layer_id=layer.id,
            dimensions=2,
            parameters={
                "axes": [
                    {"type": "direction", "vector": axis1_direction},
                    {"type": "direction", "vector": axis2_direction},
                ]
            },
            compute_now=True,
        )

        assert projection is not None, "Failed to create custom axes projection"

        # Get projected coordinates
        coords = engine.get_projection_coordinates(projection.id)
        assert coords is not None, "Failed to get projection coordinates"

        # Find the projected barycenters
        coord_map = {c.id: c.coordinates for c in coords}

        versicolor_proj = np.array(coord_map[versicolor_barycenter_id])
        virginica_proj = np.array(coord_map[virginica_barycenter_id])
        setosa_proj = np.array(coord_map[setosa_barycenter_id])

        # Compute transformed axis vectors
        # Axis 1: versicolor → virginica in projected space
        axis1_transformed = virginica_proj - versicolor_proj

        # Axis 2: versicolor → setosa in projected space
        axis2_transformed = setosa_proj - versicolor_proj

        # Check that transformed axes have unit length
        axis1_length = np.linalg.norm(axis1_transformed)
        axis2_length = np.linalg.norm(axis2_transformed)

        print(f"Axis 1 (versicolor→virginica) transformed: {axis1_transformed}")
        print(f"Axis 1 length: {axis1_length}")
        print(f"Axis 2 (versicolor→setosa) transformed: {axis2_transformed}")
        print(f"Axis 2 length: {axis2_length}")

        # Verify unit length (with small tolerance for floating point)
        assert np.isclose(axis1_length, 1.0, atol=1e-10), \
            f"Axis 1 should have unit length, got {axis1_length}"
        assert np.isclose(axis2_length, 1.0, atol=1e-10), \
            f"Axis 2 should have unit length, got {axis2_length}"

        # Verify axes are orthogonal
        dot_product = np.dot(axis1_transformed, axis2_transformed)
        print(f"Dot product of axes: {dot_product}")

        assert np.isclose(dot_product, 0.0, atol=1e-10), \
            f"Axes should be orthogonal, got dot product {dot_product}"

        # Verify axis directions
        # Axis 1 should point along +X: (1, 0)
        assert np.isclose(axis1_transformed[0], 1.0, atol=1e-10), \
            f"Axis 1 should point along +X, got {axis1_transformed}"
        assert np.isclose(axis1_transformed[1], 0.0, atol=1e-10), \
            f"Axis 1 should have no Y component, got {axis1_transformed}"

        # Axis 2 should point along +Y: (0, 1)
        assert np.isclose(axis2_transformed[0], 0.0, atol=1e-10), \
            f"Axis 2 should have no X component, got {axis2_transformed}"
        assert np.isclose(axis2_transformed[1], 1.0, atol=1e-10), \
            f"Axis 2 should point along +Y, got {axis2_transformed}"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
