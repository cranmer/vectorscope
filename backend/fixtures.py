"""
Test fixtures for VectorScope graph scenarios.

These fixtures define specific computational graph topologies for testing:
- Computational Graph: Layers connected by Transformations
- Viewports: Projections (views into layers, separate from computation)
"""

from backend.services import get_data_store, get_transform_engine, get_projection_engine
from backend.models import TransformationType, ProjectionType


def clear_all():
    """Clear all data from the store and engines."""
    store = get_data_store()
    store._layers.clear()
    store._points.clear()
    store._selections.clear()

    # Clear projection engine
    proj_engine = get_projection_engine()
    proj_engine._projections.clear()
    proj_engine._projection_results.clear()

    # Clear transform engine
    transform_engine = get_transform_engine()
    transform_engine._transformations.clear()


def scenario_linear_single_view():
    """
    Linear chain: layer1 → T1 → layer2 → T2 → layer3
    Single PCA view on each layer.

    Graph:
        [layer1] → (scale_2x) → [layer2] → (scale_0.5x) → [layer3]
           ↓                       ↓                          ↓
         (PCA)                   (PCA)                      (PCA)
    """
    clear_all()
    store = get_data_store()
    transform_engine = get_transform_engine()
    projection_engine = get_projection_engine()

    # Create source layer1
    layer1 = store.generate_synthetic_data(
        n_points=500,
        dimensionality=20,
        n_clusters=3,
        layer_name="layer1"
    )

    # Transform layer1 → layer2 (scale 2x)
    transform_1 = transform_engine.create_transformation(
        name="scale_2x",
        type=TransformationType.SCALING,
        source_layer_id=layer1.id,
        parameters={"scale_factors": [2.0]}
    )
    # Rename target layer
    layer2 = store.get_layer(transform_1.target_layer_id)
    layer2.name = "layer2"

    # Transform layer2 → layer3 (scale 0.5x)
    transform_2 = transform_engine.create_transformation(
        name="scale_0.5x",
        type=TransformationType.SCALING,
        source_layer_id=layer2.id,
        parameters={"scale_factors": [0.5]}
    )
    layer3 = store.get_layer(transform_2.target_layer_id)
    layer3.name = "layer3"

    # Add single PCA view to each layer
    projection_engine.create_projection("PCA", "pca", layer1.id, dimensions=2)
    projection_engine.create_projection("PCA", "pca", layer2.id, dimensions=2)
    projection_engine.create_projection("PCA", "pca", layer3.id, dimensions=2)

    return {
        "name": "linear_single_view",
        "description": "Linear chain layer1 → layer2 → layer3 with single PCA view per layer",
        "layers": [layer1.id, layer2.id, layer3.id],
        "transformations": [transform_1.id, transform_2.id],
    }


def scenario_linear_multi_view():
    """
    Linear chain: layer1 → T1 → layer2
    Multiple views (PCA + t-SNE) on each layer.

    Graph:
        [layer1] → (scale_1.5x) → [layer2]
         ↓    ↓                    ↓    ↓
       (PCA)(t-SNE)             (PCA)(t-SNE)
    """
    clear_all()
    store = get_data_store()
    transform_engine = get_transform_engine()
    projection_engine = get_projection_engine()

    # Create source layer1
    layer1 = store.generate_synthetic_data(
        n_points=500,
        dimensionality=20,
        n_clusters=4,
        layer_name="layer1"
    )

    # Transform layer1 → layer2
    transform_1 = transform_engine.create_transformation(
        name="scale_1.5x",
        type=TransformationType.SCALING,
        source_layer_id=layer1.id,
        parameters={"scale_factors": [1.5]}
    )
    layer2 = store.get_layer(transform_1.target_layer_id)
    layer2.name = "layer2"

    # Multiple views on layer1
    projection_engine.create_projection("PCA", "pca", layer1.id, dimensions=2)
    projection_engine.create_projection("t-SNE", "tsne", layer1.id, dimensions=2)

    # Multiple views on layer2
    projection_engine.create_projection("PCA", "pca", layer2.id, dimensions=2)
    projection_engine.create_projection("t-SNE", "tsne", layer2.id, dimensions=2)

    return {
        "name": "linear_multi_view",
        "description": "Linear chain layer1 → layer2 with PCA + t-SNE views on each layer",
        "layers": [layer1.id, layer2.id],
        "transformations": [transform_1.id],
    }


# Registry of all scenarios
SCENARIOS = {
    "linear_single_view": scenario_linear_single_view,
    "linear_multi_view": scenario_linear_multi_view,
}


def load_scenario(name: str) -> dict:
    """Load a named test scenario."""
    if name not in SCENARIOS:
        raise ValueError(f"Unknown scenario: {name}. Available: {list(SCENARIOS.keys())}")
    return SCENARIOS[name]()


def list_scenarios() -> list[dict]:
    """List all available scenarios."""
    return [
        {"name": name, "description": fn.__doc__.strip().split('\n')[0]}
        for name, fn in SCENARIOS.items()
    ]
