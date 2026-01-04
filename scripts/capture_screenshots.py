#!/usr/bin/env python3
"""Capture screenshots of VectorScope UI for documentation."""

import asyncio
import argparse
from pathlib import Path
from playwright.async_api import async_playwright

SCREENSHOTS_DIR = Path(__file__).parent.parent / "docs" / "_static" / "images"
BASE_URL = "http://localhost:5173"


async def wait_for_loading(page, timeout=10000):
    """Wait for loading indicators to disappear."""
    try:
        await page.wait_for_selector("text=Loading", state="hidden", timeout=timeout)
    except:
        pass
    await page.wait_for_timeout(500)


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
            await page.wait_for_timeout(1000)

            # Get all viewport select dropdowns (exclude any other selects)
            # Look for selects that have "Select projection" option
            all_selects = await page.query_selector_all("select")
            viewport_selects = []
            for select in all_selects:
                inner_text = await select.inner_text()
                if "Select projection" in inner_text or "pca" in inner_text.lower() or "tsne" in inner_text.lower():
                    viewport_selects.append(select)

            print(f"Found {len(viewport_selects)} viewport selects")

            # Select PCA for first viewport (left)
            if len(viewport_selects) >= 1:
                options = await viewport_selects[0].query_selector_all("option")
                for i, opt in enumerate(options):
                    text = await opt.text_content()
                    if "pca" in text.lower():
                        await viewport_selects[0].select_option(index=i)
                        print(f"Selected PCA in viewport 1: {text}")
                        await page.wait_for_timeout(1000)
                        break

            # Select t-SNE for second viewport (right)
            if len(viewport_selects) >= 2:
                options = await viewport_selects[1].query_selector_all("option")
                for i, opt in enumerate(options):
                    text = await opt.text_content()
                    if "tsne" in text.lower() or "t-sne" in text.lower():
                        await viewport_selects[1].select_option(index=i)
                        print(f"Selected t-SNE in viewport 2: {text}")
                        await page.wait_for_timeout(1000)
                        break

            await page.wait_for_timeout(2000)

            # Screenshot 6: Viewports with PCA and t-SNE
            await page.screenshot(path=SCREENSHOTS_DIR / "viewports.png")
            print("Captured: viewports.png")
        except Exception as e:
            print(f"Note: Could not set up viewports: {e}")
            import traceback
            traceback.print_exc()

        # Screenshot 7: Density - click the "Density" button in Viewports
        try:
            await page.click("button:has-text('Density')", timeout=5000)
            await page.wait_for_timeout(2000)

            await page.screenshot(path=SCREENSHOTS_DIR / "density_view.png")
            print("Captured: density_view.png")
        except Exception as e:
            print(f"Note: Could not capture density view: {e}")

        # Screenshot 8: Box Plots - click the "Box Plots" button in Viewports
        try:
            await page.click("button:has-text('Box Plots')", timeout=5000)
            await page.wait_for_timeout(2000)

            await page.screenshot(path=SCREENSHOTS_DIR / "boxplot_view.png")
            print("Captured: boxplot_view.png")
        except Exception as e:
            print(f"Note: Could not capture box plot view: {e}")

        # Screenshot 9: Violin - click the "Violin" button in Viewports
        try:
            await page.click("button:has-text('Violin')", timeout=5000)
            await page.wait_for_timeout(2000)

            await page.screenshot(path=SCREENSHOTS_DIR / "violin_view.png")
            print("Captured: violin_view.png")
        except Exception as e:
            print(f"Note: Could not capture violin view: {e}")

        await browser.close()
        print(f"\nScreenshots saved to: {SCREENSHOTS_DIR}")


async def capture_custom_axes_screenshots(headless=True):
    """Capture screenshots for the Custom Axes example walkthrough."""
    SCREENSHOTS_DIR.mkdir(parents=True, exist_ok=True)

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=headless)
        page = await browser.new_page(viewport={"width": 1400, "height": 900})

        # Navigate to the app
        await page.goto(BASE_URL)
        await page.wait_for_timeout(2000)

        # Load the example-custom-axes scenario via API (more reliable than UI clicks)
        try:
            # Use fetch to load the session
            result = await page.evaluate("""async () => {
                const response = await fetch('http://localhost:8000/scenarios/load/example-custom-axes', {
                    method: 'POST'
                });
                return await response.json();
            }""")
            print(f"Loaded session via API: {result}")

            # Refresh the page to pick up the new state
            await page.reload()
            await page.wait_for_timeout(3000)
            await wait_for_loading(page)
            print("Loaded example-custom-axes scenario")
        except Exception as e:
            print(f"Error loading scenario: {e}")
            await browser.close()
            return

        # Screenshot: Graph Editor with custom axes setup
        await page.screenshot(path=SCREENSHOTS_DIR / "custom_axes_graph.png")
        print("Captured: custom_axes_graph.png")

        # Switch to Viewports mode
        try:
            await page.click("button:has-text('Viewports')", timeout=5000)
            await page.wait_for_timeout(1000)

            # Add a second viewport if needed
            viewports = await page.query_selector_all("[data-viewport]")
            if len(viewports) < 2:
                await page.click("button:has-text('Add Viewport')", timeout=5000)
                await page.wait_for_timeout(1000)

            # Get all viewport select dropdowns
            all_selects = await page.query_selector_all("select")
            viewport_selects = []
            for select in all_selects:
                inner_text = await select.inner_text()
                if "Select projection" in inner_text or "Axis" in inner_text or "Direct" in inner_text or "PCA" in inner_text:
                    viewport_selects.append(select)

            print(f"Found {len(viewport_selects)} viewport selects")

            # Select "Axis 1 vs Axis 2" for first viewport
            if len(viewport_selects) >= 1:
                options = await viewport_selects[0].query_selector_all("option")
                for i, opt in enumerate(options):
                    text = await opt.text_content()
                    if "Axis 1 vs Axis 2" in text:
                        await viewport_selects[0].select_option(index=i)
                        print(f"Selected in viewport 1: {text}")
                        await page.wait_for_timeout(1500)
                        break

            # Select "Direct Axes" from Iris_Custom Affine layer for second viewport
            if len(viewport_selects) >= 2:
                options = await viewport_selects[1].query_selector_all("option")
                for i, opt in enumerate(options):
                    text = await opt.text_content()
                    if "Direct Axes" in text and "Custom Affine" in text:
                        await viewport_selects[1].select_option(index=i)
                        print(f"Selected in viewport 2: {text}")
                        await page.wait_for_timeout(1500)
                        break

            await page.wait_for_timeout(2000)

            # Screenshot: Two viewports with custom axes views
            await page.screenshot(path=SCREENSHOTS_DIR / "custom_axes_viewports.png")
            print("Captured: custom_axes_viewports.png")

        except Exception as e:
            print(f"Error setting up viewports: {e}")
            import traceback
            traceback.print_exc()

        # Switch to View Editor for custom axes view
        try:
            await page.click("button:has-text('View Editor')", timeout=5000)
            await page.wait_for_timeout(1000)

            # Select the Axis 1 vs Axis 2 view
            found = await select_view_in_dropdown(page, "Axis 1 vs Axis 2")
            if found:
                await page.wait_for_timeout(2000)
                await page.screenshot(path=SCREENSHOTS_DIR / "custom_axes_view_editor.png")
                print("Captured: custom_axes_view_editor.png")
        except Exception as e:
            print(f"Error capturing view editor: {e}")

        await browser.close()
        print(f"\nCustom axes screenshots saved to: {SCREENSHOTS_DIR}")


async def capture_3d_screenshots():
    """Capture screenshots of 3D views."""
    SCREENSHOTS_DIR.mkdir(parents=True, exist_ok=True)

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={"width": 1400, "height": 900})

        # Navigate to the app
        await page.goto(BASE_URL)
        await page.wait_for_timeout(2000)

        # Load Iris dataset
        try:
            await page.click("text=Load Dataset")
            await page.wait_for_timeout(500)
            await page.click("text=iris")
            await page.wait_for_timeout(2500)
            await wait_for_loading(page)
        except Exception as e:
            print(f"Error loading iris: {e}")
            await browser.close()
            return

        # Click on Iris layer
        try:
            await page.click("text=Iris >> nth=0", timeout=5000)
            await page.wait_for_timeout(500)
        except Exception as e:
            print(f"Error clicking layer: {e}")

        # Add PCA 3D view
        try:
            await page.click("button[title='Add view']", timeout=5000)
            await page.wait_for_timeout(500)
            # Look for PCA 3D button
            await page.click("button:has-text('PCA 3D')", timeout=5000)
            await page.wait_for_timeout(3000)
            await close_modal(page)
            print("Added PCA 3D view")
        except Exception as e:
            print(f"Error adding PCA 3D: {e}")
            await close_modal(page)

        # Switch to View Editor
        try:
            await page.click("button:has-text('View Editor')", timeout=5000)
            await page.wait_for_timeout(1000)

            # Select PCA 3D view
            found = await select_view_in_dropdown(page, "PCA 3D")
            if found:
                await page.wait_for_timeout(2000)
                await page.screenshot(path=SCREENSHOTS_DIR / "pca_3d_view.png")
                print("Captured: pca_3d_view.png")
        except Exception as e:
            print(f"Error capturing PCA 3D: {e}")

        # Add Direct Axes 3D view
        try:
            await page.click("button:has-text('Graph Editor')", timeout=5000)
            await page.wait_for_timeout(500)
            await page.click("text=Iris >> nth=0", timeout=5000)
            await page.wait_for_timeout(500)

            await page.click("button[title='Add view']", timeout=5000)
            await page.wait_for_timeout(500)
            await page.click("button:has-text('Direct Axes 3D')", timeout=5000)
            await page.wait_for_timeout(3000)
            await close_modal(page)
            print("Added Direct Axes 3D view")

            # Switch to View Editor and capture
            await page.click("button:has-text('View Editor')", timeout=5000)
            await page.wait_for_timeout(1000)

            found = await select_view_in_dropdown(page, "Direct Axes 3D")
            if found:
                await page.wait_for_timeout(2000)
                await page.screenshot(path=SCREENSHOTS_DIR / "direct_3d_view.png")
                print("Captured: direct_3d_view.png")
        except Exception as e:
            print(f"Error capturing Direct Axes 3D: {e}")

        await browser.close()
        print(f"\n3D screenshots saved to: {SCREENSHOTS_DIR}")


async def main(capture_type="all"):
    """Main entry point for screenshot capture."""
    if capture_type == "all":
        await capture_screenshots()
        await capture_custom_axes_screenshots()
        await capture_3d_screenshots()
    elif capture_type == "basic":
        await capture_screenshots()
    elif capture_type == "custom_axes":
        await capture_custom_axes_screenshots()
    elif capture_type == "3d":
        await capture_3d_screenshots()
    else:
        print(f"Unknown capture type: {capture_type}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Capture VectorScope screenshots")
    parser.add_argument(
        "--type",
        choices=["all", "basic", "custom_axes", "3d"],
        default="all",
        help="Type of screenshots to capture"
    )
    args = parser.parse_args()
    asyncio.run(main(args.type))
