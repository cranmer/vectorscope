Projections
===========

Projections reduce high-dimensional data to 1D, 2D, or 3D for visualization.

Available Projection Types
--------------------------

VectorScope supports multiple projection types organized by output dimensionality:

**1D Views** (Feature Distribution)

* **Density** - Distribution view with KDE curves or histogram
* **Box Plot** - Distribution by class with quartiles and outliers
* **Violin** - Distribution with density shape and box plot overlay

**2D Views** (Scatter Plots)

* **PCA** - Principal Component Analysis (fast, linear, interpretable)
* **t-SNE** - t-distributed Stochastic Neighbor Embedding (non-linear, cluster-focused)
* **UMAP** - Uniform Manifold Approximation and Projection (non-linear, preserves structure)
* **Direct Axes** - Use raw dimension values directly

**3D Views** (3D Scatter Plots)

* **PCA 3D** - PCA with three principal components
* **Direct Axes 3D** - Three raw dimensions as X, Y, Z axes

Creating Projections
--------------------

From the Graph Editor:

1. Select a layer node
2. In the Config Panel, find "Add View"
3. Enter an optional name
4. Select the projection type
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

UMAP (Uniform Manifold Approximation and Projection)
-----------------------------------------------------

UMAP is a modern non-linear dimensionality reduction technique that preserves both local and global structure.

**Advantages:**

* Faster than t-SNE for large datasets
* Better preserves global structure than t-SNE
* More consistent results across runs
* Good cluster separation

**Parameters:**

* **n_neighbors** - Number of neighbors for local structure (default: 15)
  - Lower values emphasize local structure
  - Higher values capture more global patterns
* **min_dist** - Minimum distance between points in embedding (default: 0.1)
  - Lower values create tighter clusters
  - Higher values spread points more evenly
* **spread** - Scale of embedded points (default: 1.0)
* **metric** - Distance metric (default: 'euclidean')

**When to use:**

* For large datasets where t-SNE is too slow
* When you need consistent, reproducible results
* To see both local clusters and global relationships

Direct Axes
-----------

Direct axes view shows raw dimension values without any transformation.

**Parameters:**

* **dim_x** - Which dimension to use for X axis (default: 0)
* **dim_y** - Which dimension to use for Y axis (default: 1)
* **dim_z** - Which dimension to use for Z axis (3D only, default: 2)

**When to use:**

* To inspect specific dimensions directly
* When you know which features are most important
* For sanity checking data before transformations

Density View
------------

Displays the distribution of values for a single dimension using KDE (kernel density
estimation) or histogram visualization.

**Parameters:**

* **dim** - Which dimension to display (default: 0)
* **bins** - Number of bins for histogram mode (default: 30)
* **kde** - Whether to show KDE curves (default: true)

**Display modes:**

* **KDE** (default) - Shows smooth density curves for each class
* **Histogram** - Shows binned counts with overlapping bars

**When to use:**

* To understand the distribution of a single feature
* To identify outliers
* To compare distributions across classes (by color)
* To see how well a feature separates classes

Box Plot View
-------------

Displays the distribution of values for a single dimension, grouped by class.

**Parameters:**

* **dim** - Which dimension to display (default: 0)

**Display:**

Shows box-and-whisker plots for each class, including:

* Median (center line)
* Interquartile range (box)
* Whiskers (1.5x IQR)
* Outliers (individual points)

**When to use:**

* To compare feature distributions across classes
* To identify which features separate classes
* To spot outliers within each class

Violin View
-----------

Displays the distribution of values for a single dimension using violin plots,
which combine box plots with KDE density curves.

**Parameters:**

* **dim** - Which dimension to display (default: 0)

**Display:**

Shows violin plots for each class, including:

* Density shape (the "violin" curves)
* Box plot overlay (quartiles)
* Mean line

**When to use:**

* When you want both box plot statistics and density visualization
* To compare distribution shapes across classes
* To see bimodal or multimodal distributions within classes

3D Projections
--------------

PCA and Direct Axes support 3D output for exploring data in three dimensions.

To create a 3D view:

1. Select a layer node in the Graph Editor
2. Click the "+" button to add a view
3. Choose from the **3D** category: "PCA 3D" or "Direct Axes 3D"
4. The 3D scatter plot will render in the View Editor

**Available 3D projections:**

* **PCA 3D** - Uses PC1, PC2, and PC3 as X, Y, Z axes
* **Direct Axes 3D** - Choose any three raw dimensions for X, Y, Z

**Interacting with 3D views:**

* Drag to rotate the view
* Scroll to zoom in/out
* Shift+drag to pan
* Use axis range sliders to focus on regions of interest

**When to use 3D:**

* When two dimensions don't capture enough variance
* To explore relationships between three features
* When clusters overlap in 2D but separate in 3D

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
2. **Try UMAP next** - Good balance of speed and cluster quality
3. **Use t-SNE for publication** - When you need the best cluster separation
4. **Try different components** - PC1/PC2 isn't always the most interesting view
5. **Use Direct Axes to inspect raw features** - Sanity check before complex projections
6. **Use Density/Box Plot/Violin for feature analysis** - Understand distributions by class
7. **Compare views** - The same data can look very different in different projections
8. **Save your session** - Preserve good parameter settings for reproducibility
