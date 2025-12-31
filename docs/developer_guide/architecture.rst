Architecture Overview
=====================

VectorScope follows a client-server architecture with a clear separation between the computation backend and visualization frontend.

System Architecture
-------------------

.. code-block:: text

   ┌─────────────────────────────────────────────────────────────┐
   │                     Frontend (React)                         │
   │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────────────────┐ │
   │  │Viewport │ │ Graph   │ │ Config  │ │  State Management   │ │
   │  │(Plotly) │ │ Editor  │ │ Panels  │ │     (Zustand)       │ │
   │  └────┬────┘ └────┬────┘ └────┬────┘ └──────────┬──────────┘ │
   │       │           │           │                  │           │
   │       └───────────┴───────────┴──────────────────┘           │
   │                            │                                  │
   └────────────────────────────┼──────────────────────────────────┘
                                │ REST API (Vite Proxy /api → :8001)
   ┌────────────────────────────┼──────────────────────────────────┐
   │                    Backend (FastAPI)                          │
   │  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐  │
   │  │  Routers    │ │  Services   │ │       Models            │  │
   │  │  (API)      │ │  (Logic)    │ │     (Pydantic)          │  │
   │  └──────┬──────┘ └──────┬──────┘ └──────────┬──────────────┘  │
   │         │               │                    │                │
   │  ┌──────┴───────────────┴────────────────────┴──────────────┐ │
   │  │                    In-Memory Storage                      │ │
   │  │  DataStore   TransformEngine   ProjectionEngine           │ │
   │  └───────────────────────────────────────────────────────────┘ │
   └────────────────────────────────────────────────────────────────┘

Backend Architecture
--------------------

The Python backend is organized into three main layers:

Models (``backend/models/``)
^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Pydantic models defining data structures:

.. code-block:: python

   # layer.py
   class Layer(BaseModel):
       id: UUID
       name: str
       dimensionality: int
       point_count: int
       is_derived: bool
       column_names: Optional[list[str]]
       feature_columns: Optional[list[str]]
       label_column: Optional[str]

   class Point(BaseModel):
       id: UUID
       vector: list[float]
       label: Optional[str]
       metadata: dict
       is_virtual: bool

   # transformation.py
   class TransformationType(str, Enum):
       scaling = "scaling"
       rotation = "rotation"
       affine = "affine"
       linear = "linear"

   class Transformation(BaseModel):
       id: UUID
       type: TransformationType
       source_layer_id: UUID
       target_layer_id: Optional[UUID]
       parameters: dict
       is_invertible: bool

   # projection.py
   class ProjectionType(str, Enum):
       pca = "pca"
       tsne = "tsne"
       custom_axes = "custom_axes"

   class Projection(BaseModel):
       id: UUID
       type: ProjectionType
       layer_id: UUID
       dimensions: int
       parameters: dict
       random_seed: Optional[int]

Services (``backend/services/``)
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Business logic and state management:

**DataStore** (``data_store.py``)
   In-memory storage for layers and points. Singleton pattern.

   .. code-block:: python

      class DataStore:
          _layers: dict[UUID, Layer]
          _points: dict[UUID, dict[UUID, Point]]
          _raw_data: dict[UUID, dict]  # For column reconfiguration

          def create_layer(...) -> Layer
          def add_point(layer_id, point_data) -> Point
          def get_points(layer_id) -> list[Point]
          def get_vectors_as_array(layer_id) -> np.ndarray

**TransformEngine** (``transform_engine.py``)
   Applies transformations to create derived layers.

   .. code-block:: python

      class TransformEngine:
          def create_transformation(source_layer_id, type, params) -> Transformation
          def apply_transformation(transformation, vectors) -> np.ndarray
          def update_transformation(id, params) -> Transformation

**ProjectionEngine** (``projection_engine.py``)
   Computes projections using sklearn.

   .. code-block:: python

      class ProjectionEngine:
          def create_projection(layer_id, type, params) -> Projection
          def get_projected_coordinates(projection_id) -> list[ProjectedPoint]
          def _compute_projection(projection) -> list[ProjectedPoint]

Routers (``backend/routers/``)
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

FastAPI route handlers:

* ``layers.py`` - CRUD for layers, file uploads, synthetic generation
* ``transformations.py`` - CRUD for transformations
* ``projections.py`` - CRUD for projections
* ``scenarios.py`` - Save/load sessions

Frontend Architecture
---------------------

The React frontend uses Zustand for state management.

Components (``frontend/src/components/``)
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

**App.tsx**
   Main application component. Handles toolbar, dialogs, and view switching.

**GraphEditor.tsx**
   ReactFlow-based DAG editor. Renders nodes for layers, transformations, projections.

**ConfigPanel.tsx**
   Right-side panel for editing selected node properties.

**Viewport.tsx**
   Plotly scatter plot for displaying projections. Handles selection.

**ViewportGrid.tsx**
   Multi-viewport layout for comparing projections.

State Management (``frontend/src/stores/appStore.ts``)
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Zustand store containing:

.. code-block:: typescript

   interface AppState {
     // Data
     layers: Layer[];
     projections: Projection[];
     transformations: Transformation[];
     projectedPoints: Record<string, ProjectedPoint[]>;

     // Selection
     selectedPointIds: Set<string>;

     // Viewports
     viewports: ViewportConfig[];

     // Actions
     loadLayers: () => Promise<void>;
     createProjection: (params) => Promise<Projection | null>;
     updateTransformation: (id, updates) => Promise<Transformation | null>;
     // ... many more
   }

API Client (``frontend/src/api/client.ts``)
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

REST API client wrapping fetch:

.. code-block:: typescript

   export const api = {
     layers: {
       list: () => fetchJson<Layer[]>('/layers'),
       createSynthetic: (params) => fetchJson<Layer>('/layers/synthetic', ...),
       upload: (file) => { /* FormData upload */ },
     },
     projections: {
       create: (params) => fetchJson<Projection>('/projections', ...),
       getCoordinates: (id) => fetchJson<ProjectedPoint[]>(`/projections/${id}/coordinates`),
     },
     // ...
   };

Data Flow
---------

Creating a Projection
^^^^^^^^^^^^^^^^^^^^^

1. User clicks "Add View" in ConfigPanel
2. ``createProjection`` action called in appStore
3. POST ``/projections`` sent to backend
4. Backend creates Projection, computes coordinates
5. Frontend adds projection to state
6. Frontend fetches coordinates
7. Viewport renders with Plotly

Updating a Transformation
^^^^^^^^^^^^^^^^^^^^^^^^^

1. User adjusts slider in ConfigPanel
2. ``updateTransformation`` action called
3. PATCH ``/transformations/{id}`` sent
4. Backend updates transformation, recomputes derived layer
5. Backend recomputes dependent projections
6. Frontend reloads layers, projections
7. Frontend clears projection cache
8. Active viewports fetch new coordinates

Vite Proxy Configuration
------------------------

The frontend proxies API calls to the backend:

.. code-block:: typescript

   // vite.config.ts
   server: {
     proxy: {
       '/api': {
         target: 'http://localhost:8001',
         changeOrigin: true,
         rewrite: (path) => path.replace(/^\/api/, ''),
       },
     },
   }

This means ``/api/layers`` → ``http://localhost:8001/layers``.

Singleton Pattern
-----------------

The backend services use singleton instances:

.. code-block:: python

   _data_store: Optional[DataStore] = None

   def get_data_store() -> DataStore:
       global _data_store
       if _data_store is None:
           _data_store = DataStore()
       return _data_store

This ensures all routes share the same in-memory state.

Error Handling
--------------

Backend
^^^^^^^

FastAPI HTTPException for API errors:

.. code-block:: python

   if layer is None:
       raise HTTPException(status_code=404, detail="Layer not found")

Frontend
^^^^^^^^

Try-catch with state-based error display:

.. code-block:: typescript

   try {
     const layer = await api.layers.get(id);
     set({ layers: [...state.layers, layer] });
   } catch (e) {
     set({ error: (e as Error).message });
   }
