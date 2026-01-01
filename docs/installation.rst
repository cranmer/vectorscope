Installation
============

There are two ways to install VectorScope:

1. **PyPI install** - Install the backend package only (for API usage)
2. **Development install** - Full installation with frontend UI

Option 1: Install from PyPI
---------------------------

Install the backend package:

.. code-block:: bash

   pip install vectorscope

Run the server:

.. code-block:: bash

   uvicorn backend.main:app --port 8000

.. note::

   The PyPI package includes the backend API only. For the full interactive UI,
   use the development installation below.

Option 2: Development Installation
----------------------------------

Prerequisites
^^^^^^^^^^^^^

* `Pixi <https://pixi.sh>`_ - Python package and environment manager
* Node.js 18 or later - for the frontend

**Installing Pixi**

On macOS/Linux:

.. code-block:: bash

   curl -fsSL https://pixi.sh/install.sh | bash

On Windows (PowerShell):

.. code-block:: powershell

   iwr -useb https://pixi.sh/install.ps1 | iex

**Installing Node.js**

Download from `nodejs.org <https://nodejs.org>`_ or use a version manager like nvm.

Installing VectorScope
^^^^^^^^^^^^^^^^^^^^^^

1. Clone the repository:

.. code-block:: bash

   git clone https://github.com/cranmer/vectorscope.git
   cd vectorscope

2. Install Python dependencies with Pixi:

.. code-block:: bash

   pixi install

This creates a managed Python environment with all required packages (FastAPI, NumPy, scikit-learn, etc.).

3. Install frontend dependencies:

.. code-block:: bash

   cd frontend
   npm install
   cd ..

Verifying Installation
----------------------

Test that everything is working:

.. code-block:: bash

   # Start the backend (in one terminal)
   pixi run backend

   # Start the frontend (in another terminal)
   cd frontend && npm run dev

Open http://localhost:5173 in your browser. You should see the VectorScope interface.

Development Installation
------------------------

For development, you may also want to install:

* Sphinx (for documentation)
* pytest (for testing)

These are included in the Pixi environment:

.. code-block:: bash

   pixi run test-backend  # Run backend tests
   cd docs && make html   # Build documentation
