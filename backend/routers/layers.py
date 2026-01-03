from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from uuid import UUID
from typing import Literal
import numpy as np
import io

from backend.models import Layer, LayerCreate, LayerUpdate, Point, PointData
from backend.services import get_data_store

router = APIRouter(prefix="/layers", tags=["layers"])


@router.get("", response_model=list[Layer])
async def list_layers():
    """List all layers."""
    store = get_data_store()
    return store.list_layers()


@router.post("", response_model=Layer)
async def create_layer(layer_create: LayerCreate):
    """Create a new layer."""
    store = get_data_store()
    return store.create_layer(
        name=layer_create.name,
        dimensionality=layer_create.dimensionality,
        description=layer_create.description,
        source_transformation_id=layer_create.source_transformation_id,
    )


@router.get("/{layer_id}", response_model=Layer)
async def get_layer(layer_id: UUID):
    """Get a layer by ID."""
    store = get_data_store()
    layer = store.get_layer(layer_id)
    if layer is None:
        raise HTTPException(status_code=404, detail="Layer not found")
    return layer


@router.get("/{layer_id}/points", response_model=list[Point])
async def get_layer_points(layer_id: UUID):
    """Get all points in a layer."""
    store = get_data_store()
    layer = store.get_layer(layer_id)
    if layer is None:
        raise HTTPException(status_code=404, detail="Layer not found")
    return store.get_points(layer_id)


@router.post("/synthetic", response_model=Layer)
async def create_synthetic_layer(
    n_points: int = 1000,
    dimensionality: int = 30,
    n_clusters: int = 5,
    name: str = "synthetic",
):
    """Generate a synthetic dataset for testing."""
    store = get_data_store()
    return store.generate_synthetic_data(
        n_points=n_points,
        dimensionality=dimensionality,
        n_clusters=n_clusters,
        layer_name=name,
    )


# Supported sklearn datasets with their info
SKLEARN_DATASETS = {
    "iris": {"loader": "load_iris", "name": "Iris", "description": "150 samples, 4 features - flower classification"},
    "wine": {"loader": "load_wine", "name": "Wine", "description": "178 samples, 13 features - wine cultivar classification"},
    "breast_cancer": {"loader": "load_breast_cancer", "name": "Breast Cancer", "description": "569 samples, 30 features - cancer diagnosis"},
    "digits": {"loader": "load_digits", "name": "Digits", "description": "1797 samples, 64 features - handwritten digits"},
    "diabetes": {"loader": "load_diabetes", "name": "Diabetes", "description": "442 samples, 10 features - disease progression"},
    "linnerud": {"loader": "load_linnerud", "name": "Linnerud", "description": "20 samples, 3 features - physiological/exercise data"},
}


@router.get("/sklearn-datasets")
async def list_sklearn_datasets():
    """List available sklearn datasets."""
    return [
        {"id": key, "name": info["name"], "description": info["description"]}
        for key, info in SKLEARN_DATASETS.items()
    ]


@router.post("/sklearn/{dataset_name}", response_model=Layer)
async def load_sklearn_dataset(
    dataset_name: Literal["iris", "wine", "breast_cancer", "digits", "diabetes", "linnerud"],
):
    """Load a standard sklearn dataset."""
    from sklearn import datasets

    if dataset_name not in SKLEARN_DATASETS:
        raise HTTPException(status_code=404, detail=f"Unknown dataset: {dataset_name}")

    info = SKLEARN_DATASETS[dataset_name]
    loader_name = info["loader"]
    loader = getattr(datasets, loader_name)

    # Load the dataset
    data = loader()
    vectors = data.data

    # Handle target labels and classes
    targets = []
    labels = []
    if hasattr(data, "target"):
        target = data.target
        targets = [int(t) for t in target]
        if hasattr(data, "target_names"):
            target_names = data.target_names
            labels = [str(target_names[t]) for t in target]
        else:
            labels = [f"class_{t}" for t in target]
    else:
        labels = [f"point_{i}" for i in range(len(vectors))]
        targets = [0] * len(vectors)

    # Create layer
    store = get_data_store()
    n_points, dimensionality = vectors.shape

    layer = store.create_layer(
        name=info["name"],
        dimensionality=dimensionality,
        description=info["description"],
    )

    # Set feature names for column configuration
    if hasattr(data, "feature_names"):
        feature_names = [str(name) for name in data.feature_names]
        # Add target column to column_names if we have targets
        if hasattr(data, "target"):
            layer.column_names = feature_names + ["class"]
            layer.feature_columns = feature_names
            layer.label_column = "class"
        else:
            layer.column_names = feature_names
            layer.feature_columns = feature_names
            layer.label_column = None
    else:
        # Fallback for datasets without feature names (like linnerud)
        feature_names = [f"feature_{i}" for i in range(dimensionality)]
        if hasattr(data, "target"):
            layer.column_names = feature_names + ["class"]
            layer.feature_columns = feature_names
            layer.label_column = "class"
        else:
            layer.column_names = feature_names
            layer.feature_columns = feature_names
            layer.label_column = None

    # Add points with labels and class metadata
    for i, (vector, label, target_class) in enumerate(zip(vectors, labels, targets)):
        point_data = PointData(
            vector=vector.tolist(),
            label=label,
            metadata={"index": i, "class": target_class},
        )
        store.add_point(layer.id, point_data)

    layer.point_count = n_points
    return layer


@router.post("/upload", response_model=Layer)
async def upload_layer(
    file: UploadFile = File(...),
    name: str = Form("uploaded"),
):
    """Upload a numpy file (.npy or .npz) to create a new layer.

    Accepts:
    - .npy file: 2D array of shape (n_points, dimensionality)
    - .npz file: Must contain 'vectors' or 'data' or 'embeddings' key
    - .csv file: Comma-separated values with optional header row
    """
    import csv
    from uuid import uuid4

    store = get_data_store()
    content = await file.read()
    filename = file.filename or "data"

    try:
        if filename.endswith('.npy'):
            vectors = np.load(io.BytesIO(content))
            n_points, dimensionality = vectors.shape if vectors.ndim == 2 else (1, vectors.shape[0])
            vectors = vectors.reshape(-1, dimensionality)

            layer = store.create_layer(
                name=name,
                dimensionality=dimensionality,
                description=f"Uploaded from {filename}",
            )

            # Set default column configuration (all dimensions as features, no label)
            feature_names = [f"dim_{i}" for i in range(dimensionality)]
            layer.column_names = feature_names
            layer.feature_columns = feature_names
            layer.label_column = None

            # Store raw data for reconfiguration
            row_ids = [uuid4() for _ in range(n_points)]
            store._raw_data[layer.id] = {
                "columns": feature_names,
                "data": [row.tolist() for row in vectors],
                "row_ids": row_ids,
            }

            for i, (vector, point_id) in enumerate(zip(vectors, row_ids)):
                point_data = PointData(id=point_id, vector=vector.tolist(), label=f"point_{i}")
                store.add_point(layer.id, point_data)

            layer.point_count = n_points
            return layer

        elif filename.endswith('.npz'):
            npz_data = np.load(io.BytesIO(content))
            for key in ['vectors', 'data', 'embeddings', 'X', 'x']:
                if key in npz_data:
                    vectors = npz_data[key]
                    break
            else:
                keys = list(npz_data.keys())
                if keys:
                    vectors = npz_data[keys[0]]
                else:
                    raise ValueError("No arrays found in npz file")

            if vectors.ndim == 1:
                vectors = vectors.reshape(1, -1)
            n_points, dimensionality = vectors.shape

            layer = store.create_layer(
                name=name,
                dimensionality=dimensionality,
                description=f"Uploaded from {filename}",
            )

            # Set default column configuration (all dimensions as features, no label)
            feature_names = [f"dim_{i}" for i in range(dimensionality)]
            layer.column_names = feature_names
            layer.feature_columns = feature_names
            layer.label_column = None

            # Store raw data for reconfiguration
            row_ids = [uuid4() for _ in range(n_points)]
            store._raw_data[layer.id] = {
                "columns": feature_names,
                "data": [row.tolist() for row in vectors],
                "row_ids": row_ids,
            }

            for i, (vector, point_id) in enumerate(zip(vectors, row_ids)):
                point_data = PointData(id=point_id, vector=vector.tolist(), label=f"point_{i}")
                store.add_point(layer.id, point_data)

            layer.point_count = n_points
            return layer

        elif filename.endswith('.csv'):
            # Parse CSV with headers
            text = content.decode('utf-8')
            reader = csv.reader(io.StringIO(text))
            rows = list(reader)

            if len(rows) < 2:
                raise ValueError("CSV must have header row and at least one data row")

            header = rows[0]
            data_rows = rows[1:]

            # Detect numeric columns (try parsing first data row)
            numeric_columns = []
            string_columns = []
            for i, (col_name, val) in enumerate(zip(header, data_rows[0])):
                try:
                    float(val)
                    numeric_columns.append(col_name)
                except ValueError:
                    string_columns.append(col_name)

            # Default: use all numeric columns as features, first string column as label
            feature_columns = numeric_columns
            label_column = string_columns[0] if string_columns else None

            if not feature_columns:
                raise ValueError("No numeric columns found in CSV")

            # Parse all data
            raw_data = []
            for row in data_rows:
                raw_data.append(row)

            # Create layer with column metadata
            dimensionality = len(feature_columns)
            layer = store.create_layer(
                name=name,
                dimensionality=dimensionality,
                description=f"Uploaded from {filename}",
            )
            layer.column_names = header
            layer.feature_columns = feature_columns
            layer.label_column = label_column

            # Generate point IDs and store raw data
            row_ids = [uuid4() for _ in range(len(raw_data))]
            store._raw_data[layer.id] = {
                "columns": header,
                "data": raw_data,
                "row_ids": row_ids,
            }

            # Extract vectors and labels
            feature_indices = [header.index(c) for c in feature_columns]
            label_index = header.index(label_column) if label_column else None

            for i, (row, point_id) in enumerate(zip(raw_data, row_ids)):
                vector = [float(row[j]) for j in feature_indices]
                label = str(row[label_index]) if label_index is not None else f"point_{i}"

                # Try to get class from label column for coloring
                class_val = None
                if label_index is not None:
                    try:
                        class_val = int(row[label_index])
                    except ValueError:
                        pass  # Non-numeric label

                point_data = PointData(
                    id=point_id,
                    vector=vector,
                    label=label,
                    metadata={"index": i, "class": class_val} if class_val is not None else {"index": i},
                )
                store.add_point(layer.id, point_data)

            layer.point_count = len(raw_data)
            return layer

        else:
            raise ValueError(f"Unsupported file type: {filename}")

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.patch("/{layer_id}", response_model=Layer)
async def update_layer(layer_id: UUID, update: LayerUpdate):
    """Update a layer's name, description, or column configuration."""
    store = get_data_store()
    # Check if label_column was explicitly provided (even if null)
    label_column_provided = "label_column" in update.model_fields_set
    layer = store.update_layer(
        layer_id,
        name=update.name,
        description=update.description,
        feature_columns=update.feature_columns,
        label_column=update.label_column,
        label_column_provided=label_column_provided,
    )
    if layer is None:
        raise HTTPException(status_code=404, detail="Layer not found")
    return layer


from pydantic import BaseModel
from typing import Optional as Opt


class BarycenterCreate(BaseModel):
    """Request model for creating a barycenter from selected points."""
    point_ids: list[str]
    name: Opt[str] = None


@router.delete("/{layer_id}/points/{point_id}")
async def delete_point(layer_id: UUID, point_id: UUID):
    """Delete a point from a layer (typically used for virtual points)."""
    store = get_data_store()
    layer = store.get_layer(layer_id)
    if layer is None:
        raise HTTPException(status_code=404, detail="Layer not found")

    success = store.delete_point(layer_id, point_id)
    if not success:
        raise HTTPException(status_code=404, detail="Point not found")

    # Invalidate cached projections for this layer
    from backend.services import get_projection_engine
    engine = get_projection_engine()
    for proj in engine.list_projections():
        if proj.layer_id == layer_id:
            engine.invalidate_cache(proj.id)

    return {"status": "deleted"}


@router.post("/{layer_id}/barycenter", response_model=Point)
async def create_barycenter(layer_id: UUID, request: BarycenterCreate):
    """Create a virtual point at the barycenter (mean) of selected points.

    This creates a new point in the layer whose vector is the mean of the
    selected points' vectors. The point is marked as virtual (is_virtual=True).
    """
    store = get_data_store()
    layer = store.get_layer(layer_id)
    if layer is None:
        raise HTTPException(status_code=404, detail="Layer not found")

    # Convert string IDs to UUIDs
    try:
        point_uuids = [UUID(pid) for pid in request.point_ids]
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid point ID: {e}")

    point = store.create_barycenter(layer_id, point_uuids, request.name)
    if point is None:
        raise HTTPException(status_code=400, detail="Could not create barycenter - no valid points found")

    # Invalidate cached projections for this layer since we added a new point
    from backend.services import get_projection_engine
    engine = get_projection_engine()
    for proj in engine.list_projections():
        if proj.layer_id == layer_id:
            engine.invalidate_cache(proj.id)

    return point
