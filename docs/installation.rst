Installation
============

There are two ways to install VectorScope:

1. **PyPI install** - Quick installation with full UI (recommended for users)
2. **Development install** - For contributing or modifying VectorScope

Option 1: Install from PyPI (Recommended)
-----------------------------------------

Install VectorScope with pip:

.. code-block:: bash

   pip install vectorscope

This installs both the backend API and the frontend UI.

Running VectorScope
^^^^^^^^^^^^^^^^^^^

Start VectorScope with a single command:

.. code-block:: bash

   vectorscope

This starts the backend API server which also serves the frontend UI.
Open http://localhost:8000 in your browser to access the full VectorScope
interface - no separate frontend server needed.

**Command-line options:**

.. code-block:: bash

   vectorscope                  # Start at localhost:8000
   vectorscope --port 9000      # Use custom port
   vectorscope --host 0.0.0.0   # Listen on all interfaces
   vectorscope --reload         # Auto-reload on code changes (development)
   vectorscope --version        # Show version
   vectorscope --help           # Show all options

Verifying the Installation
^^^^^^^^^^^^^^^^^^^^^^^^^^

1. Start the server:

   .. code-block:: bash

      vectorscope

2. Open http://localhost:8000 in your browser

3. You should see the VectorScope interface with the logo and empty graph editor

4. Click **Load Dataset** and select **iris** to load sample data

5. The Iris dataset should appear as a layer node in the graph editor

If you see the interface and can load data, the installation is complete!

**Checking the API:**

You can also verify the API is running:

.. code-block:: bash

   curl http://localhost:8000/health
   # Should return: {"status":"healthy"}

   curl http://localhost:8000/api
   # Should return: {"name":"VectorScope","version":"1.2.0",...}

Option 2: Development Installation
----------------------------------

For development or contributing to VectorScope, use a full source installation.

Prerequisites
^^^^^^^^^^^^^

* `Pixi <https://pixi.sh>`_ - Python package and environment manager
* Node.js 18 or later - for frontend development

**Installing Pixi**

On macOS/Linux:

.. code-block:: bash

   curl -fsSL https://pixi.sh/install.sh | bash

On Windows (PowerShell):

.. code-block:: powershell

   iwr -useb https://pixi.sh/install.ps1 | iex

**Installing Node.js**

Download from `nodejs.org <https://nodejs.org>`_ or use a version manager like nvm.

Installing from Source
^^^^^^^^^^^^^^^^^^^^^^

1. Clone the repository:

   .. code-block:: bash

      git clone https://github.com/cranmer/vectorscope.git
      cd vectorscope

2. Install Python dependencies with Pixi:

   .. code-block:: bash

      pixi install

   This creates a managed Python environment with all required packages.

3. Install frontend dependencies:

   .. code-block:: bash

      cd frontend
      npm install
      cd ..

Running in Development Mode
^^^^^^^^^^^^^^^^^^^^^^^^^^^

Development mode runs the backend and frontend separately, with hot-reloading:

.. code-block:: bash

   # Terminal 1: Start the backend with auto-reload
   pixi run uvicorn backend.main:app --reload --port 8000

   # Terminal 2: Start the frontend dev server
   cd frontend && npm run dev

Open http://localhost:5173 in your browser. The frontend dev server proxies
API requests to the backend automatically.

Running Tests
^^^^^^^^^^^^^

.. code-block:: bash

   # Run backend tests
   pixi run pytest backend/tests

   # Run with coverage
   pixi run pytest backend/tests --cov=backend

Building Documentation
^^^^^^^^^^^^^^^^^^^^^^

.. code-block:: bash

   pixi run sphinx-build -b html docs docs/_build/html

The documentation will be in ``docs/_build/html/``.

Building for PyPI
-----------------

To build a release package:

.. code-block:: bash

   # Build frontend and create wheel
   ./scripts/build_package.sh

   # The wheel will be in dist/
   ls dist/*.whl

   # Upload to PyPI (requires twine and PyPI credentials)
   twine upload dist/*.whl

Troubleshooting
---------------

**Port already in use:**

.. code-block:: bash

   # Find what's using the port
   lsof -i :8000

   # Use a different port
   vectorscope --port 8001

**Frontend not loading:**

If you see JSON instead of the UI at http://localhost:8000, the frontend
assets may not be installed correctly. Try reinstalling:

.. code-block:: bash

   pip uninstall vectorscope
   pip install vectorscope

**Import errors:**

Make sure you have Python 3.10 or later:

.. code-block:: bash

   python --version
   # Should be 3.10.x or higher

**Missing dependencies:**

.. code-block:: bash

   pip install vectorscope[dev]  # Install with dev dependencies
