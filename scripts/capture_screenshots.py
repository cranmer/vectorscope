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

        # Click on the Iris layer node (look for text containing "Iris")
        try:
            # Click on the node with "Iris" text
            await page.click("text=Iris >> nth=0", timeout=5000)
            await page.wait_for_timeout(500)
        except Exception as e:
            print(f"Note: Could not click layer node: {e}")
            # Try clicking on the react-flow pane to trigger selection
            try:
                await page.click(".react-flow__node >> nth=0", timeout=3000)
                await page.wait_for_timeout(500)
            except:
                pass

        # Add a t-SNE view
        try:
            # Find the view type select in the config panel and change to t-SNE
            # The select for view type should be visible when layer is selected
            selects = await page.query_selector_all("select")
            for select in selects:
                options = await select.query_selector_all("option")
                for opt in options:
                    text = await opt.text_content()
                    if "tsne" in text.lower() or "t-sne" in text.lower():
                        await select.select_option(label=text)
                        await page.wait_for_timeout(300)
                        break

            await page.click("text=Add View")
            await page.wait_for_timeout(3000)  # t-SNE takes longer

            # Screenshot 3: Graph with t-SNE view added
            await page.screenshot(path=SCREENSHOTS_DIR / "graph_with_view.png")
            print("Captured: graph_with_view.png")
        except Exception as e:
            print(f"Note: Could not add t-SNE view: {e}")

        # Add a transformation
        try:
            # Click on Iris layer again
            await page.click("text=Iris >> nth=0", timeout=3000)
            await page.wait_for_timeout(500)

            await page.click("text=Add Transformation")
            await page.wait_for_timeout(2000)

            # Screenshot 4: Graph with transformation added
            await page.screenshot(path=SCREENSHOTS_DIR / "graph_with_transformation.png")
            print("Captured: graph_with_transformation.png")
        except Exception as e:
            print(f"Note: Could not add transformation: {e}")

        # Switch to View Editor and select a view
        try:
            await page.click("text=View Editor")
            await page.wait_for_timeout(1000)

            # Find the view selector dropdown and select first view
            # Look for selects that might contain view options
            selects = await page.query_selector_all("select")
            for select in selects:
                options = await select.query_selector_all("option")
                if len(options) > 1:
                    # Check if this looks like a view selector
                    first_opt = await options[0].text_content()
                    if "view" in first_opt.lower() or "select" in first_opt.lower():
                        # Select the second option (first actual view)
                        await select.select_option(index=1)
                        await page.wait_for_timeout(2000)
                        break

            # Screenshot 5: View editor with scatter plot
            await page.screenshot(path=SCREENSHOTS_DIR / "view_editor.png")
            print("Captured: view_editor.png")
        except Exception as e:
            print(f"Note: Could not switch to view editor: {e}")

        # Switch to Viewports
        try:
            await page.click("text=Viewports")
            await page.wait_for_timeout(1000)

            # Add viewport
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

        await browser.close()
        print(f"\nScreenshots saved to: {SCREENSHOTS_DIR}")


if __name__ == "__main__":
    asyncio.run(capture_screenshots())
