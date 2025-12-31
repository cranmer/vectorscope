Loading Data
============

VectorScope supports multiple data formats and sources.

Supported File Formats
----------------------

CSV Files
^^^^^^^^^

Comma-separated values with a header row. VectorScope automatically detects:

* **Numeric columns** - Used as vector dimensions
* **String columns** - Used as labels

Example CSV:

.. code-block:: text

   id,species,sepal_length,sepal_width,petal_length,petal_width
   1,setosa,5.1,3.5,1.4,0.2
   2,setosa,4.9,3.0,1.4,0.2
   ...

When you load a CSV, VectorScope:

1. Parses the header row
2. Detects which columns are numeric
3. Defaults to using all numeric columns as features
4. Uses the first string column as labels

You can reconfigure columns in the Config Panel after loading.

NumPy Files (.npy, .npz)
^^^^^^^^^^^^^^^^^^^^^^^^

**NPY files** contain a single 2D array of shape ``(n_points, n_dimensions)``.

**NPZ files** should contain one of these array names:

* ``vectors``
* ``data``
* ``embeddings``
* ``X`` or ``x``

If none of these exist, the first array is used.

For NumPy files, columns are named ``dim_0``, ``dim_1``, etc., and you can configure them after loading.

Loading Methods
---------------

Load Data Button
^^^^^^^^^^^^^^^^

1. Click **Load Data** in the toolbar
2. Select a CSV, NPY, or NPZ file
3. The layer is created and selected in the Graph Editor

Create Synthetic
^^^^^^^^^^^^^^^^

Generates random clustered data for testing:

* 1000 points by default
* 30 dimensions
* 5 clusters

Load Dataset
^^^^^^^^^^^^

Built-in sklearn datasets:

* **Iris** - 150 samples, 4 features, 3 classes
* **Wine** - 178 samples, 13 features, 3 classes
* **Breast Cancer** - 569 samples, 30 features, 2 classes
* **Digits** - 1797 samples, 64 features, 10 classes
* **Diabetes** - 442 samples, 10 features, regression target
* **Linnerud** - 20 samples, 3 features

These datasets include proper feature names and class labels.

Open Session
^^^^^^^^^^^^

Load a previously saved VectorScope session (JSON + NPZ files).

Column Configuration
--------------------

For source layers (not derived), you can configure which columns to use:

1. Select the layer in the Graph Editor
2. In the Config Panel, you'll see:

   * **Label Column** dropdown - Which column provides point labels
   * **Feature Columns** checkboxes - Which columns to use as vector dimensions

3. Click **Apply Column Configuration** to update

This is especially useful for CSV files where you may want to:

* Exclude certain columns (like IDs)
* Use a specific column for labels/coloring
* Remove non-feature columns from the vector

.. note::
   Changing column configuration recomputes all downstream projections and transformations.

Data Limits
-----------

VectorScope stores all data in memory. Consider these practical limits:

* **Points**: Tens of thousands work well; hundreds of thousands may be slow
* **Dimensions**: Hundreds is fine; thousands may slow down projections
* **t-SNE**: Especially slow for large datasets; consider using PCA first
