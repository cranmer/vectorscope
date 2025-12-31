Projections
===========

Projections reduce high-dimensional data to 2D for visualization.

Creating Projections
--------------------

From the Graph Editor:

1. Select a layer node
2. In the Config Panel, find "Add View"
3. Enter an optional name
4. Select the projection type (PCA or t-SNE)
5. Click "Add View"

The projection is created and you can view it in the View Editor.

PCA (Principal Component Analysis)
----------------------------------

PCA finds the directions of maximum variance in your data and projects onto them.

**Advantages:**

* Fast computation
* Deterministic (same result every time)
* Preserves global structure
* Components are interpretable

**Parameters:**

* **Components** - Which principal components to use for X and Y axes (default: PC1, PC2)

**When to use:**

* For quick exploration
* When you want to see the directions of maximum variance
* For large datasets where t-SNE is too slow

Configuring PCA
^^^^^^^^^^^^^^^

In the View Editor:

1. Select your PCA view
2. Use the X Axis and Y Axis dropdowns to choose different components
3. Click "Apply" to recompute

Try PC1 vs PC3, or PC2 vs PC3 to see different aspects of your data.

t-SNE (t-distributed Stochastic Neighbor Embedding)
---------------------------------------------------

t-SNE is a non-linear technique that emphasizes local structure and cluster separation.

**Advantages:**

* Excellent at revealing clusters
* Preserves local neighborhoods
* Good for high-dimensional data

**Disadvantages:**

* Slow for large datasets
* Non-deterministic (different results each run)
* Global distances are not meaningful
* Sensitive to parameters

**Parameters:**

* **Perplexity** - Balance between local and global aspects (5-50, default: 30)
* **Iterations** - Number of optimization steps (250-2000, default: 1000)

**When to use:**

* For exploring cluster structure
* When you have time for computation
* For datasets with well-defined local neighborhoods

Configuring t-SNE
^^^^^^^^^^^^^^^^^

In the View Editor:

1. Select your t-SNE view
2. Adjust the **Perplexity** slider
   - Lower values emphasize local structure
   - Higher values capture more global structure
3. Adjust the **Iterations** slider
   - More iterations = better convergence but slower
4. Click "Recompute"

.. note::
   t-SNE creates a new random layout each time. The ``random_seed`` is saved
   with your session for reproducibility.

Comparing Projections
---------------------

To compare different projections:

1. Create multiple projections from the same layer
2. Switch to the **Viewports** view
3. Add viewports and assign different projections
4. Selection is synchronized across viewports

This lets you see how the same points appear in PCA vs t-SNE, or with different parameters.

Understanding the Visualization
-------------------------------

Point Colors
^^^^^^^^^^^^

Points are colored by their metadata:

* **cluster** - For synthetic data, the assigned cluster
* **class** - For sklearn datasets, the target class
* **Label-based** - For CSV data, unique labels get unique colors

Selection
^^^^^^^^^

* Drag to select multiple points
* Selected points are highlighted in all viewports
* Selection count shows in the toolbar
* Click "Clear Selection" to deselect

Best Practices
--------------

1. **Start with PCA** - It's fast and gives a good overview
2. **Use t-SNE for clusters** - If PCA doesn't show clear separation
3. **Try different components** - PC1/PC2 isn't always the most interesting view
4. **Compare views** - The same data can look very different in different projections
5. **Save perplexity values** - When you find good t-SNE parameters, save the session
