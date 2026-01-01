#!/usr/bin/env python3
"""Capture screenshots of VectorScope UI for documentation."""

import asyncio
from pathlib import Path
from playwright.async_api import async_playwright

SCREENSHOTS_DIR = Path(__file__).parent.parent / "docs" / "_static" / "images"
BASE_URL = "http://localhost:5173"


async def capture_screenshots():
    """Capture screenshots of key UI states."""
    SCREENSHOTS_DIR.mkdir(parents=True, exist_ok=True)

    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page(viewport={"width": 1400, "height": 900})

        # Navigate to the app
        await page.goto(BASE_URL)
        await page.wait_for_timeout(2000)

        # Screenshot 1: Initial empty state with logo
        await page.screenshot(path=SCREENSHOTS_DIR / "01_initial_state.png")
        print("Captured: 01_initial_state.png")

        # Load Iris dataset
        try:
            await page.click("button:has-text('Load Dataset')")
            await page.wait_for_timeout(500)
            await page.click("button:has-text('iris')")
            await page.wait_for_timeout(2000)

            # Screenshot 2: Graph editor with Iris dataset
            await page.screenshot(path=SCREENSHOTS_DIR / "02_graph_editor_iris.png")
            print("Captured: 02_graph_editor_iris.png")
        except Exception as e:
            print(f"Note: Could not load iris dataset: {e}")

        # Click on the layer node (the green one)
        try:
            await page.click("div[data-id]:has(div:has-text('Iris'))", timeout=3000)
            await page.wait_for_timeout(500)
            await page.screenshot(path=SCREENSHOTS_DIR / "03_layer_selected.png")
            print("Captured: 03_layer_selected.png")
        except Exception as e:
            print(f"Note: Could not click layer node: {e}")

        # Add a PCA view from the layer config
        try:
            await page.click("button:has-text('Add View')")
            await page.wait_for_timeout(1500)
            await page.screenshot(path=SCREENSHOTS_DIR / "04_view_added.png")
            print("Captured: 04_view_added.png")
        except Exception as e:
            print(f"Note: Could not add view: {e}")

        # Add a transformation
        try:
            await page.click("button:has-text('Add Transformation')")
            await page.wait_for_timeout(1500)
            await page.screenshot(path=SCREENSHOTS_DIR / "05_transformation_added.png")
            print("Captured: 05_transformation_added.png")
        except Exception as e:
            print(f"Note: Could not add transformation: {e}")

        # Click on transformation node to show config with sliders
        try:
            await page.click("div[data-id]:has(div:has-text('scaling'))", timeout=3000)
            await page.wait_for_timeout(500)
            await page.screenshot(path=SCREENSHOTS_DIR / "06_scaling_config.png")
            print("Captured: 06_scaling_config.png")
        except Exception as e:
            print(f"Note: Could not show scaling config: {e}")

        # Switch to View Editor
        try:
            await page.click("button:has-text('View Editor')")
            await page.wait_for_timeout(1000)

            # Select a view from dropdown
            await page.select_option("select", index=1)
            await page.wait_for_timeout(1500)
            await page.screenshot(path=SCREENSHOTS_DIR / "07_view_editor.png")
            print("Captured: 07_view_editor.png")
        except Exception as e:
            print(f"Note: Could not switch to view editor: {e}")

        # Switch to Viewports and add multiple views
        try:
            await page.click("button:has-text('Viewports')")
            await page.wait_for_timeout(1000)

            # Add a viewport
            await page.click("button:has-text('Add Viewport')")
            await page.wait_for_timeout(500)

            # Select a projection for the viewport
            selects = await page.query_selector_all("select")
            if len(selects) > 0:
                await selects[0].select_option(index=1)
            await page.wait_for_timeout(1000)

            await page.screenshot(path=SCREENSHOTS_DIR / "08_viewports.png")
            print("Captured: 08_viewports.png")
        except Exception as e:
            print(f"Note: Could not set up viewports: {e}")

        # Go back to graph and show a more complex graph
        try:
            await page.click("button:has-text('Graph Editor')")
            await page.wait_for_timeout(500)

            # Click on the derived layer
            await page.click("div[data-id]:has(div:has-text('scaled'))", timeout=3000)
            await page.wait_for_timeout(500)

            # Add another view to this layer
            await page.click("button:has-text('Add View')")
            await page.wait_for_timeout(1500)

            await page.screenshot(path=SCREENSHOTS_DIR / "09_complex_graph.png")
            print("Captured: 09_complex_graph.png")
        except Exception as e:
            print(f"Note: Could not create complex graph: {e}")

        await browser.close()
        print(f"\nScreenshots saved to: {SCREENSHOTS_DIR}")


if __name__ == "__main__":
    asyncio.run(capture_screenshots())
