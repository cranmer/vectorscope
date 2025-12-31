API Reference
=============

REST API Endpoints
------------------

Layers
^^^^^^

.. list-table::
   :header-rows: 1
   :widths: 30 10 60

   * - Endpoint
     - Method
     - Description
   * - ``/layers``
     - GET
     - List all layers
   * - ``/layers/{id}``
     - GET
     - Get layer by ID
   * - ``/layers/{id}``
     - PATCH
     - Update layer (name, column config)
   * - ``/layers/{id}/points``
     - GET
     - Get all points in a layer
   * - ``/layers/upload``
     - POST
     - Upload CSV, NPY, or NPZ file
   * - ``/layers/synthetic``
     - POST
     - Generate synthetic data
   * - ``/layers/sklearn-datasets``
     - GET
     - List available sklearn datasets
   * - ``/layers/sklearn/{name}``
     - POST
     - Load sklearn dataset

Projections
^^^^^^^^^^^

.. list-table::
   :header-rows: 1
   :widths: 30 10 60

   * - Endpoint
     - Method
     - Description
   * - ``/projections``
     - GET
     - List all projections
   * - ``/projections``
     - POST
     - Create new projection
   * - ``/projections/{id}``
     - GET
     - Get projection by ID
   * - ``/projections/{id}``
     - PATCH
     - Update projection parameters
   * - ``/projections/{id}/coordinates``
     - GET
     - Get 2D coordinates

Transformations
^^^^^^^^^^^^^^^

.. list-table::
   :header-rows: 1
   :widths: 30 10 60

   * - Endpoint
     - Method
     - Description
   * - ``/transformations``
     - GET
     - List all transformations
   * - ``/transformations``
     - POST
     - Create new transformation
   * - ``/transformations/{id}``
     - GET
     - Get transformation by ID
   * - ``/transformations/{id}``
     - PATCH
     - Update transformation parameters

Scenarios
^^^^^^^^^

.. list-table::
   :header-rows: 1
   :widths: 30 10 60

   * - Endpoint
     - Method
     - Description
   * - ``/scenarios``
     - GET
     - List built-in scenarios
   * - ``/scenarios/status``
     - GET
     - Get loading status
   * - ``/scenarios/data``
     - DELETE
     - Clear all data
   * - ``/scenarios/saved``
     - GET
     - List saved sessions
   * - ``/scenarios/save``
     - POST
     - Save current state
   * - ``/scenarios/load/{name}``
     - POST
     - Load saved session
   * - ``/scenarios/upload``
     - POST
     - Upload session files

Python API
----------

See the auto-generated documentation in :doc:`../api/backend`.

TypeScript API
--------------

See the frontend documentation in :doc:`../api/frontend`.
