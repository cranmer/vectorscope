"""Router for test scenarios and persistence."""

import json
import numpy as np
from pathlib import Path
from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import Optional
import io

from backend.fixtures import list_scenarios, load_scenario, clear_all
from backend.services import get_data_store, get_projection_engine, get_transform_engine
from backend.status import get_status_tracker

router = APIRouter(prefix="/scenarios", tags=["scenarios"])

# Directory for saved scenarios
SCENARIOS_DIR = Path(__file__).parent.parent.parent / "scenarios"
SCENARIOS_DIR.mkdir(exist_ok=True)


class SaveRequest(BaseModel):
    name: str
    description: str = ""


@router.get("")
async def get_scenarios():
    """List all available test scenarios."""
    return list_scenarios()


@router.get("/status")
async def get_status():
    """Get current loading/computation status."""
    tracker = get_status_tracker()
    return tracker.get_status()


@router.delete("/data")
async def clear_data():
    """Clear all data from the store."""
    clear_all()
    return {"status": "cleared"}


@router.get("/saved")
async def list_saved():
    """List all saved scenario files."""
    saved = []
    for f in SCENARIOS_DIR.glob("*_config.json"):
        try:
            with open(f) as fp:
                data = json.load(fp)
                # Extract base filename (remove _config suffix)
                base_name = f.stem.replace("_config", "")
                saved.append({
                    "filename": base_name,
                    "name": data.get("name", base_name),
                    "description": data.get("description", ""),
                })
        except Exception:
            pass
    return saved


@router.post("/save")
async def save_current(request: SaveRequest):
    """Save current state to numpy + JSON files."""
    tracker = get_status_tracker()
    tracker.set_status("saving", "Saving scenario...")

    store = get_data_store()
    transform_engine = get_transform_engine()
    projection_engine = get_projection_engine()

    filename = request.name.lower().replace(" ", "_")

    # Prepare numpy data for all layers
    numpy_data = {}
    point_metadata = {}

    tracker.set_status("saving", "Saving layer data...")
    for layer_id, points in store._points.items():
        layer_id_str = str(layer_id)
        if points:
            # Extract vectors and point info
            point_list = list(points.values())
            vectors = np.array([p.vector for p in point_list])
            point_ids = [str(p.id) for p in point_list]
            labels = [p.label for p in point_list]

            numpy_data[f"layer_{layer_id_str}_vectors"] = vectors
            numpy_data[f"layer_{layer_id_str}_ids"] = np.array(point_ids)

            # Store metadata separately (can't go in numpy)
            point_metadata[layer_id_str] = [
                {"id": str(p.id), "label": p.label, "metadata": p.metadata, "is_virtual": p.is_virtual}
                for p in point_list
            ]

    # Save pre-computed projection coordinates
    tracker.set_status("saving", "Saving projection coordinates...")
    for proj_id, results in projection_engine._projection_results.items():
        proj_id_str = str(proj_id)
        if results:
            coords = np.array([r.coordinates for r in results])
            numpy_data[f"projection_{proj_id_str}_coords"] = coords

    # Save numpy data
    npz_path = SCENARIOS_DIR / f"{filename}_data.npz"
    np.savez_compressed(npz_path, **numpy_data)

    # Serialize config (no vectors, just structure)
    config = {
        "name": request.name,
        "description": request.description,
        "layers": [
            {
                "id": str(layer.id),
                "name": layer.name,
                "description": layer.description,
                "dimensionality": layer.dimensionality,
                "is_derived": layer.is_derived,
                "source_transformation_id": str(layer.source_transformation_id) if layer.source_transformation_id else None,
                # Column configuration for tabular data
                "column_names": layer.column_names,
                "feature_columns": layer.feature_columns,
                "label_column": layer.label_column,
            }
            for layer in store.list_layers()
        ],
        "point_metadata": point_metadata,
        "transformations": [
            {
                "id": str(t.id),
                "name": t.name,
                "type": t.type.value,
                "source_layer_id": str(t.source_layer_id),
                "target_layer_id": str(t.target_layer_id) if t.target_layer_id else None,
                # Filter out internal parameters (starting with _) to avoid UUID serialization issues
                "parameters": {k: v for k, v in t.parameters.items() if not k.startswith("_")},
                "is_invertible": t.is_invertible,
            }
            for t in transform_engine.list_transformations()
        ],
        "projections": [
            {
                "id": str(p.id),
                "name": p.name,
                "type": p.type.value,
                "layer_id": str(p.layer_id),
                "dimensions": p.dimensions,
                # Filter out internal parameters (starting with _) to avoid UUID serialization issues
                "parameters": {k: v for k, v in p.parameters.items() if not k.startswith("_")},
                "random_seed": p.random_seed,
            }
            for p in projection_engine.list_projections()
        ],
        "selections": [
            {
                "id": str(s.id),
                "name": s.name,
                "layer_id": str(s.layer_id),
                "point_ids": [str(pid) for pid in s.point_ids],
                "point_count": s.point_count,
            }
            for s in store.list_selections()
        ],
        "custom_axes": [
            {
                "id": str(a.id),
                "name": a.name,
                "layer_id": str(a.layer_id),
                "point_a_id": str(a.point_a_id),
                "point_b_id": str(a.point_b_id),
                "vector": a.vector,
            }
            for a in store.list_custom_axes()
        ],
    }

    # Save config JSON
    config_path = SCENARIOS_DIR / f"{filename}_config.json"
    with open(config_path, "w") as f:
        json.dump(config, f, indent=2)

    tracker.set_status("idle", None)
    return {"status": "saved", "filename": filename}


@router.post("/load/{filename}")
async def load_saved(filename: str):
    """Load a saved scenario from numpy + JSON files."""
    from uuid import UUID
    from backend.models import Layer, Point, Transformation, Projection, TransformationType, ProjectionType, ProjectedPoint

    tracker = get_status_tracker()

    config_path = SCENARIOS_DIR / f"{filename}_config.json"
    npz_path = SCENARIOS_DIR / f"{filename}_data.npz"

    if not config_path.exists():
        raise HTTPException(status_code=404, detail=f"Scenario config not found: {filename}")

    tracker.set_status("loading", "Loading configuration...")

    with open(config_path) as f:
        config = json.load(f)

    # Load numpy data
    tracker.set_status("loading", "Loading vector data...")
    numpy_data = {}
    if npz_path.exists():
        numpy_data = dict(np.load(npz_path, allow_pickle=True))

    # Clear existing data
    clear_all()
    store = get_data_store()
    transform_engine = get_transform_engine()
    projection_engine = get_projection_engine()

    # Restore layers
    tracker.set_status("loading", "Restoring layers...")
    for layer_data in config["layers"]:
        layer = Layer(
            id=UUID(layer_data["id"]),
            name=layer_data["name"],
            description=layer_data.get("description"),
            dimensionality=layer_data["dimensionality"],
            point_count=0,
            is_derived=layer_data["is_derived"],
            source_transformation_id=UUID(layer_data["source_transformation_id"]) if layer_data.get("source_transformation_id") else None,
            # Column configuration
            column_names=layer_data.get("column_names"),
            feature_columns=layer_data.get("feature_columns"),
            label_column=layer_data.get("label_column"),
        )
        store._layers[layer.id] = layer
        store._points[layer.id] = {}

    # Restore points from numpy data
    point_metadata = config.get("point_metadata", {})
    for layer_id_str, meta_list in point_metadata.items():
        layer_id = UUID(layer_id_str)
        tracker.set_status("loading", f"Restoring points for layer...")

        vectors_key = f"layer_{layer_id_str}_vectors"
        if vectors_key in numpy_data:
            vectors = numpy_data[vectors_key]
            for i, meta in enumerate(meta_list):
                point = Point(
                    id=UUID(meta["id"]),
                    vector=vectors[i].tolist(),
                    metadata=meta.get("metadata", {}),
                    label=meta.get("label"),
                    is_virtual=meta.get("is_virtual", False),
                )
                store._points[layer_id][point.id] = point

            if layer_id in store._layers:
                store._layers[layer_id].point_count = len(store._points[layer_id])

    # Restore transformations
    tracker.set_status("loading", "Restoring transformations...")
    for t_data in config.get("transformations", []):
        transform = Transformation(
            id=UUID(t_data["id"]),
            name=t_data["name"],
            type=TransformationType(t_data["type"]),
            source_layer_id=UUID(t_data["source_layer_id"]),
            target_layer_id=UUID(t_data["target_layer_id"]) if t_data.get("target_layer_id") else None,
            parameters=t_data["parameters"],
            is_invertible=t_data.get("is_invertible", True),
        )
        transform_engine._transformations[transform.id] = transform

    # Restore projections with pre-computed coordinates
    tracker.set_status("loading", "Restoring projections...")
    for p_data in config.get("projections", []):
        projection = Projection(
            id=UUID(p_data["id"]),
            name=p_data["name"],
            type=ProjectionType(p_data["type"]),
            layer_id=UUID(p_data["layer_id"]),
            dimensions=p_data["dimensions"],
            parameters=p_data.get("parameters", {}),
            random_seed=p_data.get("random_seed"),
        )
        projection_engine._projections[projection.id] = projection

        # Try to load pre-computed coordinates
        coords_key = f"projection_{p_data['id']}_coords"
        if coords_key in numpy_data:
            tracker.set_status("loading", f"Loading projection: {projection.name}")
            coords = numpy_data[coords_key]
            # Get point metadata to reconstruct ProjectedPoints
            layer_id_str = p_data["layer_id"]
            meta_list = point_metadata.get(layer_id_str, [])

            results = []
            for i, meta in enumerate(meta_list):
                if i < len(coords):
                    results.append(ProjectedPoint(
                        id=UUID(meta["id"]),
                        label=meta.get("label"),
                        metadata=meta.get("metadata", {}),
                        coordinates=coords[i].tolist(),
                        is_virtual=meta.get("is_virtual", False),
                    ))
            projection_engine._projection_results[projection.id] = results
        else:
            # Recompute if not saved
            tracker.set_status("computing", f"Computing projection: {projection.name}")
            results = projection_engine._compute_projection(projection)
            if results:
                projection_engine._projection_results[projection.id] = results

    # Restore selections
    tracker.set_status("loading", "Restoring selections...")
    from backend.models import Selection
    for s_data in config.get("selections", []):
        selection = Selection(
            id=UUID(s_data["id"]),
            name=s_data["name"],
            layer_id=UUID(s_data["layer_id"]),
            point_ids=[UUID(pid) for pid in s_data["point_ids"]],
            point_count=s_data.get("point_count", len(s_data["point_ids"])),
        )
        store._selections[selection.id] = selection

    # Restore custom axes
    tracker.set_status("loading", "Restoring custom axes...")
    from backend.models import CustomAxis
    for a_data in config.get("custom_axes", []):
        custom_axis = CustomAxis(
            id=UUID(a_data["id"]),
            name=a_data["name"],
            layer_id=UUID(a_data["layer_id"]),
            point_a_id=UUID(a_data["point_a_id"]),
            point_b_id=UUID(a_data["point_b_id"]),
            vector=a_data["vector"],
        )
        store._custom_axes[custom_axis.id] = custom_axis

    tracker.set_status("idle", None)
    return {
        "status": "loaded",
        "name": config.get("name", filename),
        "layers": len(config["layers"]),
        "transformations": len(config.get("transformations", [])),
        "projections": len(config.get("projections", [])),
        "selections": len(config.get("selections", [])),
        "custom_axes": len(config.get("custom_axes", [])),
    }


@router.post("/upload")
async def upload_scenario(
    config: UploadFile = File(...),
    data: Optional[UploadFile] = File(None),
):
    """Upload and load scenario files directly."""
    from uuid import UUID
    from backend.models import Layer, Point, Transformation, Projection, TransformationType, ProjectionType, ProjectedPoint

    tracker = get_status_tracker()
    tracker.set_status("loading", "Processing uploaded files...")

    try:
        # Read config JSON
        config_content = await config.read()
        config_data = json.loads(config_content.decode('utf-8'))

        # Read numpy data if provided, or try to find it based on config filename
        numpy_data = {}
        if data:
            data_content = await data.read()
            numpy_data = dict(np.load(io.BytesIO(data_content), allow_pickle=True))
        else:
            # Try to find corresponding NPZ file in scenarios directory
            # Config filename is like "test_pca_config.json", data file is "test_pca_data.npz"
            config_filename = config.filename or ""
            base_name = config_filename.replace("_config.json", "").replace(".json", "")
            if base_name:
                npz_path = SCENARIOS_DIR / f"{base_name}_data.npz"
                if npz_path.exists():
                    tracker.set_status("loading", f"Loading data from {npz_path.name}...")
                    numpy_data = dict(np.load(npz_path, allow_pickle=True))

        # Clear existing data
        clear_all()
        store = get_data_store()
        transform_engine = get_transform_engine()
        projection_engine = get_projection_engine()

        # Restore layers
        tracker.set_status("loading", "Restoring layers...")
        for layer_data in config_data["layers"]:
            layer = Layer(
                id=UUID(layer_data["id"]),
                name=layer_data["name"],
                description=layer_data.get("description"),
                dimensionality=layer_data["dimensionality"],
                point_count=0,
                is_derived=layer_data["is_derived"],
                source_transformation_id=UUID(layer_data["source_transformation_id"]) if layer_data.get("source_transformation_id") else None,
                # Column configuration
                column_names=layer_data.get("column_names"),
                feature_columns=layer_data.get("feature_columns"),
                label_column=layer_data.get("label_column"),
            )
            store._layers[layer.id] = layer
            store._points[layer.id] = {}

        # Restore points from numpy data
        point_metadata = config_data.get("point_metadata", {})
        for layer_id_str, meta_list in point_metadata.items():
            layer_id = UUID(layer_id_str)
            tracker.set_status("loading", f"Restoring points for layer...")

            vectors_key = f"layer_{layer_id_str}_vectors"
            if vectors_key in numpy_data:
                vectors = numpy_data[vectors_key]
                for i, meta in enumerate(meta_list):
                    point = Point(
                        id=UUID(meta["id"]),
                        vector=vectors[i].tolist(),
                        metadata=meta.get("metadata", {}),
                        label=meta.get("label"),
                        is_virtual=meta.get("is_virtual", False),
                    )
                    store._points[layer_id][point.id] = point

                if layer_id in store._layers:
                    store._layers[layer_id].point_count = len(store._points[layer_id])

        # Restore transformations
        tracker.set_status("loading", "Restoring transformations...")
        for t_data in config_data.get("transformations", []):
            transform = Transformation(
                id=UUID(t_data["id"]),
                name=t_data["name"],
                type=TransformationType(t_data["type"]),
                source_layer_id=UUID(t_data["source_layer_id"]),
                target_layer_id=UUID(t_data["target_layer_id"]) if t_data.get("target_layer_id") else None,
                parameters=t_data["parameters"],
                is_invertible=t_data.get("is_invertible", True),
            )
            transform_engine._transformations[transform.id] = transform

        # Restore projections with pre-computed coordinates
        tracker.set_status("loading", "Restoring projections...")
        for p_data in config_data.get("projections", []):
            projection = Projection(
                id=UUID(p_data["id"]),
                name=p_data["name"],
                type=ProjectionType(p_data["type"]),
                layer_id=UUID(p_data["layer_id"]),
                dimensions=p_data["dimensions"],
                parameters=p_data.get("parameters", {}),
                random_seed=p_data.get("random_seed"),
            )
            projection_engine._projections[projection.id] = projection

            # Try to load pre-computed coordinates
            coords_key = f"projection_{p_data['id']}_coords"
            if coords_key in numpy_data:
                tracker.set_status("loading", f"Loading projection: {projection.name}")
                coords = numpy_data[coords_key]
                layer_id_str = p_data["layer_id"]
                meta_list = point_metadata.get(layer_id_str, [])

                results = []
                for i, meta in enumerate(meta_list):
                    if i < len(coords):
                        results.append(ProjectedPoint(
                            id=UUID(meta["id"]),
                            label=meta.get("label"),
                            metadata=meta.get("metadata", {}),
                            coordinates=coords[i].tolist(),
                            is_virtual=meta.get("is_virtual", False),
                        ))
                projection_engine._projection_results[projection.id] = results
            else:
                # Recompute if not saved
                tracker.set_status("computing", f"Computing projection: {projection.name}")
                results = projection_engine._compute_projection(projection)
                if results:
                    projection_engine._projection_results[projection.id] = results

        # Restore selections
        tracker.set_status("loading", "Restoring selections...")
        from backend.models import Selection
        for s_data in config_data.get("selections", []):
            selection = Selection(
                id=UUID(s_data["id"]),
                name=s_data["name"],
                layer_id=UUID(s_data["layer_id"]),
                point_ids=[UUID(pid) for pid in s_data["point_ids"]],
                point_count=s_data.get("point_count", len(s_data["point_ids"])),
            )
            store._selections[selection.id] = selection

        # Restore custom axes
        tracker.set_status("loading", "Restoring custom axes...")
        from backend.models import CustomAxis
        for a_data in config_data.get("custom_axes", []):
            custom_axis = CustomAxis(
                id=UUID(a_data["id"]),
                name=a_data["name"],
                layer_id=UUID(a_data["layer_id"]),
                point_a_id=UUID(a_data["point_a_id"]),
                point_b_id=UUID(a_data["point_b_id"]),
                vector=a_data["vector"],
            )
            store._custom_axes[custom_axis.id] = custom_axis

        tracker.set_status("idle", None)
        return {
            "status": "loaded",
            "name": config_data.get("name", "uploaded"),
            "layers": len(config_data["layers"]),
            "transformations": len(config_data.get("transformations", [])),
            "projections": len(config_data.get("projections", [])),
            "selections": len(config_data.get("selections", [])),
            "custom_axes": len(config_data.get("custom_axes", [])),
        }

    except Exception as e:
        tracker.set_status("error", str(e))
        raise HTTPException(status_code=400, detail=str(e))


# This route must be last because it's a catch-all for scenario names
@router.post("/{scenario_name}")
async def activate_scenario(scenario_name: str):
    """Load and activate a test scenario, clearing existing data."""
    tracker = get_status_tracker()
    try:
        tracker.set_status("loading", f"Loading scenario: {scenario_name}")
        result = load_scenario(scenario_name)
        tracker.set_status("idle", None)
        return {
            "status": "loaded",
            "scenario": result,
        }
    except ValueError as e:
        tracker.set_status("error", str(e))
        raise HTTPException(status_code=404, detail=str(e))
