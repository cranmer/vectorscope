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
    Linear chain: A → T1 → B → T2 → C
    Single PCA view on each layer.

    Graph:
        [Layer A] → (scale_2x) → [Layer B] → (scale_0.5x) → [Layer C]
           ↓                        ↓                          ↓
         (PCA)                    (PCA)                      (PCA)
    """
    clear_all()
    store = get_data_store()
    transform_engine = get_transform_engine()
    projection_engine = get_projection_engine()

    # Create source layer A
    layer_a = store.generate_synthetic_data(
        n_points=500,
        dimensionality=20,
        n_clusters=3,
        layer_name="Layer_A"
    )

    # Transform A → B (scale 2x)
    transform_1 = transform_engine.create_transformation(
        name="scale_2x",
        type=TransformationType.SCALING,
        source_layer_id=layer_a.id,
        parameters={"scale_factors": [2.0]}
    )
    layer_b = store.get_layer(transform_1.target_layer_id)

    # Transform B → C (scale 0.5x)
    transform_2 = transform_engine.create_transformation(
        name="scale_0.5x",
        type=TransformationType.SCALING,
        source_layer_id=layer_b.id,
        parameters={"scale_factors": [0.5]}
    )
    layer_c = store.get_layer(transform_2.target_layer_id)

    # Add single PCA view to each layer
    projection_engine.create_projection("PCA_A", "pca", layer_a.id, dimensions=2)
    projection_engine.create_projection("PCA_B", "pca", layer_b.id, dimensions=2)
    projection_engine.create_projection("PCA_C", "pca", layer_c.id, dimensions=2)

    return {
        "name": "linear_single_view",
        "description": "Linear chain A → B → C with single PCA view per layer",
        "layers": [layer_a.id, layer_b.id, layer_c.id],
        "transformations": [transform_1.id, transform_2.id],
    }


def scenario_linear_multi_view():
    """
    Linear chain: A → T1 → B
    Multiple views (PCA + t-SNE) on each layer.

    Graph:
        [Layer A] → (scale_1.5x) → [Layer B]
         ↓    ↓                     ↓    ↓
       (PCA)(t-SNE)              (PCA)(t-SNE)
    """
    clear_all()
    store = get_data_store()
    transform_engine = get_transform_engine()
    projection_engine = get_projection_engine()

    # Create source layer A
    layer_a = store.generate_synthetic_data(
        n_points=500,
        dimensionality=20,
        n_clusters=4,
        layer_name="Layer_A"
    )

    # Transform A → B
    transform_1 = transform_engine.create_transformation(
        name="scale_1.5x",
        type=TransformationType.SCALING,
        source_layer_id=layer_a.id,
        parameters={"scale_factors": [1.5]}
    )
    layer_b = store.get_layer(transform_1.target_layer_id)

    # Multiple views on layer A
    projection_engine.create_projection("PCA_A", "pca", layer_a.id, dimensions=2)
    projection_engine.create_projection("tSNE_A", "tsne", layer_a.id, dimensions=2)

    # Multiple views on layer B
    projection_engine.create_projection("PCA_B", "pca", layer_b.id, dimensions=2)
    projection_engine.create_projection("tSNE_B", "tsne", layer_b.id, dimensions=2)

    return {
        "name": "linear_multi_view",
        "description": "Linear chain A → B with PCA + t-SNE views on each layer",
        "layers": [layer_a.id, layer_b.id],
        "transformations": [transform_1.id],
    }


def scenario_branching():
    """
    Branching: A splits into B and C via different transformations.

    Graph:
                    ┌→ (scale_2x) → [Layer B]
        [Layer A] ─┤
                    └→ (scale_0.5x) → [Layer C]
    """
    clear_all()
    store = get_data_store()
    transform_engine = get_transform_engine()
    projection_engine = get_projection_engine()

    # Create source layer A
    layer_a = store.generate_synthetic_data(
        n_points=500,
        dimensionality=20,
        n_clusters=3,
        layer_name="Layer_A"
    )

    # Branch 1: A → B (scale up)
    transform_1 = transform_engine.create_transformation(
        name="scale_2x",
        type=TransformationType.SCALING,
        source_layer_id=layer_a.id,
        parameters={"scale_factors": [2.0]}
    )
    layer_b = store.get_layer(transform_1.target_layer_id)

    # Branch 2: A → C (scale down)
    transform_2 = transform_engine.create_transformation(
        name="scale_0.5x",
        type=TransformationType.SCALING,
        source_layer_id=layer_a.id,
        parameters={"scale_factors": [0.5]}
    )
    layer_c = store.get_layer(transform_2.target_layer_id)

    # Add PCA views
    projection_engine.create_projection("PCA_A", "pca", layer_a.id, dimensions=2)
    projection_engine.create_projection("PCA_B", "pca", layer_b.id, dimensions=2)
    projection_engine.create_projection("PCA_C", "pca", layer_c.id, dimensions=2)

    return {
        "name": "branching",
        "description": "Layer A branches into B and C via different transformations",
        "layers": [layer_a.id, layer_b.id, layer_c.id],
        "transformations": [transform_1.id, transform_2.id],
    }


def scenario_diamond():
    """
    Diamond: A splits then merges back (conceptually - layers don't merge,
    but this tests a more complex DAG structure).

    Graph:
                    ┌→ (scale_2x) → [Layer B] → (scale_0.5x) → [Layer D]
        [Layer A] ─┤
                    └→ (scale_3x) → [Layer C] → (scale_0.33x) → [Layer E]
    """
    clear_all()
    store = get_data_store()
    transform_engine = get_transform_engine()
    projection_engine = get_projection_engine()

    # Create source layer A
    layer_a = store.generate_synthetic_data(
        n_points=500,
        dimensionality=20,
        n_clusters=3,
        layer_name="Layer_A"
    )

    # Branch 1: A → B → D
    t1 = transform_engine.create_transformation(
        name="scale_2x",
        type=TransformationType.SCALING,
        source_layer_id=layer_a.id,
        parameters={"scale_factors": [2.0]}
    )
    layer_b = store.get_layer(t1.target_layer_id)

    t2 = transform_engine.create_transformation(
        name="scale_0.5x",
        type=TransformationType.SCALING,
        source_layer_id=layer_b.id,
        parameters={"scale_factors": [0.5]}
    )
    layer_d = store.get_layer(t2.target_layer_id)

    # Branch 2: A → C → E
    t3 = transform_engine.create_transformation(
        name="scale_3x",
        type=TransformationType.SCALING,
        source_layer_id=layer_a.id,
        parameters={"scale_factors": [3.0]}
    )
    layer_c = store.get_layer(t3.target_layer_id)

    t4 = transform_engine.create_transformation(
        name="scale_0.33x",
        type=TransformationType.SCALING,
        source_layer_id=layer_c.id,
        parameters={"scale_factors": [0.33]}
    )
    layer_e = store.get_layer(t4.target_layer_id)

    # Add PCA views to key layers
    projection_engine.create_projection("PCA_A", "pca", layer_a.id, dimensions=2)
    projection_engine.create_projection("PCA_D", "pca", layer_d.id, dimensions=2)
    projection_engine.create_projection("PCA_E", "pca", layer_e.id, dimensions=2)

    return {
        "name": "diamond",
        "description": "Two parallel chains from A: A→B→D and A→C→E",
        "layers": [layer_a.id, layer_b.id, layer_c.id, layer_d.id, layer_e.id],
        "transformations": [t1.id, t2.id, t3.id, t4.id],
    }


# Registry of all scenarios
SCENARIOS = {
    "linear_single_view": scenario_linear_single_view,
    "linear_multi_view": scenario_linear_multi_view,
    "branching": scenario_branching,
    "diamond": scenario_diamond,
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
