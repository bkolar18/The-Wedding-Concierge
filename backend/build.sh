#!/usr/bin/env bash
# Build script for Render deployment

set -o errexit

# Install Python dependencies
pip install -r requirements.txt

# Install Playwright Chromium browser only (no system deps - Render handles those)
playwright install chromium
