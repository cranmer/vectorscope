Annotations
===========

The Annotations panel in the View Editor provides tools for selecting, grouping, and marking
points in your data. Annotations help you identify patterns, create reference points, and
organize your exploration.

.. contents:: On this page
   :local:
   :depth: 2

Accessing the Annotations Panel
-------------------------------

The Annotations panel appears on the right side of the View Editor:

1. Switch to the **View Editor** tab
2. Select a view (projection) to display
3. The right panel shows **View Configuration** at the top and **Annotations** below

Selection Tools
---------------

VectorScope provides interactive tools for selecting points in your visualizations.

Box Selection (Basic)
^^^^^^^^^^^^^^^^^^^^^

To select multiple points:

1. Click and drag on the plot to draw a selection rectangle
2. All points within the rectangle are selected
3. Selected points are highlighted in the visualization
4. The selection count appears in the Annotations panel

.. note::
   Selection is synchronized across all viewports. Points selected in one view
   are highlighted in all other views showing the same data.

Additive Selection (Shift + Box Select)
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

To add more points to an existing selection:

1. Hold the **Shift** key
2. Draw another selection rectangle
3. The new points are added to your existing selection
4. Repeat to build up a complex selection

This is useful when points you want to select are in multiple regions of the plot.

Point Toggling (Shift + Click)
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

To add or remove individual points:

1. Hold the **Shift** key
2. Click on a point to toggle its selection state:
   - If unselected, it becomes selected
   - If already selected, it becomes unselected

This provides fine-grained control for adjusting selections.

Clear Selection
^^^^^^^^^^^^^^^

To clear all selected points:

* Click the **Clear Selection** button in the Annotations panel, or
* Click on an empty area of the plot (no points)

Named Selections
----------------

Named selections let you save groups of points for later use. This is useful for:

* Marking clusters or groups you've identified
* Creating reference sets for comparison
* Building selections incrementally across sessions

Saving a Selection
^^^^^^^^^^^^^^^^^^

1. Select points using the selection tools above
2. In the Annotations panel, enter a name in the **Selection name** field
3. Click **Save**
4. The selection appears in the **Selections** list

Applying a Selection
^^^^^^^^^^^^^^^^^^^^

To restore a saved selection:

1. Find the selection in the **Selections** list
2. Click **Apply**
3. The saved points become selected in the visualization

.. note::
   If some points in the saved selection are no longer in the current view
   (e.g., after loading different data), only the matching points are selected.

Deleting a Selection
^^^^^^^^^^^^^^^^^^^^

To remove a saved selection:

1. Find the selection in the **Selections** list
2. Click the **x** button next to it

Virtual Points (Barycenters)
----------------------------

Virtual points are synthetic points you create to mark important locations in your data.
The most common use is creating **barycenters** (centroids) that represent the center
of a group of points.

What is a Barycenter?
^^^^^^^^^^^^^^^^^^^^^

A barycenter is the mean position of a set of points. In VectorScope, barycenters are
computed in the original high-dimensional space and then projected to 2D/3D along with
your data. This means the barycenter represents the true center of the selected points,
not just the visual center in the projection.

Creating a Barycenter
^^^^^^^^^^^^^^^^^^^^^

1. Select the points you want to find the center of
2. Optionally enter a name in the **Barycenter name** field
3. Click **+ Point**
4. A virtual point appears at the centroid of your selection

The virtual point is displayed with a distinct marker (star shape) and appears in the
**Virtual Points** list.

Naming Barycenters
^^^^^^^^^^^^^^^^^^

Give your barycenters meaningful names to remember what they represent:

* "Class A center" - Center of a class
* "Cluster 1" - Center of an identified cluster
* "Outlier group" - Center of points you've marked as outliers

Deleting Virtual Points
^^^^^^^^^^^^^^^^^^^^^^^

To remove a virtual point:

1. Find it in the **Virtual Points** list
2. Click the **x** button next to it

Auto-Generate from Classes
--------------------------

If your dataset has class labels, VectorScope can automatically create selections and
barycenters for each class. This provides a quick way to mark and analyze class structure.

Requirements
^^^^^^^^^^^^

This feature appears when:

* Your data has class labels (the ``label`` field on points)
* You're in the View Editor with a projection loaded

The section shows the number of detected classes and lists them.

Creating Selections for Each Class
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Click the **Selections** button to:

1. Create a named selection for each class label
2. Each selection contains all points with that class label
3. Selections appear in the **Selections** list

For example, with the Iris dataset, this creates three selections: "setosa", "versicolor",
and "virginica".

Creating Barycenters for Each Class
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Click the **Barycenters** button to:

1. Create a virtual point (barycenter) for each class label
2. Each barycenter is named after its class
3. Barycenters appear in the **Virtual Points** list

This is useful for:

* Visualizing class centers in the projection
* Comparing how far apart different classes are
* Creating reference points for custom axis projections (future feature)

Best Practices
--------------

1. **Start with exploration** - Use box selection to explore clusters before saving
2. **Use additive selection** - Build complex selections incrementally with Shift
3. **Name selections descriptively** - Future you will thank present you
4. **Create class barycenters** - They help anchor your understanding of the data
5. **Compare across views** - Selection syncs across viewports, use this to compare

Workflow Example
----------------

Here's a typical workflow using annotations:

1. **Load a dataset** with class labels (e.g., Iris from sklearn)
2. **Create a PCA view** to see the data structure
3. **Auto-generate class barycenters** - Click "Barycenters" in Auto-Generate section
4. **Observe class separation** - See where class centers are relative to each other
5. **Select interesting points** - Use box select to grab points between classes
6. **Save as "borderline cases"** - Name and save the selection
7. **Switch to t-SNE view** - See how the same selection appears in a different projection
8. **Create a barycenter** for your selection to mark the center of borderline cases
