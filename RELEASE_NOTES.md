# VectorScope Release Notes

## v1.1.0 (2025-01-03)

### Documentation Updates
- **New Example Walkthrough**: Added comprehensive walkthrough for the Custom Axes example (`docs/user_guide/example_custom_axes.rst`)
- **Playwright Documentation**: Added developer guide for automated screenshots and testing (`docs/developer_guide/testing_and_screenshots.rst`)
- **Updated Screenshots**: Refreshed all UI screenshots with current interface
- **New 3D Screenshots**: Added screenshots for PCA 3D and Direct Axes 3D views
- **Quickstart Improvements**: Updated transformation example to use PCA (showing explained variance) instead of Scaling
- **Copyright Update**: Updated copyright to 2025, Kyle Cranmer

### Screenshot Automation
- Enhanced `scripts/capture_screenshots.py` with:
  - API-based session loading for reliability
  - Command-line argument parsing (`--type all|basic|custom_axes|3d`)
  - Custom axes example screenshots
  - 3D view screenshots

---

## v0.5.1-custom-axes-3d (2025-01-03)

### New Features
- **Custom Axes 3D View**: New projection type that requires 3 user-defined axes for X, Y, Z coordinates
  - Separate from 2D Custom Axes (which remains 2-axis only)
  - Available in Graph Editor under "3D" category
  - Supports oblique and affine projection modes
  - 3D axis arrows rendered in scatter plot

- **3D Custom Affine Transformation**: Extended Custom Affine to support 3 axes
  - Optional third axis for 3D change of basis
  - Creates derived layers with semantic 3D coordinates

### Documentation
- Added Custom Axes 3D to projections documentation
- Added 3D Custom Affine section to transformations documentation
- Added example-custom-axes saved scenario

---

## v0.5.0-custom-axes (2025-01-02)

### Major Features

#### Custom Axes View
- **User-defined projection axes**: Project data onto semantically meaningful directions
- **Barycenter-based axes**: Create axes from class centroid differences
- **Projection modes**:
  - **Oblique**: Projects onto closest point in the axis plane
  - **Affine**: Exact change of basis coefficients
- **Axis visualization**: Arrows showing custom axis directions in scatter plots
- **Flip options**: Negate axis directions for better visualization
- **Center point selection**: Choose origin (mean or specific barycenter)

#### Custom Affine Transformation
- **Change of basis transformation**: Replace standard basis with custom axes
- **N-dimensional output**: Full dimensionality preserved (not just 2D)
- **Derived layers**: Creates new layer with transformed coordinates
- **Configurable center**: Use mean or specific point as origin

### Improvements
- Auto-select newly added transformations in graph editor
- Delete transformation feature in graph editor
- Filter custom axes by source layer in configuration panels
- View editor auto-selects correct layer when opened from graph
- Fixed scenario upload to preserve selections and custom axes

### Bug Fixes
- Fixed center point dropdown to show barycenters correctly
- Fixed scenario save by filtering internal parameters
- Fixed flip toggle styling consistency

---

## v0.4.x Series

### v0.4.1-custom-axes
- Initial custom axes implementation
- Basic axis creation from point pairs
- Simple projection onto custom directions

### Earlier Versions
See git history for changes in v0.4.0 and earlier releases.

---

## Upgrade Notes

### From v0.4.x to v0.5.x
- Custom Axes views now support projection modes (oblique/affine)
- Saved sessions from v0.4.x should load correctly
- New `custom_axes_3d` view type is separate from `custom_axes`

### From v0.5.0 to v0.5.1
- `custom_axes` view remains 2D only
- Use `custom_axes_3d` for 3D visualizations with 3 axes
- Graph Editor now shows 3D views in separate category

---

## Known Issues
- Autodoc warnings in Sphinx build (backend module path issue)
- t-SNE may produce different results on each run (use saved random_seed for reproducibility)

---

## Contributors
- **Kyle Cranmer** - Concept and direction
- **Claude Code** - Implementation (Anthropic's AI coding assistant)
