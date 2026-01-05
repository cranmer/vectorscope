Building and Releasing
======================

This guide covers building VectorScope for PyPI distribution.

Building for PyPI
-----------------

To build a release package:

.. code-block:: bash

   # Build frontend and create wheel
   ./scripts/build_package.sh

   # The wheel will be in dist/
   ls dist/*.whl

The build script:

1. Builds the frontend with ``npm run build``
2. Copies the frontend dist to ``frontend_dist/``
3. Builds the Python wheel with hatch

Uploading to PyPI
-----------------

Upload requires `twine <https://twine.readthedocs.io/>`_ and PyPI credentials:

.. code-block:: bash

   # Install twine if needed
   pip install twine

   # Upload to PyPI
   twine upload dist/*.whl

   # Or upload to TestPyPI first
   twine upload --repository testpypi dist/*.whl

Version Bumping
---------------

Update the version in these files before releasing:

1. ``pyproject.toml`` - ``version = "x.y.z"``
2. ``docs/conf.py`` - ``release = "x.y.z"``
3. ``RELEASE_NOTES.md`` - Add new version section

Then build and upload:

.. code-block:: bash

   # Build new version
   ./scripts/build_package.sh

   # Tag the release
   git tag vx.y.z
   git push origin vx.y.z

   # Upload to PyPI
   twine upload dist/*.whl

Package Contents
----------------

The PyPI wheel includes:

* ``backend/`` - Python backend (FastAPI app, services, models)
* ``frontend_dist/`` - Built frontend assets (HTML, JS, CSS)
* ``scenarios/`` - Example saved sessions

The ``vectorscope`` CLI command starts the server which serves both the
backend API and frontend UI from a single process.
