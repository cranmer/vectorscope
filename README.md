# VectorScope

Interactive web-based system for exploring, transforming, and visualizing vector embeddings.

## Features

- **Multiple embedding layers** per entity with transformation tracking
- **Visual transformation graph** for building data pipelines
- **Interactive projections**: PCA, t-SNE, custom axes
- **Linked viewports** with synchronized selection
- **Virtual points**: barycenters, weighted combinations
- **Workflow persistence**: save and reload entire sessions

## Quick Start

### Prerequisites

- [Pixi](https://pixi.sh) package manager

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/vectorscope.git
cd vectorscope

# Install dependencies
pixi install

# Install frontend dependencies
cd frontend && npm install && cd ..
```

### Running

Start the backend and frontend in separate terminals:

```bash
# Terminal 1: Backend
pixi run backend

# Terminal 2: Frontend
cd frontend && npm run dev
```

Or use the combined dev task:

```bash
pixi run dev
```

Open http://localhost:5173 in your browser.

## Project Structure

```
vectorscope/
├── backend/           # FastAPI Python backend
│   ├── models/        # Pydantic data models
│   ├── services/      # Business logic
│   ├── routers/       # API endpoints
│   └── tests/         # Backend tests
├── frontend/          # React TypeScript frontend
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── stores/      # Zustand state management
│   │   ├── api/         # API client
│   │   └── types/       # TypeScript types
│   └── tests/         # Frontend tests
└── docs/              # Documentation
```

## API Endpoints

- `GET /layers` - List all layers
- `POST /layers/synthetic` - Create synthetic test dataset
- `GET /layers/{id}/points` - Get points in a layer
- `POST /projections` - Create a projection (PCA, t-SNE)
- `GET /projections/{id}/coordinates` - Get projected coordinates
- `POST /transformations` - Apply a transformation

## Development

### Running Tests

```bash
# Backend tests
pixi run test-backend

# Frontend tests
cd frontend && npm test
```

### Tech Stack

- **Backend**: Python, FastAPI, NumPy, scikit-learn
- **Frontend**: React, TypeScript, Plotly.js, Zustand
- **Build**: Vite, Pixi

## License

MIT
