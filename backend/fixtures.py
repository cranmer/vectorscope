"""
Test fixtures for VectorScope graph scenarios.

These fixtures define specific computational graph topologies for testing:
- Computational Graph: Layers connected by Transformations
- Viewports: Projections (views into layers, separate from computation)
"""

from backend.services import get_data_store, get_transform_engine, get_projection_engine
from backend.models import TransformationType, ProjectionType
from backend.status import get_status_tracker


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
        name="T1",
        type=TransformationType.SCALING,
        source_layer_id=layer1.id,
        parameters={"scale_factors": [2.0]}
    )
    # Rename target layer
    layer2 = store.get_layer(transform_1.target_layer_id)
    layer2.name = "layer2"

    # Transform layer2 → layer3 (scale 0.5x)
    transform_2 = transform_engine.create_transformation(
        name="T2",
        type=TransformationType.SCALING,
        source_layer_id=layer2.id,
        parameters={"scale_factors": [0.5]}
    )
    layer3 = store.get_layer(transform_2.target_layer_id)
    layer3.name = "layer3"

    # Add single PCA view to each layer
    projection_engine.create_projection("PCA", ProjectionType.PCA, layer1.id, dimensions=2)
    projection_engine.create_projection("PCA", ProjectionType.PCA, layer2.id, dimensions=2)
    projection_engine.create_projection("PCA", ProjectionType.PCA, layer3.id, dimensions=2)

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
        name="T1",
        type=TransformationType.SCALING,
        source_layer_id=layer1.id,
        parameters={"scale_factors": [1.5]}
    )
    layer2 = store.get_layer(transform_1.target_layer_id)
    layer2.name = "layer2"

    # Multiple views on layer1
    projection_engine.create_projection("PCA", ProjectionType.PCA, layer1.id, dimensions=2)
    projection_engine.create_projection("t-SNE", ProjectionType.TSNE, layer1.id, dimensions=2)

    # Multiple views on layer2
    projection_engine.create_projection("PCA", ProjectionType.PCA, layer2.id, dimensions=2)
    projection_engine.create_projection("t-SNE", ProjectionType.TSNE, layer2.id, dimensions=2)

    return {
        "name": "linear_multi_view",
        "description": "Linear chain layer1 → layer2 with PCA + t-SNE views on each layer",
        "layers": [layer1.id, layer2.id],
        "transformations": [transform_1.id],
    }


def scenario_deep_chain():
    """
    Deep chain: 10 layers with 9 transformations.
    Variable numbers of views (1-10) per layer to test layout.

    Graph:
        [layer1] → (T1) → [layer2] → (T2) → ... → [layer10]
           ↓                ↓↓               ...      ↓↓↓↓↓↓↓↓↓↓
         views            views                      views
    """
    tracker = get_status_tracker()
    clear_all()
    store = get_data_store()
    transform_engine = get_transform_engine()
    projection_engine = get_projection_engine()

    # Create source layer1
    tracker.set_status("loading", "Creating synthetic data for layer1...")
    current_layer = store.generate_synthetic_data(
        n_points=200,
        dimensionality=20,
        n_clusters=3,
        layer_name="layer1"
    )

    layer_ids = [current_layer.id]
    transform_ids = []

    # Create 9 more layers with transformations
    for i in range(2, 11):
        tracker.set_status("loading", f"Creating layer{i}...")
        # Alternate between scaling and rotation
        if i % 2 == 0:
            transform = transform_engine.create_transformation(
                name=f"T{i-1}",
                type=TransformationType.SCALING,
                source_layer_id=current_layer.id,
                parameters={"scale_factors": [1.0 + (i * 0.1)]}
            )
        else:
            transform = transform_engine.create_transformation(
                name=f"T{i-1}",
                type=TransformationType.ROTATION,
                source_layer_id=current_layer.id,
                parameters={"angle": (i * 0.3), "dims": [0, 1]}
            )

        transform_ids.append(transform.id)

        # Get and rename target layer
        current_layer = store.get_layer(transform.target_layer_id)
        current_layer.name = f"layer{i}"
        layer_ids.append(current_layer.id)

    # Add variable number of views to each layer (layer i gets i views, max 10)
    total_views = sum(min(i, 10) for i in range(1, 11))
    view_count = 0
    for i, layer_id in enumerate(layer_ids, start=1):
        num_views = min(i, 10)
        for v in range(num_views):
            view_count += 1
            view_type = ProjectionType.PCA if v % 2 == 0 else ProjectionType.TSNE
            tracker.set_status("loading", f"Creating view {view_count}/{total_views}: {view_type.value.upper()} for layer{i}")
            projection_engine.create_projection(
                name=f"view_{v+1}",
                type=view_type,
                layer_id=layer_id,
                dimensions=2
            )

    return {
        "name": "deep_chain",
        "description": "Deep chain with 10 layers and variable views per layer",
        "layers": layer_ids,
        "transformations": transform_ids,
    }


# Registry of all scenarios
SCENARIOS = {
    "linear_single_view": scenario_linear_single_view,
    "linear_multi_view": scenario_linear_multi_view,
    "deep_chain": scenario_deep_chain,
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
