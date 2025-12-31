# VectorScope

Interactive web-based system for exploring, transforming, and visualizing vector embeddings.

![VectorScope Logo](logo.svg)

## Overview

VectorScope is a visualization tool designed for exploring high-dimensional vector embeddings. It provides an interactive interface for:

- Loading and managing multiple embedding datasets
- Applying transformations (scaling, rotation, affine)
- Creating projections to 2D/3D space (PCA, t-SNE)
- Selecting and tracking specific points across views
- Building visual transformation pipelines via a graph editor

## Features

- **Multiple Data Sources**: Load data from CSV, NumPy files (.npy, .npz), or built-in sklearn datasets
- **Column Configuration**: For tabular data, choose which columns are features vs labels
- **Visual Transformation Graph**: Build data pipelines by connecting layers, transformations, and views
- **Interactive Projections**: Configure PCA components, t-SNE perplexity and iterations
- **Linked Viewports**: Synchronized selection across multiple views
- **Session Persistence**: Save and reload entire workspaces

## Quick Start

### Prerequisites

- [Pixi](https://pixi.sh) package manager (handles Python environment)
- Node.js 18+ (for frontend)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/vectorscope.git
cd vectorscope

# Install Python dependencies
pixi install

# Install frontend dependencies
cd frontend && npm install && cd ..
```

### Running

Start the backend and frontend:

```bash
# Start both backend and frontend
pixi run dev

# Or start them separately:
# Terminal 1: Backend (port 8001)
pixi run backend

# Terminal 2: Frontend (port 5173)
cd frontend && npm run dev
```

Open http://localhost:5173 in your browser.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React)                         │
├─────────────┬─────────────┬─────────────┬──────────────────┤
│  Viewports  │ Graph Editor│   Config    │  State (Zustand) │
│  (Plotly)   │ (ReactFlow) │   Panels    │                  │
└──────┬──────┴──────┬──────┴──────┬──────┴────────┬─────────┘
       │             │             │               │
       └─────────────┴──────┬──────┴───────────────┘
                            │ REST API (Vite Proxy)
                            ▼
       ┌────────────────────────────────────────────┐
       │           Backend (FastAPI)                 │
       ├─────────────┬─────────────┬────────────────┤
       │ Data Store  │ Transform   │ Projection     │
       │ (Layers)    │ Engine      │ Engine         │
       └─────────────┴─────────────┴────────────────┘
```

### Core Concepts

- **Layer**: A collection of points with n-dimensional vectors. Source layers contain original data; derived layers are created by transformations.
- **Point**: A single data point with a vector, optional label, and metadata.
- **Transformation**: An operation that maps one layer to another (scaling, rotation, affine).
- **Projection**: A dimension reduction from n-D to 2D/3D for visualization (PCA, t-SNE).

## Project Structure

```
vectorscope/
├── backend/               # FastAPI Python backend
│   ├── main.py           # Application entry point
│   ├── models/           # Pydantic data models
│   │   ├── layer.py      # Layer, Point, PointData
│   │   ├── transformation.py
│   │   └── projection.py
│   ├── services/         # Business logic
│   │   ├── data_store.py       # In-memory layer storage
│   │   ├── transform_engine.py # Transformation logic
│   │   └── projection_engine.py # PCA, t-SNE computation
│   ├── routers/          # API endpoints
│   │   ├── layers.py
│   │   ├── transformations.py
│   │   ├── projections.py
│   │   └── scenarios.py
│   └── fixtures.py       # Test data loaders
├── frontend/             # React TypeScript frontend
│   ├── src/
│   │   ├── App.tsx       # Main application component
│   │   ├── components/
│   │   │   ├── Viewport.tsx      # Plotly scatter plot
│   │   │   ├── GraphEditor.tsx   # ReactFlow DAG editor
│   │   │   ├── ConfigPanel.tsx   # Node configuration UI
│   │   │   └── ViewportGrid.tsx  # Multi-viewport layout
│   │   ├── stores/
│   │   │   └── appStore.ts       # Zustand state management
│   │   ├── api/
│   │   │   └── client.ts         # REST API client
│   │   └── types/
│   │       └── index.ts          # TypeScript interfaces
│   ├── vite.config.ts    # Vite configuration with API proxy
│   └── package.json
├── scenarios/            # Saved scenario files
├── docs/                 # Documentation (Sphinx)
└── pixi.toml            # Pixi environment configuration
```

## API Reference

### Layers

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/layers` | GET | List all layers |
| `/layers/{id}` | GET | Get layer by ID |
| `/layers/{id}` | PATCH | Update layer (name, columns) |
| `/layers/{id}/points` | GET | Get points in a layer |
| `/layers/upload` | POST | Upload data file (CSV, NPY, NPZ) |
| `/layers/synthetic` | POST | Generate synthetic dataset |
| `/layers/sklearn/{name}` | POST | Load sklearn dataset |

### Projections

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/projections` | GET | List all projections |
| `/projections` | POST | Create projection (PCA, t-SNE) |
| `/projections/{id}` | PATCH | Update projection parameters |
| `/projections/{id}/coordinates` | GET | Get 2D coordinates |

### Transformations

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/transformations` | GET | List all transformations |
| `/transformations` | POST | Create transformation |
| `/transformations/{id}` | PATCH | Update transformation parameters |

### Scenarios

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/scenarios` | GET | List available scenarios |
| `/scenarios/save` | POST | Save current state |
| `/scenarios/load/{name}` | POST | Load saved scenario |
| `/scenarios/upload` | POST | Upload scenario files |

## Extending VectorScope

### Adding a New Transformation Type

1. **Define the transformation type** in `backend/models/transformation.py`:
   ```python
   class TransformationType(str, Enum):
       scaling = "scaling"
       rotation = "rotation"
       affine = "affine"
       # Add your new type:
       my_transform = "my_transform"
   ```

2. **Implement the transformation** in `backend/services/transform_engine.py`:
   ```python
   def _apply_my_transform(self, vectors: np.ndarray, params: dict) -> np.ndarray:
       # Your transformation logic
       return transformed_vectors
   ```

3. **Add to the apply method**:
   ```python
   def apply_transformation(self, transformation, vectors):
       if transformation.type == TransformationType.my_transform:
           return self._apply_my_transform(vectors, transformation.parameters)
   ```

4. **Update the frontend** in `ConfigPanel.tsx` to show UI controls for your transformation.

### Adding a New Projection Type

1. **Define the projection type** in `backend/models/projection.py`:
   ```python
   class ProjectionType(str, Enum):
       pca = "pca"
       tsne = "tsne"
       # Add your new type:
       my_projection = "my_projection"
   ```

2. **Implement the projection** in `backend/services/projection_engine.py`:
   ```python
   def _compute_my_projection(self, vectors: np.ndarray, params: dict) -> np.ndarray:
       # Your projection logic (should return 2D or 3D coordinates)
       return coordinates
   ```

3. **Add to compute method**:
   ```python
   def _compute_projection(self, projection):
       if projection.type == ProjectionType.my_projection:
           coords = self._compute_my_projection(vectors, projection.parameters)
   ```

4. **Update the frontend** to show your projection type in dropdowns and add any parameter controls.

## Tech Stack

- **Backend**: Python 3.11+, FastAPI, NumPy, scikit-learn, Pydantic
- **Frontend**: React 18, TypeScript, Plotly.js, ReactFlow, Zustand
- **Build Tools**: Vite, Pixi (Python environment management)

## Development

### Running Tests

```bash
# Backend tests
pixi run test-backend

# Frontend tests
cd frontend && npm test
```

### Code Style

- Python: Follow PEP 8, use type hints
- TypeScript: Use strict mode, prefer interfaces over types

## License

MIT License - see [LICENSE](LICENSE) for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests
5. Submit a pull request

## Acknowledgments

- [Plotly.js](https://plotly.com/javascript/) for interactive visualizations
- [ReactFlow](https://reactflow.dev/) for the graph editor
- [scikit-learn](https://scikit-learn.org/) for dimensionality reduction algorithms
