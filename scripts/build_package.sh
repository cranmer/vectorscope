#!/bin/bash
# Build script for VectorScope PyPI package
# This script builds the frontend and creates the Python wheel

set -e

echo "=== Building VectorScope Package ==="

# Check we're in the right directory
if [ ! -f "pyproject.toml" ]; then
    echo "Error: Run this script from the project root directory"
    exit 1
fi

# Step 1: Build frontend
echo "Building frontend..."
cd frontend
npm install
npm run build
cd ..

# Step 2: Copy frontend dist to package location
echo "Copying frontend build to frontend_dist..."
rm -rf frontend_dist/assets frontend_dist/index.html frontend_dist/*.svg
cp -r frontend/dist/* frontend_dist/

# Step 3: Build Python wheel
echo "Building Python wheel..."
python -m build --wheel

echo ""
echo "=== Build Complete ==="
echo "Wheel file: dist/vectorscope-*.whl"
echo ""
echo "To upload to PyPI:"
echo "  twine upload dist/vectorscope-*.whl"
