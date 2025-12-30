# Project Specification: Interactive Vector Embedding Visualization & Transformation System

## Audience
This document is written for Claude, an agentic AI coding assistant, tasked with designing and implementing the described system end-to-end. The assistant should make reasonable architectural decisions, propose concrete technologies, and implement working code incrementally while preserving extensibility.

## High-Level Goal

Build a **web-based interactive system** for exploring, transforming, and visualizing vector embeddings associated with documents (or other labeled entities).

Each entity has:
- A unique identifier
- Metadata (labels, descriptive fields)
- One or more vector representations (embeddings)
- Optional derived / virtual representations

The system must support:
- Multiple embeddings (layers) per entity
- A directed, branching transformation graph over embeddings
- Multiple linked visualizations of any layer
- Interactive selection, filtering, and axis definition
- Persistent saving/loading of workflows

This is **not** a static visualization: it is an exploratory computational graph editor tightly coupled to interactive visual analytics.

---

## Core Concepts & Terminology

### Entities
- **Point**: A single item in the dataset (document, object, etc.)
- **Vector**: High-dimensional numeric representation of a point at a given layer
- **Layer**: A named embedding space (original or derived)
- **Transformation**: A mapping from one layer to another
- **Projection**: A visualization mapping from a layer to 2D or 3D
- **Viewport**: A visualization panel tied to a specific layer or transformation
- **Selection**: A subset of points, possibly defined interactively
- **Virtual Point**: A derived point (e.g., barycenter of selected points)

---

## System Architecture (Conceptual)

Design the system as **four tightly integrated subsystems**:

1. **Data & Embedding Store**
2. **Transformation Graph Engine**
3. **Visualization & Interaction Layer**
4. **Persistence & State Management**

Each subsystem should be independently extensible.

---

## 1. Data & Embedding Store

### Requirements
- Store entities with metadata and vectors
- Support multiple embeddings per entity corresponding to different layers 
- Support virtual points derived from existing points
- Allow referencing the *same entity* across multiple layers

### Design Notes
- Vectors should be immutable once created (new transformations create new layers)
- Layers must be explicitly named and versioned
- Virtual points must behave identically to real points downstream
- Layers may have different dimensionality

### Virtual Points
Support creation of virtual points via:
- Barycenters of selected subsets
- Virtual points computed from other points (e.g. Weighted combinations)
- Manually entered virtual points

Virtual points must:
- Have stable IDs
- Be selectable, visualizable, and usable as axis definitions
- Be toggleable in visualizations

---

## 2. Transformation Graph Engine

### Overview
Implement a **directed acyclic graph (DAG)** of transformations over layers. Not clear it needs to be a DAG, a tree might be sufficient. I don't see many opportunities to merge, but that might not matter much in terms of implementation.

Example:
Layer 1
├── Transform A → Layer 2A
│ ├── Viewport 1
│ └── Viewport 2
└── Transform B → Layer 2B
└── Viewport 3



### Requirements
- Drag-and-drop creation of transformations
- Branching and parallel transformations
- Explicit input/output layer references
- Clear dependency tracking

### Transformation Types

#### Linear Transformations
- Scaling
- Rotation
- Affine transforms
- User-defined linear maps

#### Invertible / Flow-Like Transformations
Inspired by normalizing flows:
- Monotonic per-axis transformations
- Coupling-style transformations (future)
- Must be invertible or explicitly marked otherwise

#### Axis-Based Scaling Transformations
Special case:
- Select a **source axis** and **target axis**
- Visualize input-output relationship as a scatter plot
- Define a **monotonic nonlinear mapping** using:
  - Spline-like control points, or
  - Parametric curves controlled by sliders
- Enforce invertibility
- Apply scaling only along the specified direction

This transformation must expose:
- The learned / defined function
- Its inverse
- Visualization of before/after distributions

---

## 3. Projections & Visualization

### Projection Types

Implement multiple projection strategies:

#### Standard Projections
- PCA
- t-SNE
- (Optionally) UMAP

Note:
- Projections operate on the **current selection** (see filtering)
- Changing the selection recomputes projections

#### Custom Axis Projections
Allow users to define axes via:
- Pairwise point differences
- Virtual points (e.g., barycenters)

For 2D:
- Axis X = vector(point A → point B)
- Axis Y = vector(point C → point D)

Support:
- Arbitrary labeling of axes
- Reuse of axes across projections
- Multiple partial axis definitions

#### Underdetermined Axis Sets
If fewer than `n` axes are defined in `n` dimensions:
- Allow multiple viewports to define complementary constraints
- Tie multiple projections together to define a linear map
- Provide clear labeling and referencing of axes

---

## 4. Viewports & Panels

### Viewport Types
- 2D scatter plot
- 3D scatter plot
- Input-output axis plots (for transformations)
- Future extensibility (density plots, contours)

### Viewport Behavior
- Each viewport is explicitly attached to:
  - A layer, or
  - A transformation
- Multiple viewports can reference the same layer
- Viewports must stay synchronized

### Selection Visualization
- Selected vs unselected points shown simultaneously
- Distinguish via:
  - Color
  - Marker shape
  - Opacity
- Selection must propagate to:
  - Projections
  - Transformations
  - Virtual point creation

---

## 5. Interactive Selection & Filtering

### Selection Methods
- Rectangular brush
- Freeform lasso
- Programmatic (metadata-based, future)

Selections produce a **named subset** that can be:
- Referenced by transformations
- Used to compute PCA / t-SNE
- Used to define virtual points

Important:
- Filtering changes the *data used* by projections and transformations
- Filtering does NOT mutate the underlying vectors

---

## 6. Instance Tracking Panel

Implement a persistent panel that:
- Lists tracked points (real + virtual)
- Allows toggling visibility
- Highlights tracked points across all viewports
- Supports renaming and grouping

This is critical for longitudinal comparison across layers.

---

## 7. Workflow Persistence

### Save / Load
Persist:
- Data references
- Layers
- Transformations
- Axis definitions
- Viewports
- Selections
- UI layout

Use a declarative format (e.g., JSON graph spec).

### Reproducibility
- Transformations must be replayable
- Randomized methods (e.g., t-SNE) must store seeds
- Explicit versioning of saved workflows

---

## 8. Implementation Notes

### Suggested Stack (Not Prescriptive)
- Backend:
  - Python
  - PyTorch (transformations)
  - scikit-learn (PCA, t-SNE)
- Frontend:
  - Web-based (React / Svelte / similar)
  - WebGL or Canvas for plots
  - Node/edge graph editor for workflows
- State:
  - Explicit graph-based state management

### Key Design Principles
- Explicit over implicit
- Immutability of layers
- Everything is referenceable by ID
- Visualization is a first-class object
- Extensibility over premature optimization

---

## Success Criteria

The system is successful if a user can:
1. Load embeddings
2. Define transformations visually
3. Branch and compare alternative transformations
4. Define semantic axes using exemplars
5. Select subsets interactively
6. Track specific points across all views
7. Save and reload the entire workflow
8. Reason visually about how transformations change structure

---

## Instruction to the Agent

Design the system modularly.
Start with a minimal vertical slice:
- One synthetic dataset with 1000 points with embedding dimension of 30
- One transformation
- One projection
- One viewport

Then iteratively expand to full functionality.

 - Document architectural and UI decisions as you go. 
 - commit to github and tag at major milestones as the planning mode progresses.
 - Create branches when starting major features and then merge when they work. 
 - Create tests 
 - Use pixi to manage the environment
 - document work in README 

