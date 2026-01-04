Testing and Screenshots with Playwright
========================================

VectorScope uses `Playwright <https://playwright.dev/python/>`_ for automated browser testing
and programmatic screenshot capture for documentation.

Installation
------------

Playwright is included in the development dependencies. Install it with:

.. code-block:: bash

   pip install playwright
   playwright install chromium

Or if using pixi:

.. code-block:: bash

   pixi run playwright install chromium

Screenshot Capture Script
-------------------------

The ``scripts/capture_screenshots.py`` script automatically captures UI screenshots
for documentation. It runs in headless mode and interacts with the VectorScope
application via both the UI and the backend API.

Running the Script
^^^^^^^^^^^^^^^^^^

Before running the script, ensure both the backend and frontend are running:

.. code-block:: bash

   # Terminal 1: Start backend
   pixi run uvicorn backend.main:app --reload

   # Terminal 2: Start frontend
   cd frontend && npm run dev

Then run the screenshot script:

.. code-block:: bash

   # Capture all screenshots
   python scripts/capture_screenshots.py

   # Capture only basic UI screenshots
   python scripts/capture_screenshots.py --type basic

   # Capture custom axes example screenshots
   python scripts/capture_screenshots.py --type custom_axes

   # Capture 3D view screenshots
   python scripts/capture_screenshots.py --type 3d

Screenshot Types
^^^^^^^^^^^^^^^^

The script captures several categories of screenshots:

**Basic Screenshots** (``--type basic``):

- ``initial_state.png`` - Empty state with logo
- ``graph_editor.png`` - Graph editor with Iris dataset
- ``graph_with_view.png`` - Graph with t-SNE view added
- ``graph_with_transformation.png`` - Graph with scaling transformation
- ``view_editor.png`` - View editor showing scatter plot
- ``viewports.png`` - Two viewports with PCA and t-SNE
- ``density_view.png`` - Density distribution view
- ``boxplot_view.png`` - Box plot view
- ``violin_view.png`` - Violin plot view

**Custom Axes Screenshots** (``--type custom_axes``):

- ``custom_axes_graph.png`` - Graph editor showing custom axes setup
- ``custom_axes_viewports.png`` - Two viewports with custom axes views
- ``custom_axes_view_editor.png`` - View editor with custom axes configuration

**3D View Screenshots** (``--type 3d``):

- ``pca_3d_view.png`` - PCA 3D scatter plot
- ``direct_3d_view.png`` - Direct Axes 3D view

Script Architecture
^^^^^^^^^^^^^^^^^^^

The screenshot script uses several techniques for reliable automation:

1. **API-based Session Loading**: Instead of clicking through the UI to load
   saved sessions, the script uses the backend API directly:

   .. code-block:: python

      await page.evaluate("""async () => {
          const response = await fetch('http://localhost:8000/scenarios/load/example-custom-axes', {
              method: 'POST'
          });
          return await response.json();
      }""")

2. **Page Refresh**: After loading data via API, the page is refreshed to
   pick up the new state:

   .. code-block:: python

      await page.reload()
      await page.wait_for_timeout(3000)

3. **Element Selection**: Uses Playwright selectors to find and interact with
   UI elements:

   .. code-block:: python

      await page.click("button:has-text('Viewports')")
      await page.wait_for_selector("select")

4. **Dynamic Select Handling**: Iterates through select options to find
   specific views:

   .. code-block:: python

      all_selects = await page.query_selector_all("select")
      for select in all_selects:
          options = await select.query_selector_all("option")
          for i, opt in enumerate(options):
              text = await opt.text_content()
              if "pca" in text.lower():
                  await select.select_option(index=i)
                  break

Adding New Screenshots
^^^^^^^^^^^^^^^^^^^^^^

To add new screenshots:

1. Create a new async function in ``capture_screenshots.py``:

   .. code-block:: python

      async def capture_my_feature_screenshots():
          """Capture screenshots for my feature."""
          SCREENSHOTS_DIR.mkdir(parents=True, exist_ok=True)

          async with async_playwright() as p:
              browser = await p.chromium.launch(headless=True)
              page = await browser.new_page(viewport={"width": 1400, "height": 900})

              # Navigate and interact
              await page.goto(BASE_URL)
              # ... your interactions ...

              # Capture screenshot
              await page.screenshot(path=SCREENSHOTS_DIR / "my_feature.png")

              await browser.close()

2. Add the function to the ``main()`` dispatcher:

   .. code-block:: python

      async def main(capture_type="all"):
          if capture_type == "all":
              # ... existing ...
              await capture_my_feature_screenshots()
          elif capture_type == "my_feature":
              await capture_my_feature_screenshots()

3. Add the option to the argument parser:

   .. code-block:: python

      parser.add_argument(
          "--type",
          choices=["all", "basic", "custom_axes", "3d", "my_feature"],
          default="all",
      )

End-to-End Testing
------------------

Playwright can also be used for end-to-end testing. While VectorScope's test
suite primarily uses pytest for backend testing, Playwright enables full
integration tests.

Example Test Structure
^^^^^^^^^^^^^^^^^^^^^^

.. code-block:: python

   import pytest
   from playwright.async_api import async_playwright

   @pytest.fixture
   async def page():
       async with async_playwright() as p:
           browser = await p.chromium.launch(headless=True)
           page = await browser.new_page()
           yield page
           await browser.close()

   @pytest.mark.asyncio
   async def test_load_iris_dataset(page):
       await page.goto("http://localhost:5173")

       # Click Load Dataset
       await page.click("text=Load Dataset")
       await page.click("text=iris")

       # Wait for layer to appear
       await page.wait_for_selector("text=Iris")

       # Verify layer count
       stats = await page.text_content(".layer-stats")
       assert "150" in stats

Test Configuration
^^^^^^^^^^^^^^^^^^

For CI/CD integration, configure Playwright in ``pyproject.toml``:

.. code-block:: toml

   [tool.pytest.ini_options]
   asyncio_mode = "auto"

   [tool.playwright]
   browser = "chromium"
   headless = true

Best Practices
--------------

1. **Use Headless Mode**: Always run in headless mode for CI/CD and scripted
   execution.

2. **Wait for State**: Use explicit waits instead of fixed timeouts when possible:

   .. code-block:: python

      # Prefer this
      await page.wait_for_selector("text=Iris")

      # Over this
      await page.wait_for_timeout(2000)

3. **API Fallback**: When UI interactions are unreliable, use the backend API
   directly and then refresh the page.

4. **Screenshot on Failure**: Capture screenshots when tests fail for debugging:

   .. code-block:: python

      try:
          await some_interaction()
      except Exception as e:
          await page.screenshot(path="debug_failure.png")
          raise

5. **Clean State**: Start each test/capture with a clean state by clearing data:

   .. code-block:: bash

      curl -X DELETE http://localhost:8000/scenarios/data

Troubleshooting
---------------

**Dialog Not Opening**:
   If clicking a button doesn't open its dialog, try using JavaScript click:

   .. code-block:: python

      await page.evaluate("""() => {
          document.querySelector('button:has-text("Open")').click();
      }""")

**Element Not Found**:
   Increase timeouts or use more specific selectors:

   .. code-block:: python

      await page.wait_for_selector("button:has-text('Submit')", timeout=10000)

**Screenshots Blank or Wrong State**:
   Add explicit waits after actions:

   .. code-block:: python

      await page.click("button")
      await page.wait_for_timeout(1000)  # Allow state to settle
      await page.screenshot(...)
