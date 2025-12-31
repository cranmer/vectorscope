Graph Editor
============

The Graph Editor provides a visual interface for building data pipelines.

Overview
--------

The graph shows your data flow as connected nodes:

* **Layer nodes** (rectangles) - Data containers
* **Transformation nodes** (rounded) - Operations between layers
* **Projection nodes** (circles) - Dimension reduction for viewing

Nodes are connected by edges showing the data flow direction.

Node Types
----------

Source Layers (Green)
^^^^^^^^^^^^^^^^^^^^^

Your original data. These can be:

* Uploaded files (CSV, NPY, NPZ)
* Generated synthetic data
* sklearn datasets

Source layers show column configuration in the Config Panel.

Derived Layers (Blue)
^^^^^^^^^^^^^^^^^^^^^

Created when you add a transformation. These inherit the points from the source layer but have different vector values.

Transformation Nodes (Purple/Orange)
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Operations that connect layers:

* **Scaling** (purple) - Multiply vectors by a factor
* **Rotation** (orange) - Rotate in a 2D plane
* **Affine** - Linear transformation with translation
* **Linear** - Matrix multiplication

Projection Nodes (Blue/Purple)
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Dimension reduction for visualization:

* **PCA** (blue) - Principal Component Analysis
* **t-SNE** (purple) - t-distributed Stochastic Neighbor Embedding

Interacting with Nodes
----------------------

Selecting
^^^^^^^^^

Click on any node to select it. The Config Panel on the right shows:

* Node name (click to edit)
* Node type and properties
* Type-specific controls
* Actions (Add View, Add Transformation, etc.)

Panning and Zooming
^^^^^^^^^^^^^^^^^^^

* **Pan**: Click and drag the background
* **Zoom**: Scroll wheel

Node Layout
^^^^^^^^^^^

Nodes are automatically positioned but can be manually arranged by dragging.

Config Panel
------------

When a node is selected, the Config Panel shows:

For Layers
^^^^^^^^^^

* Name (editable)
* Type (Source/Derived)
* Point count
* Dimensionality
* Column configuration (source layers only)
* Existing views
* "Add View" section
* "Add Transformation" section (if no outgoing transformation)

For Transformations
^^^^^^^^^^^^^^^^^^^

* Name (editable)
* Type selector
* Type-specific parameters (sliders for scale, angle, etc.)
* Invertibility status

For Projections
^^^^^^^^^^^^^^^

* Name (editable)
* Type and dimensions
* Random seed (for reproducibility)
* "Show View" button - opens the View Editor

Building a Pipeline
-------------------

Example: Scaled PCA View
^^^^^^^^^^^^^^^^^^^^^^^^

1. Load data (creates source layer)
2. Click the layer node
3. Add a **Scaling** transformation (creates derived layer)
4. Click the new derived layer
5. Add a **PCA** view

Now you have: Source → Scaling → Derived Layer → PCA View

Example: Compare Original and Transformed
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

1. Load data
2. Add a PCA view to the source layer
3. Add a Transformation (scaling, rotation)
4. Add a PCA view to the derived layer
5. Switch to Viewports mode to compare both views

Tips
----

* **One transformation per layer**: Each layer can only have one outgoing transformation, but can have multiple projections
* **Chain transformations**: To apply multiple transformations, chain them: Source → T1 → Layer → T2 → Layer
* **Real-time updates**: Changing transformation parameters immediately updates derived layers and projections
