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

Multiplies all vectors by a scale factor.

**Formula:** ``v' = s * v``

**Parameters:**

* **Scale Factor** - Multiplier (0.1 to 3.0)

**Use cases:**

* Normalizing magnitude
* Emphasizing or de-emphasizing certain patterns
* Comparing effect of scale on projections

Rotation
--------

Rotates vectors in a 2D plane within the n-dimensional space.

**Formula:** Rotation matrix applied to specified dimensions.

**Parameters:**

* **Angle** - Rotation angle in degrees (0-360)
* **Dimensions** - Which two dimensions to rotate (default: first two)

**Use cases:**

* Exploring rotational invariance
* Manually aligning projections
* Understanding how rotation affects clustering

Affine Transformations
----------------------

A general affine transformation: linear transformation plus translation.

**Formula:** ``v' = Av + b``

**Parameters:**

* **Matrix** - The linear transformation matrix A
* **Bias** - The translation vector b

**Use cases:**

* Applying learned transformations from neural networks
* Whitening or decorrelating features
* Custom geometric transformations

Linear Transformations
----------------------

Matrix multiplication without translation.

**Formula:** ``v' = Av``

**Parameters:**

* **Matrix** - The transformation matrix A

**Use cases:**

* Applying projection matrices
* Dimensionality reduction via matrix
* PCA-like transformations with custom loadings

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

* Scaling: divide by scale factor
* Rotation: rotate by negative angle
* Affine: apply inverse matrix
* Linear: apply inverse matrix

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
