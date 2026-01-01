#!/usr/bin/env python3
"""Capture screenshots of VectorScope UI for documentation."""

import asyncio
from pathlib import Path
from playwright.async_api import async_playwright

SCREENSHOTS_DIR = Path(__file__).parent.parent / "docs" / "_static" / "images"
BASE_URL = "http://localhost:5173"


async def close_modal(page):
    """Close any open modal by clicking outside or pressing Escape."""
    try:
        await page.keyboard.press("Escape")
        await page.wait_for_timeout(300)
    except:
        pass


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

        # Add a PCA view first
        try:
            await page.click("button[title='Add view']", timeout=5000)
            await page.wait_for_timeout(500)
            await page.click("button:has-text('PCA')", timeout=5000)
            await page.wait_for_timeout(2000)
            await close_modal(page)
        except Exception as e:
            print(f"Note: Could not add PCA view: {e}")
            await close_modal(page)

        # Add a t-SNE view
        try:
            await page.click("text=Iris >> nth=0", timeout=3000)
            await page.wait_for_timeout(500)
            await page.click("button[title='Add view']", timeout=5000)
            await page.wait_for_timeout(500)
            await page.click("button:has-text('t-SNE')", timeout=5000)
            await page.wait_for_timeout(3000)
            await close_modal(page)

            # Screenshot 3: Graph with t-SNE view added
            await page.screenshot(path=SCREENSHOTS_DIR / "graph_with_view.png")
            print("Captured: graph_with_view.png")
        except Exception as e:
            print(f"Note: Could not add t-SNE view: {e}")
            await close_modal(page)

        # Add a transformation
        try:
            await page.click("text=Iris >> nth=0", timeout=3000)
            await page.wait_for_timeout(500)
            await page.click("button[title='Add transformation']", timeout=5000)
            await page.wait_for_timeout(500)
            await page.click("button:has-text('Scaling')", timeout=5000)
            await page.wait_for_timeout(2000)
            await close_modal(page)

            # Screenshot 4: Graph with transformation added
            await page.screenshot(path=SCREENSHOTS_DIR / "graph_with_transformation.png")
            print("Captured: graph_with_transformation.png")
        except Exception as e:
            print(f"Note: Could not add transformation: {e}")
            await close_modal(page)

        # Switch to View Editor and select the t-SNE view to show scatter plot
        try:
            await close_modal(page)
            await page.click("button:has-text('View Editor')", timeout=5000)
            await page.wait_for_timeout(1000)

            # Select t-SNE view
            found = await select_view_in_dropdown(page, "tsne")
            if not found:
                found = await select_view_in_dropdown(page, "pca")

            # Screenshot 5: View editor with scatter plot
            await page.screenshot(path=SCREENSHOTS_DIR / "view_editor.png")
            print("Captured: view_editor.png")
        except Exception as e:
            print(f"Note: Could not switch to view editor: {e}")

        # Switch to Viewports and show PCA and t-SNE side by side
        try:
            await page.click("button:has-text('Viewports')", timeout=5000)
            await page.wait_for_timeout(1000)

            # Add a second viewport
            await page.click("button:has-text('Add Viewport')", timeout=5000)
            await page.wait_for_timeout(500)

            # Select PCA for first viewport
            selects = await page.query_selector_all("select")
            if len(selects) >= 1:
                options = await selects[0].query_selector_all("option")
                for i, opt in enumerate(options):
                    text = await opt.text_content()
                    if "pca" in text.lower():
                        await selects[0].select_option(index=i)
                        await page.wait_for_timeout(500)
                        break

            # Select t-SNE for second viewport
            selects = await page.query_selector_all("select")
            if len(selects) >= 2:
                options = await selects[1].query_selector_all("option")
                for i, opt in enumerate(options):
                    text = await opt.text_content()
                    if "tsne" in text.lower() or "t-sne" in text.lower():
                        await selects[1].select_option(index=i)
                        await page.wait_for_timeout(500)
                        break

            await page.wait_for_timeout(2000)

            # Screenshot 6: Viewports with PCA and t-SNE
            await page.screenshot(path=SCREENSHOTS_DIR / "viewports.png")
            print("Captured: viewports.png")
        except Exception as e:
            print(f"Note: Could not set up viewports: {e}")

        # Screenshot 7: Histograms - click the "Histograms" button in Viewports
        try:
            await page.click("button:has-text('Histograms')", timeout=5000)
            await page.wait_for_timeout(2000)

            await page.screenshot(path=SCREENSHOTS_DIR / "histogram_view.png")
            print("Captured: histogram_view.png")
        except Exception as e:
            print(f"Note: Could not capture histogram view: {e}")

        # Screenshot 8: Box Plots - click the "Box Plots" button in Viewports
        try:
            await page.click("button:has-text('Box Plots')", timeout=5000)
            await page.wait_for_timeout(2000)

            await page.screenshot(path=SCREENSHOTS_DIR / "boxplot_view.png")
            print("Captured: boxplot_view.png")
        except Exception as e:
            print(f"Note: Could not capture box plot view: {e}")

        await browser.close()
        print(f"\nScreenshots saved to: {SCREENSHOTS_DIR}")


if __name__ == "__main__":
    asyncio.run(capture_screenshots())
