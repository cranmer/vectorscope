Sessions
========

VectorScope sessions let you save and restore your entire workspace.

What Gets Saved
---------------

A session includes:

* **All layers** - Source and derived
* **All points** - Vectors, labels, metadata
* **All transformations** - Type, parameters
* **All projections** - Type, parameters, pre-computed coordinates
* **Column configuration** - For tabular data sources
* **Random seeds** - For reproducible t-SNE

What Doesn't Get Saved
----------------------

* Selection state
* Viewport layout
* View sets
* UI settings

Saving a Session
----------------

1. Click **Save** in the toolbar
2. Enter a session name
3. Click **Save**

Files are saved to the ``scenarios/`` directory:

* ``{name}_config.json`` - Structure and metadata
* ``{name}_data.npz`` - Vectors and coordinates

Quick Save
^^^^^^^^^^

After saving once:

* Click **Save** to overwrite the current session
* Click **Save As** to save with a new name

Opening a Session
-----------------

Method 1: From Browser
^^^^^^^^^^^^^^^^^^^^^^

1. Click **Open** in the toolbar
2. Select a session from the "Saved Sessions" list
3. The session loads, replacing current data

Method 2: From Files
^^^^^^^^^^^^^^^^^^^^

1. Click **Open** in the toolbar
2. Click the file picker
3. Select the ``*_config.json`` file
4. Optionally select the ``*_data.npz`` file

New Session
-----------

1. Click **New** in the toolbar
2. Confirm if you have unsaved changes
3. All data is cleared

Session Files
-------------

Config File (JSON)
^^^^^^^^^^^^^^^^^^

Contains the structure:

.. code-block:: json

   {
     "name": "My Session",
     "description": "Analysis of embeddings",
     "layers": [
       {
         "id": "uuid-here",
         "name": "Source Data",
         "dimensionality": 30,
         "is_derived": false,
         "column_names": ["dim_0", "dim_1", ...],
         "feature_columns": ["dim_0", "dim_1", ...],
         "label_column": null
       }
     ],
     "transformations": [...],
     "projections": [...],
     "point_metadata": {...}
   }

Data File (NPZ)
^^^^^^^^^^^^^^^

Contains NumPy arrays:

* ``layer_{id}_vectors`` - Point vectors for each layer
* ``layer_{id}_ids`` - Point IDs for each layer
* ``projection_{id}_coords`` - Pre-computed projection coordinates

Importing External Data
-----------------------

You can create session files externally:

1. Create a ``*_config.json`` with the structure above
2. Create a ``*_data.npz`` with the arrays
3. Use Open → file picker to load them

This is useful for:

* Loading embeddings from neural networks
* Batch processing
* Integration with other tools

Scenarios (Built-in)
--------------------

The ``scenarios/`` directory contains pre-built sessions:

* **Iris** - Classic iris flower dataset
* **Wine** - Wine cultivar classification
* **Breast Cancer** - Cancer diagnosis features
* **Digits** - Handwritten digit pixels
* **Diabetes** - Disease progression features

These are available in the "Test Scenarios" section of the Open dialog.

Best Practices
--------------

1. **Save often** - VectorScope data is in-memory only
2. **Name descriptively** - Include data source and date
3. **Save before experiments** - Easy to roll back
4. **Backup scenario files** - They're just JSON + NPZ
5. **Version control** - Session files work well with git
