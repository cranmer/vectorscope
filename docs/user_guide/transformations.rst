Transformations
===============

Transformations modify vectors to create derived layers.

Creating Transformations
------------------------

1. Select a layer in the Graph Editor
2. In the Config Panel, find "Add Transformation"
3. Enter an optional name
4. Select the transformation type
5. Click "Add Transformation"

This creates:

* A new transformation node
* A new derived layer with transformed vectors

Scaling
-------

Multiplies vectors by per-axis scale factors.

**Formula:** ``v'[i] = scale_factors[i] * v[i]``

**Parameters:**

* **Scale Factors** - Per-dimension multipliers (can be linked or independent)
* **Link Axes** - When enabled, all axes use the same scale factor

**Use cases:**

* Normalizing magnitude across dimensions
* Emphasizing or de-emphasizing certain features
* Exploring how scale affects clustering patterns

Rotation
--------

Rotates vectors in a 2D plane within the n-dimensional space.

**Formula:** Rotation matrix applied to two selected dimensions.

**Parameters:**

* **Angle** - Rotation angle in degrees (-180° to 180°)
* **Rotation Plane** - Which two dimensions to rotate (e.g., "dim_0 ↔ dim_1")

**Use cases:**

* Exploring rotational invariance of embeddings
* Manually aligning projections for comparison
* Understanding how rotation affects clustering structure

PCA Transformation
------------------

Applies Principal Component Analysis to transform vectors into the principal component
coordinate system. This is useful for reducing dimensionality while preserving variance,
or for decorrelating features.

**Formula:** ``v' = PCA(v)`` where each output axis is a principal component

**Parameters:**

* **Components** - Number of principal components to keep (default: all)
* **Center** - Whether to center the data (subtract mean) before PCA (default: true)
* **Whiten** - Whether to normalize variance of each component (default: false)

**Stored Information:**

After applying the PCA transformation, the following information is computed and stored:

* **Explained Variance Ratio** - How much variance each component captures
* **Components Matrix** - The principal component directions (loadings)
* **Mean** - The mean vector used for centering

**Use cases:**

* Dimensionality reduction before visualization
* Decorrelating features (whitening)
* Understanding which original dimensions contribute to each component
* Preprocessing data for downstream transformations

Configuring Transformations
---------------------------

After creating a transformation:

1. Click the transformation node in the Graph Editor
2. Adjust parameters using sliders or inputs
3. Changes apply immediately to derived layers and projections

Chaining Transformations
------------------------

To apply multiple transformations:

1. Create the first transformation (Source → T1 → Derived1)
2. Select the derived layer (Derived1)
3. Add another transformation (Derived1 → T2 → Derived2)

Example chain:

.. code-block:: text

   Iris → Scaling (0.5) → Scaled → Rotation (45°) → Rotated
     ↓                       ↓                          ↓
   PCA View              PCA View                   PCA View

Transformation Properties
-------------------------

Invertibility
^^^^^^^^^^^^^

All built-in transformations are invertible (can be reversed):

* **Scaling**: divide by scale factor
* **Rotation**: rotate by negative angle
* **PCA**: apply inverse transformation (multiply by components matrix transpose)

Point Identity
^^^^^^^^^^^^^^

Point IDs are preserved across transformations. This means:

* You can track the same point through the pipeline
* Selection works across transformed and source layers
* Labels and metadata are preserved

Real-time Updates
^^^^^^^^^^^^^^^^^

When you modify transformation parameters:

1. Derived layer vectors are recomputed
2. All dependent projections are recomputed
3. Views update immediately

Tips
----

* **Start simple**: Use scaling to understand magnitude effects
* **Small rotations**: Start with small angles to see gradual effects
* **Compare views**: Create projections before and after transformation
* **Chain carefully**: Each transformation adds to the pipeline
