import pytest
import numpy as np
from uuid import uuid4

from backend.services.data_store import DataStore
from backend.models import PointData


class TestDataStore:
    def test_create_layer(self):
        store = DataStore()
        layer = store.create_layer(name="test", dimensionality=30)

        assert layer.name == "test"
        assert layer.dimensionality == 30
        assert layer.point_count == 0
        assert not layer.is_derived

    def test_add_point(self):
        store = DataStore()
        layer = store.create_layer(name="test", dimensionality=3)

        point_data = PointData(
            id=uuid4(),
            label="point_0",
            vector=[1.0, 2.0, 3.0],
        )
        point = store.add_point(layer.id, point_data)

        assert point is not None
        assert point.label == "point_0"
        assert point.vector == [1.0, 2.0, 3.0]
        assert store.get_layer(layer.id).point_count == 1

    def test_get_vectors_as_array(self):
        store = DataStore()
        layer = store.create_layer(name="test", dimensionality=3)

        points = [
            PointData(vector=[1.0, 0.0, 0.0]),
            PointData(vector=[0.0, 1.0, 0.0]),
            PointData(vector=[0.0, 0.0, 1.0]),
        ]
        store.add_points_bulk(layer.id, points)

        vectors, ids = store.get_vectors_as_array(layer.id)

        assert vectors.shape == (3, 3)
        assert len(ids) == 3

    def test_generate_synthetic_data(self):
        store = DataStore()
        layer = store.generate_synthetic_data(
            n_points=100, dimensionality=10, n_clusters=3
        )

        assert layer.point_count == 100
        assert layer.dimensionality == 10

        vectors, _ = store.get_vectors_as_array(layer.id)
        assert vectors.shape == (100, 10)


class TestProjectionEngine:
    def test_pca_projection(self):
        from backend.services.projection_engine import ProjectionEngine
        from backend.models import ProjectionType

        store = DataStore()
        layer = store.generate_synthetic_data(n_points=100, dimensionality=30)

        engine = ProjectionEngine(store)
        projection = engine.create_projection(
            name="test_pca",
            type=ProjectionType.PCA,
            layer_id=layer.id,
            dimensions=2,
        )

        assert projection is not None
        assert projection.dimensions == 2

        coords = engine.get_projection_coordinates(projection.id)
        assert len(coords) == 100
        assert len(coords[0].coordinates) == 2
