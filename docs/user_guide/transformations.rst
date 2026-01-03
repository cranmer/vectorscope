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

Transforms vectors using a user-defined change of basis where the first two or three
axes are custom directions (typically defined by barycenters), and the
remaining axes are preserved from the standard basis.

**Formula:** ``v' = B_target^{-1} @ (v - center)``

where ``B_target = [v1 | v2 | e_2 | e_3 | ... | e_{N-1}]`` (2D)

or ``B_target = [v1 | v2 | v3 | e_3 | e_4 | ... | e_{N-1}]`` (3D)

**Parameters:**

* **Axis 1** - First custom axis direction (from a named custom axis)
* **Axis 2** - Second custom axis direction (from a named custom axis)
* **Axis 3** - Third custom axis direction (optional, for 3D output)
* **Projection Mode** - How to compute coordinates:

  * **Oblique** (default): Oblique coordinate projection onto the subspace spanned by the axes
  * **Affine**: Full change of basis transformation

* **Flip Axis 1/2/3** - Negate the direction of each axis
* **Center** - Use mean (default) or a virtual point as origin

**Projection Modes Explained:**

The two projection modes give different results:

1. **Oblique Mode**: Finds coefficients (α, β, [γ]) such that ``α*v1 + β*v2 [+ γ*v3]`` is the
   closest point to ``x`` in the subspace spanned by the custom axes. The remaining
   dimensions are copied unchanged from the input.

   Formula: ``[α, β, γ] = (V^T V)^{-1} V^T x`` where ``V = [v1 | v2 | v3]``

2. **Affine Mode**: Full change of basis where ``x = c1*v1 + c2*v2 + c3*v3 + c4*e_3 + ...``
   The coefficients c1, c2, c3 are the exact decomposition, not a projection.
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

**3D Custom Affine:**

To use three custom axes for a 3D change of basis:

1. Create three custom axes (e.g., from class barycenters)
2. Select the Custom Affine transformation
3. Choose axes for Axis 1, Axis 2, and Axis 3
4. Click Apply

When a third axis is specified, the transformation replaces the first three
standard basis vectors with your custom axes, creating a 3D coordinate system
aligned to your semantic directions.

**Example - Iris with 3D Custom Affine:**

1. Create barycenters for setosa, versicolor, and virginica classes
2. Define axes: setosa→versicolor, setosa→virginica, versicolor→virginica
3. Apply Custom Affine with all three axes
4. The derived layer's first three dimensions now represent distances along these semantic directions

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
