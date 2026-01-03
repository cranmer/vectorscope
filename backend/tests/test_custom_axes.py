import pytest
import numpy as np
from uuid import UUID
from sklearn.datasets import load_iris

from backend.services.data_store import DataStore
from backend.services.projection_engine import ProjectionEngine
from backend.services.transform_engine import TransformEngine
from backend.models import ProjectionType, TransformationType, PointData


class TestCustomAxesProjection:
    """Test custom axes projection with iris dataset."""

    def test_custom_axes_unit_length(self):
        """
        Load iris dataset, create barycenters for each class using the API,
        create custom axes using the API, create a custom_axes projection,
        and verify the transformed axes have unit length.

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
        points_by_class: dict[int, list[UUID]] = {0: [], 1: [], 2: []}

        for point in points:
            class_id = point.metadata.get("class")
            if class_id is not None:
                points_by_class[class_id].append(point.id)

        assert len(points_by_class[0]) == 50, "Setosa should have 50 points"
        assert len(points_by_class[1]) == 50, "Versicolor should have 50 points"
        assert len(points_by_class[2]) == 50, "Virginica should have 50 points"

        # Create barycenters using the API
        setosa_barycenter = store.create_barycenter(
            layer.id, points_by_class[0], name="setosa_barycenter"
        )
        versicolor_barycenter = store.create_barycenter(
            layer.id, points_by_class[1], name="versicolor_barycenter"
        )
        virginica_barycenter = store.create_barycenter(
            layer.id, points_by_class[2], name="virginica_barycenter"
        )

        assert setosa_barycenter is not None, "Failed to create setosa barycenter"
        assert versicolor_barycenter is not None, "Failed to create versicolor barycenter"
        assert virginica_barycenter is not None, "Failed to create virginica barycenter"

        # Create custom axes using the API
        # Axis 1: versicolor → virginica
        axis1 = store.create_custom_axis(
            name="versicolor_to_virginica",
            layer_id=layer.id,
            point_a_id=versicolor_barycenter.id,
            point_b_id=virginica_barycenter.id,
        )

        # Axis 2: versicolor → setosa
        axis2 = store.create_custom_axis(
            name="versicolor_to_setosa",
            layer_id=layer.id,
            point_a_id=versicolor_barycenter.id,
            point_b_id=setosa_barycenter.id,
        )

        assert axis1 is not None, "Failed to create axis 1"
        assert axis2 is not None, "Failed to create axis 2"

        # The custom axis now stores the raw (unnormalized) direction vector
        # This is what gets passed to the projection via the API
        # Create custom axes projection using the API-stored direction vectors
        engine = ProjectionEngine(store)
        projection = engine.create_projection(
            name="custom_axes_test",
            type=ProjectionType.CUSTOM_AXES,
            layer_id=layer.id,
            dimensions=2,
            parameters={
                "axes": [
                    {"type": "direction", "vector": axis1.vector},
                    {"type": "direction", "vector": axis2.vector},
                ],
                "axis_x_id": str(axis1.id),
                "axis_y_id": str(axis2.id),
            },
            compute_now=True,
        )

        assert projection is not None, "Failed to create custom axes projection"

        # Get projected coordinates
        coords = engine.get_projection_coordinates(projection.id)
        assert coords is not None, "Failed to get projection coordinates"

        # Find the projected barycenters
        coord_map = {c.id: c.coordinates for c in coords}

        versicolor_proj = np.array(coord_map[versicolor_barycenter.id])
        virginica_proj = np.array(coord_map[virginica_barycenter.id])
        setosa_proj = np.array(coord_map[setosa_barycenter.id])

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


class TestCustomAxesTransformationND:
    """Test N-dimensional custom axes transformation with iris dataset."""

    def test_custom_axes_transformation_full_output(self):
        """
        Load iris dataset (4D), create barycenters for each class,
        create custom axes, apply transformation with output_mode="full",
        and verify:
        1. Output is 4D (same as input)
        2. v1 maps to (1, 0, *, *)
        3. v2 maps to (0, 1, *, *)
        4. The transformed axes are orthonormal in the first 2 dimensions

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
        points_by_class: dict[int, list[UUID]] = {0: [], 1: [], 2: []}

        for point in points:
            class_id = point.metadata.get("class")
            if class_id is not None:
                points_by_class[class_id].append(point.id)

        # Create barycenters using the API
        setosa_barycenter = store.create_barycenter(
            layer.id, points_by_class[0], name="setosa_barycenter"
        )
        versicolor_barycenter = store.create_barycenter(
            layer.id, points_by_class[1], name="versicolor_barycenter"
        )
        virginica_barycenter = store.create_barycenter(
            layer.id, points_by_class[2], name="virginica_barycenter"
        )

        assert setosa_barycenter is not None
        assert versicolor_barycenter is not None
        assert virginica_barycenter is not None

        # Create custom axes using the API
        # Axis 1: versicolor → virginica
        axis1 = store.create_custom_axis(
            name="versicolor_to_virginica",
            layer_id=layer.id,
            point_a_id=versicolor_barycenter.id,
            point_b_id=virginica_barycenter.id,
        )

        # Axis 2: versicolor → setosa
        axis2 = store.create_custom_axis(
            name="versicolor_to_setosa",
            layer_id=layer.id,
            point_a_id=versicolor_barycenter.id,
            point_b_id=setosa_barycenter.id,
        )

        assert axis1 is not None
        assert axis2 is not None

        # Create transformation with CUSTOM_AFFINE (N-D output)
        engine = TransformEngine(store)
        transformation = engine.create_transformation(
            name="custom_axes_nd_test",
            type=TransformationType.CUSTOM_AFFINE,
            source_layer_id=layer.id,
            parameters={
                "axes": [
                    {"type": "direction", "vector": axis1.vector},
                    {"type": "direction", "vector": axis2.vector},
                ],
                "source_type": "direct",
                "projection_mode": "affine",  # Use affine (change of basis) mode
            },
        )

        assert transformation is not None, "Failed to create transformation"
        assert transformation.target_layer_id is not None, "Transformation should create target layer"

        # Get the target layer
        target_layer = store.get_layer(transformation.target_layer_id)
        assert target_layer is not None, "Target layer should exist"

        # Verify output dimensionality is 4 (same as input)
        assert target_layer.dimensionality == 4, \
            f"Output should be 4D, got {target_layer.dimensionality}D"

        # Get transformed points
        transformed_points = store.get_points(target_layer.id)
        coord_map = {p.id: np.array(p.vector) for p in transformed_points}

        # Find the transformed barycenters
        versicolor_trans = coord_map[versicolor_barycenter.id]
        virginica_trans = coord_map[virginica_barycenter.id]
        setosa_trans = coord_map[setosa_barycenter.id]

        # Compute transformed axis vectors (in 4D)
        axis1_transformed = virginica_trans - versicolor_trans
        axis2_transformed = setosa_trans - versicolor_trans

        print(f"\n=== N-D Transformation Test ===")
        print(f"Output dimensionality: {target_layer.dimensionality}")
        print(f"Axis 1 transformed (4D): {axis1_transformed}")
        print(f"Axis 2 transformed (4D): {axis2_transformed}")

        # In the first 2 dimensions, v1 should map to (1, 0)
        # and v2 should map to (0, 1)
        axis1_2d = axis1_transformed[:2]
        axis2_2d = axis2_transformed[:2]

        print(f"Axis 1 first 2 dims: {axis1_2d}")
        print(f"Axis 2 first 2 dims: {axis2_2d}")

        # Verify unit length in first 2 dimensions
        axis1_2d_length = np.linalg.norm(axis1_2d)
        axis2_2d_length = np.linalg.norm(axis2_2d)

        print(f"Axis 1 2D length: {axis1_2d_length}")
        print(f"Axis 2 2D length: {axis2_2d_length}")

        assert np.isclose(axis1_2d_length, 1.0, atol=1e-10), \
            f"Axis 1 should have unit length in 2D, got {axis1_2d_length}"
        assert np.isclose(axis2_2d_length, 1.0, atol=1e-10), \
            f"Axis 2 should have unit length in 2D, got {axis2_2d_length}"

        # Verify orthogonality in 2D
        dot_2d = np.dot(axis1_2d, axis2_2d)
        print(f"2D dot product: {dot_2d}")

        assert np.isclose(dot_2d, 0.0, atol=1e-10), \
            f"Axes should be orthogonal in 2D, got dot product {dot_2d}"

        # Verify axis directions in 2D
        assert np.isclose(axis1_2d[0], 1.0, atol=1e-10), \
            f"Axis 1 should be (1, 0) in 2D, got {axis1_2d}"
        assert np.isclose(axis1_2d[1], 0.0, atol=1e-10), \
            f"Axis 1 should be (1, 0) in 2D, got {axis1_2d}"
        assert np.isclose(axis2_2d[0], 0.0, atol=1e-10), \
            f"Axis 2 should be (0, 1) in 2D, got {axis2_2d}"
        assert np.isclose(axis2_2d[1], 1.0, atol=1e-10), \
            f"Axis 2 should be (0, 1) in 2D, got {axis2_2d}"

        # Check that stored transformation parameters include the matrices
        assert "_B_target" in transformation.parameters, \
            "Transformation should store B_target matrix"
        assert "_B_target_inv" in transformation.parameters, \
            "Transformation should store B_target_inv matrix"
        assert "_center" in transformation.parameters, \
            "Transformation should store center vector"

    def test_custom_affine_transformation_type(self):
        """
        Test that CUSTOM_AFFINE transformation type works and automatically
        uses full N-D output (output_mode="full").
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

        # Get all points and group by class
        points = store.get_points(layer.id)
        points_by_class: dict[int, list[UUID]] = {0: [], 1: [], 2: []}

        for point in points:
            class_id = point.metadata.get("class")
            if class_id is not None:
                points_by_class[class_id].append(point.id)

        # Create barycenters
        versicolor_barycenter = store.create_barycenter(
            layer.id, points_by_class[1], name="versicolor_barycenter"
        )
        virginica_barycenter = store.create_barycenter(
            layer.id, points_by_class[2], name="virginica_barycenter"
        )
        setosa_barycenter = store.create_barycenter(
            layer.id, points_by_class[0], name="setosa_barycenter"
        )

        # Create custom axes
        axis1 = store.create_custom_axis(
            name="versicolor_to_virginica",
            layer_id=layer.id,
            point_a_id=versicolor_barycenter.id,
            point_b_id=virginica_barycenter.id,
        )
        axis2 = store.create_custom_axis(
            name="versicolor_to_setosa",
            layer_id=layer.id,
            point_a_id=versicolor_barycenter.id,
            point_b_id=setosa_barycenter.id,
        )

        # Create CUSTOM_AFFINE transformation (no output_mode needed - it's automatic)
        engine = TransformEngine(store)
        transformation = engine.create_transformation(
            name="custom_affine_test",
            type=TransformationType.CUSTOM_AFFINE,
            source_layer_id=layer.id,
            parameters={
                "axes": [
                    {"type": "direction", "vector": axis1.vector},
                    {"type": "direction", "vector": axis2.vector},
                ],
                "projection_mode": "affine",  # Use affine (change of basis) mode
            },
        )

        assert transformation is not None, "Failed to create CUSTOM_AFFINE transformation"

        # Verify output is 4D (same as input)
        target_layer = store.get_layer(transformation.target_layer_id)
        assert target_layer.dimensionality == 4, \
            f"CUSTOM_AFFINE should output 4D, got {target_layer.dimensionality}D"

        # Verify transformation parameters include the matrices
        assert "_B_target" in transformation.parameters
        assert "_B_target_inv" in transformation.parameters

    def test_custom_axes_propagation(self):
        """
        Test that custom axes are propagated to the target layer when a
        transformation is applied.
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

        # Get all points and group by class
        points = store.get_points(layer.id)
        points_by_class: dict[int, list[UUID]] = {0: [], 1: [], 2: []}

        for point in points:
            class_id = point.metadata.get("class")
            if class_id is not None:
                points_by_class[class_id].append(point.id)

        # Create barycenters
        versicolor_barycenter = store.create_barycenter(
            layer.id, points_by_class[1], name="versicolor_barycenter"
        )
        virginica_barycenter = store.create_barycenter(
            layer.id, points_by_class[2], name="virginica_barycenter"
        )
        setosa_barycenter = store.create_barycenter(
            layer.id, points_by_class[0], name="setosa_barycenter"
        )

        # Create custom axes on the source layer
        axis1 = store.create_custom_axis(
            name="versicolor_to_virginica",
            layer_id=layer.id,
            point_a_id=versicolor_barycenter.id,
            point_b_id=virginica_barycenter.id,
        )
        axis2 = store.create_custom_axis(
            name="versicolor_to_setosa",
            layer_id=layer.id,
            point_a_id=versicolor_barycenter.id,
            point_b_id=setosa_barycenter.id,
        )

        # Verify source layer has 2 custom axes
        source_axes = store.list_custom_axes(layer.id)
        assert len(source_axes) == 2, f"Source layer should have 2 axes, got {len(source_axes)}"

        # Apply a simple scaling transformation
        engine = TransformEngine(store)
        transformation = engine.create_transformation(
            name="scaling_test",
            type=TransformationType.SCALING,
            source_layer_id=layer.id,
            parameters={"scale_factors": [2.0, 2.0, 2.0, 2.0]},
        )

        assert transformation is not None, "Failed to create transformation"
        assert transformation.target_layer_id is not None

        # Verify target layer has 2 custom axes (propagated from source)
        target_axes = store.list_custom_axes(transformation.target_layer_id)
        assert len(target_axes) == 2, f"Target layer should have 2 axes, got {len(target_axes)}"

        # Verify axis names are preserved
        target_axis_names = {a.name for a in target_axes}
        assert "versicolor_to_virginica" in target_axis_names
        assert "versicolor_to_setosa" in target_axis_names

        # Verify axis vectors are recomputed using transformed coordinates
        # After scaling by 2x, the vectors should also be 2x longer
        for target_axis in target_axes:
            # Find corresponding source axis
            source_axis = next(a for a in source_axes if a.name == target_axis.name)

            # Target vector should be 2x the source vector (due to 2x scaling)
            source_vec = np.array(source_axis.vector)
            target_vec = np.array(target_axis.vector)

            expected_vec = source_vec * 2.0

            np.testing.assert_allclose(
                target_vec, expected_vec, rtol=1e-10,
                err_msg=f"Axis {target_axis.name} vector should be scaled by 2x"
            )

        print(f"\n=== Custom Axes Propagation Test ===")
        print(f"Source layer axes: {len(source_axes)}")
        print(f"Target layer axes: {len(target_axes)}")
        for target_axis in target_axes:
            source_axis = next(a for a in source_axes if a.name == target_axis.name)
            print(f"  {target_axis.name}:")
            print(f"    Source vector: {source_axis.vector}")
            print(f"    Target vector: {target_axis.vector}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
