Extending Transformations
=========================

This guide walks through adding a new transformation type to VectorScope.

Example: Adding a "Normalize" Transformation
--------------------------------------------

We'll add a transformation that normalizes vectors to unit length.

Step 1: Define the Type
^^^^^^^^^^^^^^^^^^^^^^^

Edit ``backend/models/transformation.py``:

.. code-block:: python

   class TransformationType(str, Enum):
       scaling = "scaling"
       rotation = "rotation"
       affine = "affine"
       linear = "linear"
       normalize = "normalize"  # Add new type

Step 2: Implement the Logic
^^^^^^^^^^^^^^^^^^^^^^^^^^^

Edit ``backend/services/transform_engine.py``:

.. code-block:: python

   def _apply_normalize(self, vectors: np.ndarray, params: dict) -> np.ndarray:
       """Normalize vectors to unit length.

       Parameters:
           vectors: Input array of shape (n_points, n_dims)
           params: Optional parameters (e.g., {"eps": 1e-10} for numerical stability)

       Returns:
           Normalized vectors of shape (n_points, n_dims)
       """
       eps = params.get("eps", 1e-10)
       norms = np.linalg.norm(vectors, axis=1, keepdims=True)
       return vectors / (norms + eps)

Step 3: Register the Transformation
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

In the same file, add to ``apply_transformation``:

.. code-block:: python

   def apply_transformation(
       self, transformation: Transformation, vectors: np.ndarray
   ) -> np.ndarray:
       """Apply a transformation to vectors."""
       if transformation.type == TransformationType.scaling:
           return self._apply_scaling(vectors, transformation.parameters)
       elif transformation.type == TransformationType.rotation:
           return self._apply_rotation(vectors, transformation.parameters)
       elif transformation.type == TransformationType.affine:
           return self._apply_affine(vectors, transformation.parameters)
       elif transformation.type == TransformationType.linear:
           return self._apply_linear(vectors, transformation.parameters)
       elif transformation.type == TransformationType.normalize:  # Add this
           return self._apply_normalize(vectors, transformation.parameters)
       else:
           raise ValueError(f"Unknown transformation type: {transformation.type}")

Step 4: Set Default Parameters
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

In ``create_transformation``:

.. code-block:: python

   def create_transformation(
       self,
       source_layer_id: UUID,
       type: TransformationType,
       name: str = "transform",
       parameters: Optional[dict] = None,
   ) -> Transformation:
       # ... existing code ...

       # Set default parameters for normalize
       if type == TransformationType.normalize and parameters is None:
           parameters = {"eps": 1e-10}

       # ... rest of method ...

Step 5: Update Frontend Types
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Edit ``frontend/src/types/index.ts``:

.. code-block:: typescript

   export interface Transformation {
     id: string;
     name: string;
     type: 'scaling' | 'rotation' | 'affine' | 'linear' | 'normalize';  // Add type
     source_layer_id: string;
     target_layer_id: string | null;
     parameters: Record<string, unknown>;
     is_invertible: boolean;
   }

Step 6: Add UI Controls
^^^^^^^^^^^^^^^^^^^^^^^

Edit ``frontend/src/components/ConfigPanel.tsx``:

In the LayerConfig component, add to the transformation type dropdown:

.. code-block:: tsx

   <select
     value={newTransformType}
     onChange={(e) => setNewTransformType(e.target.value as 'scaling' | 'rotation' | 'normalize')}
   >
     <option value="scaling">Scaling</option>
     <option value="rotation">Rotation</option>
     <option value="normalize">Normalize</option>
   </select>

In the TransformationConfig component, add parameter controls:

.. code-block:: tsx

   {transformation.type === 'normalize' && (
     <div style={{ fontSize: 12, color: '#aaa' }}>
       <p>Normalizes all vectors to unit length.</p>
       <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
         <span>Epsilon:</span>
         <input
           type="number"
           min={0}
           step={0.0000001}
           value={(params.eps as number) ?? 1e-10}
           onChange={(e) => onUpdate({
             parameters: { eps: parseFloat(e.target.value) }
           })}
           style={{ width: 100, ... }}
         />
       </label>
     </div>
   )}

Step 7: Test the Transformation
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

1. Start the backend: ``pixi run backend``
2. Start the frontend: ``cd frontend && npm run dev``
3. Load some data
4. Click on the layer
5. Add a "Normalize" transformation
6. Create a PCA view on the normalized layer
7. Verify the transformation works

Advanced: Adding Invertibility
------------------------------

If your transformation is invertible, set ``is_invertible: True`` and optionally implement the inverse:

.. code-block:: python

   def _apply_normalize_inverse(self, vectors: np.ndarray, params: dict) -> np.ndarray:
       """Cannot truly invert normalization (loses magnitude info)."""
       raise ValueError("Normalize transformation is not invertible")

For normalize, we should set ``is_invertible: False`` since we lose magnitude information.

Complete Example
----------------

Here's the complete ``_apply_normalize`` with docstring:

.. code-block:: python

   def _apply_normalize(self, vectors: np.ndarray, params: dict) -> np.ndarray:
       """Normalize vectors to unit length (L2 normalization).

       Each vector v is transformed to v / ||v||, making all vectors
       lie on the unit hypersphere.

       Args:
           vectors: Input vectors of shape (n_points, n_dims)
           params: Dictionary with optional keys:
               - eps (float): Small value for numerical stability (default: 1e-10)

       Returns:
           Normalized vectors of shape (n_points, n_dims)

       Example:
           >>> vectors = np.array([[3, 4], [1, 0]])
           >>> normalized = self._apply_normalize(vectors, {})
           >>> # Result: [[0.6, 0.8], [1.0, 0.0]]
       """
       eps = params.get("eps", 1e-10)
       norms = np.linalg.norm(vectors, axis=1, keepdims=True)
       return vectors / (norms + eps)

Testing
-------

Add a test in ``backend/tests/test_transform_engine.py``:

.. code-block:: python

   def test_normalize_transformation():
       store = DataStore()
       engine = TransformEngine()

       # Create layer with test vectors
       layer = store.create_layer("test", dimensionality=2)
       store.add_point(layer.id, PointData(vector=[3.0, 4.0], label="p1"))
       store.add_point(layer.id, PointData(vector=[1.0, 0.0], label="p2"))

       # Create normalize transformation
       transform = engine.create_transformation(
           source_layer_id=layer.id,
           type=TransformationType.normalize,
           name="norm",
       )

       # Verify derived layer exists
       derived = store.get_layer(transform.target_layer_id)
       assert derived is not None

       # Verify vectors are normalized
       points = store.get_points(derived.id)
       for point in points:
           norm = np.linalg.norm(point.vector)
           assert abs(norm - 1.0) < 1e-6

Checklist
---------

When adding a new transformation:

* [ ] Add type to ``TransformationType`` enum
* [ ] Implement ``_apply_<type>`` method
* [ ] Add case to ``apply_transformation``
* [ ] Set default parameters in ``create_transformation``
* [ ] Update TypeScript types
* [ ] Add dropdown option in ConfigPanel
* [ ] Add parameter UI controls
* [ ] Write tests
* [ ] Update documentation
