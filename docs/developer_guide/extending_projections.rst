Extending Projections
=====================

This guide walks through adding a new projection type to VectorScope.

Example: Adding a "UMAP" Projection
-----------------------------------

We'll add UMAP (Uniform Manifold Approximation and Projection) as a new projection type.

Step 1: Define the Type
^^^^^^^^^^^^^^^^^^^^^^^

Edit ``backend/models/projection.py``:

.. code-block:: python

   class ProjectionType(str, Enum):
       pca = "pca"
       tsne = "tsne"
       custom_axes = "custom_axes"
       umap = "umap"  # Add new type

Step 2: Install Dependencies
^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Add umap-learn to ``pixi.toml``:

.. code-block:: toml

   [dependencies]
   umap-learn = "*"

Run ``pixi install`` to install.

Step 3: Implement the Projection
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Edit ``backend/services/projection_engine.py``:

.. code-block:: python

   def _compute_umap(
       self,
       vectors: np.ndarray,
       params: dict,
       random_seed: Optional[int] = None,
   ) -> np.ndarray:
       """Compute UMAP projection.

       Args:
           vectors: Input vectors of shape (n_points, n_dims)
           params: Dictionary with optional keys:
               - n_neighbors (int): Size of local neighborhood (default: 15)
               - min_dist (float): Minimum distance between points (default: 0.1)
               - metric (str): Distance metric (default: "euclidean")
           random_seed: For reproducibility

       Returns:
           2D coordinates of shape (n_points, 2)
       """
       from umap import UMAP

       n_neighbors = params.get("n_neighbors", 15)
       min_dist = params.get("min_dist", 0.1)
       metric = params.get("metric", "euclidean")

       reducer = UMAP(
           n_components=2,
           n_neighbors=n_neighbors,
           min_dist=min_dist,
           metric=metric,
           random_state=random_seed,
       )
       return reducer.fit_transform(vectors)

Step 4: Register the Projection
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

In ``_compute_projection``:

.. code-block:: python

   def _compute_projection(self, projection: Projection) -> list[ProjectedPoint]:
       # ... get vectors ...

       if projection.type == ProjectionType.pca:
           coords = self._compute_pca(vectors, projection.parameters)
       elif projection.type == ProjectionType.tsne:
           coords = self._compute_tsne(vectors, projection.parameters, projection.random_seed)
       elif projection.type == ProjectionType.umap:  # Add this
           coords = self._compute_umap(vectors, projection.parameters, projection.random_seed)
       else:
           raise ValueError(f"Unknown projection type: {projection.type}")

       # ... create ProjectedPoints ...

Step 5: Set Default Parameters
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

In ``create_projection``:

.. code-block:: python

   def create_projection(
       self,
       layer_id: UUID,
       type: ProjectionType,
       name: str,
       dimensions: int = 2,
       parameters: Optional[dict] = None,
   ) -> Projection:
       # Default parameters
       if parameters is None:
           if type == ProjectionType.pca:
               parameters = {"components": [0, 1]}
           elif type == ProjectionType.tsne:
               parameters = {"perplexity": 30, "n_iter": 1000}
           elif type == ProjectionType.umap:  # Add this
               parameters = {"n_neighbors": 15, "min_dist": 0.1, "metric": "euclidean"}
           else:
               parameters = {}

       # ... rest of method ...

Step 6: Update Frontend Types
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Edit ``frontend/src/types/index.ts``:

.. code-block:: typescript

   export interface Projection {
     id: string;
     name: string;
     type: 'pca' | 'tsne' | 'custom_axes' | 'umap';  // Add type
     layer_id: string;
     dimensions: number;
     parameters: Record<string, unknown>;
     random_seed: number | null;
   }

Step 7: Add UI Controls in View Editor
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Edit ``frontend/src/App.tsx`` to add UMAP parameter controls:

.. code-block:: tsx

   {/* UMAP Configuration */}
   {projection.type === 'umap' && (
     <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
       <div style={{ fontSize: 11, color: '#888', textTransform: 'uppercase' }}>
         UMAP Parameters
       </div>
       <div>
         <div style={{ display: 'flex', justifyContent: 'space-between' }}>
           <span>Neighbors</span>
           <span>{umapNeighbors}</span>
         </div>
         <input
           type="range"
           min={5}
           max={50}
           value={umapNeighbors}
           onChange={(e) => setUmapNeighbors(parseInt(e.target.value))}
         />
       </div>
       <div>
         <div style={{ display: 'flex', justifyContent: 'space-between' }}>
           <span>Min Distance</span>
           <span>{umapMinDist.toFixed(2)}</span>
         </div>
         <input
           type="range"
           min={0}
           max={1}
           step={0.05}
           value={umapMinDist}
           onChange={(e) => setUmapMinDist(parseFloat(e.target.value))}
         />
       </div>
       <button
         onClick={() => updateProjection(projection.id, {
           parameters: { n_neighbors: umapNeighbors, min_dist: umapMinDist }
         })}
       >
         Recompute
       </button>
     </div>
   )}

Step 8: Add to Projection Type Dropdown
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

In ``ConfigPanel.tsx``, add UMAP option:

.. code-block:: tsx

   <select
     value={newViewType}
     onChange={(e) => setNewViewType(e.target.value as 'pca' | 'tsne' | 'umap')}
   >
     <option value="pca">PCA</option>
     <option value="tsne">t-SNE</option>
     <option value="umap">UMAP</option>
   </select>

Testing the Projection
----------------------

1. Restart backend and frontend
2. Load a dataset
3. Select the layer, add a UMAP view
4. Switch to View Editor
5. Adjust parameters and click Recompute

Performance Considerations
--------------------------

* **Caching**: Projection results are cached in ``_projection_results``
* **Random Seeds**: Store random_seed for reproducibility
* **Large Datasets**: UMAP is generally faster than t-SNE for large datasets

Adding 3D Support
-----------------

If your projection supports 3D, modify ``_compute_projection``:

.. code-block:: python

   def _compute_umap(self, vectors, params, random_seed, n_components=2):
       reducer = UMAP(n_components=n_components, ...)
       return reducer.fit_transform(vectors)

And update the frontend to support 3D Plotly charts.

Checklist
---------

When adding a new projection:

* [ ] Add type to ``ProjectionType`` enum
* [ ] Install any required dependencies
* [ ] Implement ``_compute_<type>`` method
* [ ] Add case to ``_compute_projection``
* [ ] Set default parameters in ``create_projection``
* [ ] Update TypeScript types
* [ ] Add dropdown option in ConfigPanel
* [ ] Add parameter UI controls in View Editor
* [ ] Write tests
* [ ] Update documentation
