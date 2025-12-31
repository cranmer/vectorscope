Core Concepts
=============

VectorScope is built around a few key concepts that form the foundation of the tool.

Layers
------

A **Layer** is a collection of points, each with an n-dimensional vector. Layers are the fundamental data containers in VectorScope.

.. code-block:: text

   Layer
   ├── id: unique identifier
   ├── name: display name
   ├── dimensionality: number of dimensions (e.g., 30)
   ├── point_count: number of points
   ├── is_derived: true if created by a transformation
   └── points: list of Point objects

There are two types of layers:

**Source Layers** (green in the graph editor)
   Original data loaded from files or generated. These can have column configuration for tabular data.

**Derived Layers** (blue in the graph editor)
   Created by applying a transformation to another layer. These inherit the point structure but have different vectors.

Points
------

A **Point** represents a single data item with:

.. code-block:: text

   Point
   ├── id: unique identifier (preserved across transformations)
   ├── vector: list of floats [x1, x2, ..., xn]
   ├── label: optional text label
   ├── metadata: dictionary of additional properties
   └── is_virtual: true for computed points (barycenters, etc.)

Point IDs are stable across transformations, allowing you to track individual points through a pipeline.

Transformations
---------------

A **Transformation** is an operation that maps one layer to another, creating a derived layer:

.. code-block:: text

   Transformation
   ├── type: scaling | rotation | affine | linear
   ├── source_layer_id: the input layer
   ├── target_layer_id: the output layer (created automatically)
   ├── parameters: type-specific settings
   └── is_invertible: whether the operation can be reversed

Built-in transformation types:

**Scaling**
   Multiply all vectors by a scale factor. Useful for normalizing magnitude.

   Parameters: ``{scale_factors: [1.5]}``

**Rotation**
   Rotate vectors in a 2D plane within the n-dimensional space.

   Parameters: ``{angle: 0.785, dims: [0, 1]}``

**Affine**
   Apply an affine transformation (linear + translation).

   Parameters: ``{matrix: [[...]], bias: [...]}``

**Linear**
   Apply a linear transformation (matrix multiplication only).

   Parameters: ``{matrix: [[...]]}``

Projections
-----------

A **Projection** reduces an n-dimensional layer to 2D (or 3D) coordinates for visualization:

.. code-block:: text

   Projection
   ├── type: pca | tsne | custom_axes
   ├── layer_id: the source layer
   ├── dimensions: usually 2
   ├── parameters: type-specific settings
   └── random_seed: for reproducibility

Built-in projection types:

**PCA (Principal Component Analysis)**
   Linear projection onto the directions of maximum variance.

   Parameters: ``{components: [0, 1]}`` (which PCs to use for X and Y)

**t-SNE (t-distributed Stochastic Neighbor Embedding)**
   Non-linear projection that preserves local structure.

   Parameters: ``{perplexity: 30, n_iter: 1000}``

**Custom Axes** (planned)
   Define projection axes from point pairs or manually.

The Data Pipeline
-----------------

VectorScope organizes data as a directed acyclic graph (DAG):

.. code-block:: text

   Source Layer ──> Transformation ──> Derived Layer
         │                                    │
         │                                    ▼
         ▼                              Projection ──> 2D View
   Projection ──> 2D View

Multiple layers can feed into projections, and projections can be viewed in multiple viewports.

State Management
----------------

VectorScope maintains state at multiple levels:

**Backend (Python)**
   - In-memory data store for layers and points
   - Transform engine for applying transformations
   - Projection engine for computing coordinates

**Frontend (React/Zustand)**
   - Layers, projections, transformations metadata
   - Projected coordinates cache
   - Selection state (shared across viewports)
   - Viewport configuration

**Persistence**
   Sessions can be saved to JSON + NPZ files and reloaded later.
