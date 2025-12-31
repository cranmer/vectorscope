Quickstart
==========

This guide will walk you through your first VectorScope session.

Starting VectorScope
--------------------

1. Start the backend and frontend:

.. code-block:: bash

   pixi run dev

Or start them separately:

.. code-block:: bash

   # Terminal 1
   pixi run backend

   # Terminal 2
   cd frontend && npm run dev

2. Open http://localhost:5173 in your browser.

Your First Visualization
------------------------

Loading Data
^^^^^^^^^^^^

When VectorScope starts with no data, you'll see three options:

* **Load Data** - Upload your own CSV, NPY, or NPZ file
* **Create Synthetic** - Generate random clustered data
* **Load Dataset** - Use a standard sklearn dataset (Iris, Wine, etc.)

Let's start with the Iris dataset:

1. Click **Load Dataset**
2. Select **Iris** from the list
3. VectorScope automatically creates a PCA projection

Exploring the Graph Editor
^^^^^^^^^^^^^^^^^^^^^^^^^^

The default view is the **Graph Editor**, which shows your data pipeline:

* **Green node (Iris)** - The source data layer (150 points, 4 dimensions)
* **Blue node (PCA)** - The projection that creates 2D coordinates

Click on a node to see its configuration in the right panel.

Viewing the Data
^^^^^^^^^^^^^^^^

Switch to the **View Editor** tab to see the actual scatter plot:

1. Select a view from the dropdown (e.g., "Iris: PCA")
2. The plot shows points colored by their class (setosa, versicolor, virginica)
3. Hover over points to see their labels

Adding Another View
^^^^^^^^^^^^^^^^^^^

1. Go back to the **Graph Editor**
2. Click on the **Iris** layer node
3. In the config panel, find "Add View"
4. Select **t-SNE** and click **Add View**

Now you have two projections of the same data. Switch to **Viewports** mode to see them side by side.

Making a Selection
^^^^^^^^^^^^^^^^^^

1. In any viewport, drag to select a group of points (box selection)
2. Switch between views - your selection is synchronized
3. Click "Clear Selection" to deselect all points

Saving Your Work
----------------

1. Click **Save** in the toolbar
2. Enter a name for your session
3. Your data, projections, and settings are saved

To reload later:

1. Click **Open**
2. Select your saved session

Next Steps
----------

* Learn about :doc:`concepts` - layers, transformations, projections
* Explore :doc:`user_guide/loading_data` - work with your own data
* Read :doc:`user_guide/transformations` - apply scaling, rotation, etc.
