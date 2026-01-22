#!/bin/bash

# Get the absolute path of the script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
IMAGE_FETCH_SCRIPT="$SCRIPT_DIR/fetch_image.ts"
API_FETCH_SCRIPT="$SCRIPT_DIR/meteo-france-api/fetch_api.ts"
BACKUP_SCRIPT="$SCRIPT_DIR/meteo-france-api/backup_to_s3.sh"

# Node.js 22 paths (explicit for cron compatibility)
NODE_PATH="/home/chtitux/.nvm/versions/node/v22.18.0/bin/node"
NPX_PATH="/home/chtitux/.nvm/versions/node/v22.18.0/bin/npx"

echo "Setting up hourly cron jobs for weather data fetching..."

# Check if Node.js 22 is installed at the expected path
if [ ! -x "$NODE_PATH" ]; then
    echo "Error: Node.js 22 is not installed at $NODE_PATH"
    echo "Please install Node.js 22 via nvm"
    exit 1
fi

# Check if npx is available
if [ ! -x "$NPX_PATH" ]; then
    echo "Error: npx is not installed at $NPX_PATH"
    echo "Please install Node.js 22 via nvm"
    exit 1
fi

# Make fetch scripts executable
chmod +x "$IMAGE_FETCH_SCRIPT"
chmod +x "$API_FETCH_SCRIPT"

# Cron jobs definitions (using explicit Node.js 22 paths for cron compatibility)
IMAGE_CRON_JOB="0 * * * * $NODE_PATH $NPX_PATH tsx $IMAGE_FETCH_SCRIPT >> $SCRIPT_DIR/fetch.log 2>&1"
API_CRON_JOB="0 * * * * cd $SCRIPT_DIR/meteo-france-api && $NODE_PATH $NPX_PATH tsx $API_FETCH_SCRIPT >> $SCRIPT_DIR/meteo-france-api/fetch_api.log 2>&1"
BACKUP_CRON_JOB="5 * * * * $BACKUP_SCRIPT >> $SCRIPT_DIR/meteo-france-api/backup.log 2>&1"

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

# Setup S3 backup cron job
echo ""
echo "=== S3 Backup Cron Job ==="
if crontab -l 2>/dev/null | grep -F "$BACKUP_SCRIPT" >/dev/null 2>&1; then
    echo "S3 backup cron job already exists!"
    crontab -l | grep -F "$BACKUP_SCRIPT"
else
    (crontab -l 2>/dev/null; echo "$BACKUP_CRON_JOB") | crontab -
    echo "S3 backup cron job added successfully!"
    echo "Logs: $SCRIPT_DIR/meteo-france-api/backup.log"
fi

echo ""
echo "Fetch scripts will run every hour at minute 0"
echo "Backup script will run every hour at minute 5"
echo ""
echo "To view current crontab: crontab -l"
echo "To remove cron jobs: crontab -e (and delete the lines)"
echo ""
echo "Running fetch scripts once now to test..."
echo ""
echo "=== Testing Image Fetch ==="
cd "$SCRIPT_DIR" && "$NODE_PATH" "$NPX_PATH" tsx "$IMAGE_FETCH_SCRIPT"
echo ""
echo "=== Testing API Fetch ==="
cd "$SCRIPT_DIR/meteo-france-api" && "$NODE_PATH" "$NPX_PATH" tsx "$API_FETCH_SCRIPT"
echo ""
echo "=== Testing S3 Backup ==="
"$BACKUP_SCRIPT"
