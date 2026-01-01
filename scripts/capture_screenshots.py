#!/usr/bin/env python3
"""Capture screenshots of VectorScope UI for documentation."""

import asyncio
from pathlib import Path
from playwright.async_api import async_playwright

SCREENSHOTS_DIR = Path(__file__).parent.parent / "docs" / "_static" / "images"
BASE_URL = "http://localhost:5173"


async def select_view_in_dropdown(page, view_name_contains):
    """Helper to select a view from the view dropdown by partial name match."""
    selects = await page.query_selector_all("select")
    for select in selects:
        options = await select.query_selector_all("option")
        for i, opt in enumerate(options):
            text = await opt.text_content()
            if view_name_contains.lower() in text.lower():
                await select.select_option(index=i)
                await page.wait_for_timeout(2000)
                return True
    return False


async def capture_screenshots():
    """Capture screenshots of key UI states."""
    SCREENSHOTS_DIR.mkdir(parents=True, exist_ok=True)

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={"width": 1400, "height": 900})

        # Navigate to the app
        await page.goto(BASE_URL)
        await page.wait_for_timeout(2000)

        # Screenshot 1: Initial empty state with logo
        await page.screenshot(path=SCREENSHOTS_DIR / "initial_state.png")
        print("Captured: initial_state.png")

        # Load Iris dataset
        try:
            await page.click("text=Load Dataset")
            await page.wait_for_timeout(500)
            await page.click("text=iris")
            await page.wait_for_timeout(2500)

            # Screenshot 2: Graph editor with Iris dataset
            await page.screenshot(path=SCREENSHOTS_DIR / "graph_editor.png")
            print("Captured: graph_editor.png")
        except Exception as e:
            print(f"Note: Could not load iris dataset: {e}")

        # Click on the Iris layer node to select it
        try:
            await page.click("text=Iris >> nth=0", timeout=5000)
            await page.wait_for_timeout(500)
        except Exception as e:
            print(f"Note: Could not click layer node: {e}")
            try:
                await page.click(".react-flow__node >> nth=0", timeout=3000)
                await page.wait_for_timeout(500)
            except:
                pass

        # Add a t-SNE view by clicking the "+" button and selecting t-SNE from modal
        try:
            await page.click("button[title='Add view']", timeout=5000)
            await page.wait_for_timeout(500)
            await page.click("text=t-SNE >> nth=0", timeout=5000)
            await page.wait_for_timeout(3000)

            # Screenshot 3: Graph with t-SNE view added
            await page.screenshot(path=SCREENSHOTS_DIR / "graph_with_view.png")
            print("Captured: graph_with_view.png")
        except Exception as e:
            print(f"Note: Could not add t-SNE view: {e}")

        # Add a transformation
        try:
            await page.click("text=Iris >> nth=0", timeout=3000)
            await page.wait_for_timeout(500)
            await page.click("button[title='Add transformation']", timeout=5000)
            await page.wait_for_timeout(500)
            await page.click("text=Scaling", timeout=5000)
            await page.wait_for_timeout(2000)

            # Screenshot 4: Graph with transformation added
            await page.screenshot(path=SCREENSHOTS_DIR / "graph_with_transformation.png")
            print("Captured: graph_with_transformation.png")
        except Exception as e:
            print(f"Note: Could not add transformation: {e}")

        # Switch to View Editor and select the t-SNE view to show scatter plot
        try:
            await page.click("text=View Editor")
            await page.wait_for_timeout(1000)

            # Select a view that shows data (the t-SNE view we just created)
            # Try to find the view dropdown and select the first actual view
            found = await select_view_in_dropdown(page, "tsne")
            if not found:
                found = await select_view_in_dropdown(page, "pca")
            if not found:
                # Try selecting index 1 from first dropdown that has options
                selects = await page.query_selector_all("select")
                for select in selects:
                    options = await select.query_selector_all("option")
                    if len(options) > 1:
                        await select.select_option(index=1)
                        await page.wait_for_timeout(2000)
                        break

            # Screenshot 5: View editor with scatter plot
            await page.screenshot(path=SCREENSHOTS_DIR / "view_editor.png")
            print("Captured: view_editor.png")
        except Exception as e:
            print(f"Note: Could not switch to view editor: {e}")

        # Switch to Viewports and show t-SNE view
        try:
            await page.click("text=Viewports")
            await page.wait_for_timeout(1000)

            # Add viewport and select a projection
            await page.click("text=Add Viewport")
            await page.wait_for_timeout(500)

            # Select projections for viewports
            selects = await page.query_selector_all("select")
            for i, select in enumerate(selects[:2]):
                options = await select.query_selector_all("option")
                if len(options) > 1:
                    await select.select_option(index=min(i + 1, len(options) - 1))
                    await page.wait_for_timeout(500)

            await page.wait_for_timeout(2000)

            # Screenshot 6: Viewports
            await page.screenshot(path=SCREENSHOTS_DIR / "viewports.png")
            print("Captured: viewports.png")
        except Exception as e:
            print(f"Note: Could not set up viewports: {e}")

        # Add Histogram view and show it in Viewports mode
        try:
            await page.click("text=Graph Editor")
            await page.wait_for_timeout(1000)

            await page.click("text=Iris >> nth=0", timeout=3000)
            await page.wait_for_timeout(500)

            await page.click("button[title='Add view']", timeout=5000)
            await page.wait_for_timeout(500)
            await page.click("text=Histogram", timeout=5000)
            await page.wait_for_timeout(2000)

            # Switch to Viewports and select histogram view
            await page.click("text=Viewports")
            await page.wait_for_timeout(1000)

            # Find and select the histogram view in a viewport
            found = await select_view_in_dropdown(page, "histogram")
            await page.wait_for_timeout(2000)

            # Screenshot 7: Histogram view in Viewports mode
            await page.screenshot(path=SCREENSHOTS_DIR / "histogram_view.png")
            print("Captured: histogram_view.png")
        except Exception as e:
            print(f"Note: Could not capture histogram view: {e}")

        # Add Box Plot view and show it in Viewports mode
        try:
            await page.click("text=Graph Editor")
            await page.wait_for_timeout(1000)

            await page.click("text=Iris >> nth=0", timeout=3000)
            await page.wait_for_timeout(500)

            await page.click("button[title='Add view']", timeout=5000)
            await page.wait_for_timeout(500)
            await page.click("text=Box Plot", timeout=5000)
            await page.wait_for_timeout(2000)

            # Switch to Viewports and select box plot view
            await page.click("text=Viewports")
            await page.wait_for_timeout(1000)

            # Find and select the box plot view in a viewport
            found = await select_view_in_dropdown(page, "box")
            await page.wait_for_timeout(2000)

            # Screenshot 8: Box Plot view in Viewports mode
            await page.screenshot(path=SCREENSHOTS_DIR / "boxplot_view.png")
            print("Captured: boxplot_view.png")
        except Exception as e:
            print(f"Note: Could not capture box plot view: {e}")

        await browser.close()
        print(f"\nScreenshots saved to: {SCREENSHOTS_DIR}")


if __name__ == "__main__":
    asyncio.run(capture_screenshots())
