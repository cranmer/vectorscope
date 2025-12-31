"""Router for test scenarios and persistence."""

import json
from pathlib import Path
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from backend.fixtures import list_scenarios, load_scenario, clear_all
from backend.services import get_data_store, get_projection_engine, get_transform_engine

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


@router.post("/{scenario_name}")
async def activate_scenario(scenario_name: str):
    """Load and activate a test scenario, clearing existing data."""
    try:
        result = load_scenario(scenario_name)
        return {
            "status": "loaded",
            "scenario": result,
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/data")
async def clear_data():
    """Clear all data from the store."""
    clear_all()
    return {"status": "cleared"}


@router.get("/saved")
async def list_saved():
    """List all saved scenario files."""
    saved = []
    for f in SCENARIOS_DIR.glob("*.json"):
        try:
            with open(f) as fp:
                data = json.load(fp)
                saved.append({
                    "filename": f.stem,
                    "name": data.get("name", f.stem),
                    "description": data.get("description", ""),
                })
        except Exception:
            pass
    return saved


@router.post("/save")
async def save_current(request: SaveRequest):
    """Save current state to a JSON file."""
    store = get_data_store()
    transform_engine = get_transform_engine()
    projection_engine = get_projection_engine()

    # Serialize current state
    state = {
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
            }
            for layer in store.list_layers()
        ],
        "points": {
            str(layer_id): [
                {
                    "id": str(p.id),
                    "vector": p.vector,
                    "metadata": p.metadata,
                }
                for p in points.values()
            ]
            for layer_id, points in store._points.items()
        },
        "transformations": [
            {
                "id": str(t.id),
                "name": t.name,
                "type": t.type,
                "source_layer_id": str(t.source_layer_id),
                "target_layer_id": str(t.target_layer_id) if t.target_layer_id else None,
                "parameters": t.parameters,
                "is_invertible": t.is_invertible,
            }
            for t in transform_engine.list_transformations()
        ],
        "projections": [
            {
                "id": str(p.id),
                "name": p.name,
                "type": p.type,
                "layer_id": str(p.layer_id),
                "dimensions": p.dimensions,
                "parameters": p.parameters,
                "random_seed": p.random_seed,
            }
            for p in projection_engine.list_projections()
        ],
    }

    # Save to file
    filename = request.name.lower().replace(" ", "_")
    filepath = SCENARIOS_DIR / f"{filename}.json"
    with open(filepath, "w") as f:
        json.dump(state, f, indent=2)

    return {"status": "saved", "filename": filename}


@router.post("/load/{filename}")
async def load_saved(filename: str):
    """Load a saved scenario from a JSON file."""
    from uuid import UUID
    from backend.models import Layer, Point, Transformation, Projection

    filepath = SCENARIOS_DIR / f"{filename}.json"
    if not filepath.exists():
        raise HTTPException(status_code=404, detail=f"Scenario file not found: {filename}")

    with open(filepath) as f:
        state = json.load(f)

    # Clear existing data
    clear_all()
    store = get_data_store()

    # Restore layers
    for layer_data in state["layers"]:
        layer = Layer(
            id=UUID(layer_data["id"]),
            name=layer_data["name"],
            description=layer_data.get("description"),
            dimensionality=layer_data["dimensionality"],
            point_count=0,  # Will be updated when points are added
            is_derived=layer_data["is_derived"],
            source_transformation_id=UUID(layer_data["source_transformation_id"]) if layer_data.get("source_transformation_id") else None,
        )
        store._layers[layer.id] = layer

    # Restore points
    for layer_id_str, points_data in state.get("points", {}).items():
        layer_id = UUID(layer_id_str)
        points = []
        for p_data in points_data:
            point = Point(
                id=UUID(p_data["id"]),
                layer_id=layer_id,
                vector=p_data["vector"],
                metadata=p_data.get("metadata", {}),
            )
            points.append(point)
        store._points[layer_id] = points
        # Update point count
        if layer_id in store._layers:
            store._layers[layer_id].point_count = len(points)

    # Restore transformations
    for t_data in state.get("transformations", []):
        transform = Transformation(
            id=UUID(t_data["id"]),
            name=t_data["name"],
            type=t_data["type"],
            source_layer_id=UUID(t_data["source_layer_id"]),
            target_layer_id=UUID(t_data["target_layer_id"]) if t_data.get("target_layer_id") else None,
            parameters=t_data["parameters"],
            is_invertible=t_data.get("is_invertible", True),
        )
        store._transformations[transform.id] = transform

    # Restore projections
    for p_data in state.get("projections", []):
        projection = Projection(
            id=UUID(p_data["id"]),
            name=p_data["name"],
            type=p_data["type"],
            layer_id=UUID(p_data["layer_id"]),
            dimensions=p_data["dimensions"],
            parameters=p_data.get("parameters", {}),
            random_seed=p_data.get("random_seed"),
        )
        store._projections[projection.id] = projection

    return {
        "status": "loaded",
        "name": state.get("name", filename),
        "layers": len(state["layers"]),
        "transformations": len(state.get("transformations", [])),
        "projections": len(state.get("projections", [])),
    }
