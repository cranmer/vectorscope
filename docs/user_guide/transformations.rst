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

Custom Affine Transformation
----------------------------

Transforms vectors using a user-defined change of basis where the first two
axes are custom directions (typically defined by barycenters), and the
remaining axes are preserved from the standard basis.

**Formula:** ``v' = B_target^{-1} @ (v - center)``

where ``B_target = [v1 | v2 | e_2 | e_3 | ... | e_{N-1}]``

**Parameters:**

* **Axis 1** - First custom axis direction (from a named custom axis)
* **Axis 2** - Second custom axis direction (from a named custom axis)
* **Projection Mode** - How to compute coordinates:

  * **Oblique** (default): Oblique coordinate projection onto the plane spanned by v1 and v2
  * **Affine**: Full change of basis transformation

* **Flip Axis 1/2** - Negate the direction of each axis

**Projection Modes Explained:**

The two projection modes give different results:

1. **Oblique Mode**: Finds coefficients (α, β) such that ``α*v1 + β*v2`` is the
   closest point to ``x`` in the plane spanned by v1 and v2. The remaining
   dimensions (e_2, ..., e_{N-1}) are copied unchanged from the input.

   Formula: ``[α, β] = (V^T V)^{-1} V^T x`` where ``V = [v1 | v2]``

2. **Affine Mode**: Full change of basis where ``x = c1*v1 + c2*v2 + c3*e_2 + ...``
   The coefficients c1, c2 are the exact decomposition, not a projection.
   The remaining dimensions are modified by the change of basis.

**Why they differ - Example:**

Consider a 3D example with:
- v1 = [1, 0, 1] (45° between e_0 and e_2)
- v2 = [0, 1, 0] = e_1

For a point x = [1, 0, 0]:

- Oblique projection gives: [0.5, 0] (closest point in the v1-v2 plane)
- Change of basis gives: [1, 0] (because x = 1*v1 + 0*v2 - 1*e_2)

The affine mode finds the exact coefficients needed to reconstruct x from the
basis vectors, while oblique mode finds the best approximation in the 2D subspace.

**Choosing a Mode:**

* Use **Oblique** when you want the Custom Axes view to match the transformation output
* Use **Affine** when you need the mathematically exact change of basis

**Use cases:**

* Aligning embeddings to semantically meaningful directions (e.g., "male→female", "young→old")
* Interpreting embeddings in terms of user-defined concepts
* Creating consistent coordinate systems across layers

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
