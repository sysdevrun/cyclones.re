#!/bin/bash

# Get the absolute path of the script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
IMAGE_FETCH_SCRIPT="$SCRIPT_DIR/fetch_image.ts"
API_FETCH_SCRIPT="$SCRIPT_DIR/meteo-france-api/fetch_api.ts"

echo "Setting up hourly cron jobs for weather data fetching..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed"
    echo "Please install Node.js first"
    exit 1
fi

# Check if npx is installed
if ! command -v npx &> /dev/null; then
    echo "Error: npx is not installed"
    echo "Please install Node.js with npm"
    exit 1
fi

# Make fetch scripts executable
chmod +x "$IMAGE_FETCH_SCRIPT"
chmod +x "$API_FETCH_SCRIPT"

# Get npx path
NPX_PATH=$(command -v npx)

# Cron jobs definitions (using npx tsx for compatibility)
IMAGE_CRON_JOB="0 * * * * cd $SCRIPT_DIR && $NPX_PATH tsx $IMAGE_FETCH_SCRIPT >> $SCRIPT_DIR/fetch.log 2>&1"
API_CRON_JOB="0 * * * * cd $SCRIPT_DIR/meteo-france-api && $NPX_PATH tsx $API_FETCH_SCRIPT >> $SCRIPT_DIR/meteo-france-api/fetch_api.log 2>&1"

# Setup image fetch cron job
echo ""
echo "=== Image Fetch Cron Job ==="
if crontab -l 2>/dev/null | grep -F "$IMAGE_FETCH_SCRIPT" >/dev/null 2>&1; then
    echo "Image fetch cron job already exists!"
    crontab -l | grep -F "$IMAGE_FETCH_SCRIPT"
else
    (crontab -l 2>/dev/null; echo "$IMAGE_CRON_JOB") | crontab -
    echo "Image fetch cron job added successfully!"
    echo "Logs: $SCRIPT_DIR/fetch.log"
fi

# Setup API fetch cron job
echo ""
echo "=== API Fetch Cron Job ==="
if crontab -l 2>/dev/null | grep -F "$API_FETCH_SCRIPT" >/dev/null 2>&1; then
    echo "API fetch cron job already exists!"
    crontab -l | grep -F "$API_FETCH_SCRIPT"
else
    (crontab -l 2>/dev/null; echo "$API_CRON_JOB") | crontab -
    echo "API fetch cron job added successfully!"
    echo "Logs: $SCRIPT_DIR/meteo-france-api/fetch_api.log"
fi

echo ""
echo "Both scripts will run every hour at minute 0"
echo ""
echo "To view current crontab: crontab -l"
echo "To remove cron jobs: crontab -e (and delete the lines)"
echo ""
echo "Running fetch scripts once now to test..."
echo ""
echo "=== Testing Image Fetch ==="
cd "$SCRIPT_DIR" && npx tsx "$IMAGE_FETCH_SCRIPT"
echo ""
echo "=== Testing API Fetch ==="
cd "$SCRIPT_DIR/meteo-france-api" && npx tsx "$API_FETCH_SCRIPT"
