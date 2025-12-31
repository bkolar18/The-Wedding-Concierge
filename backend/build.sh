#!/usr/bin/env bash
# Build script for Render deployment

# Install Python dependencies
pip install -r requirements.txt

# Install Playwright Chromium browser
# Note: deps installation may fail (requires root) but browser binaries will download
# We continue anyway since Render may have the required system libs
playwright install chromium || true

echo "Build completed"
