#!/bin/bash

# Get the absolute path of the script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FETCH_SCRIPT="$SCRIPT_DIR/fetch_image.ts"

echo "Setting up hourly cron job for weather image fetching..."

# Check if tsx is installed
if ! command -v tsx &> /dev/null; then
    echo "Error: tsx is not installed"
    echo "Please install it with: npm install -g tsx"
    echo "Or install dependencies locally: npm install"
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed"
    echo "Please install Node.js first"
    exit 1
fi

# Make fetch script executable
chmod +x "$FETCH_SCRIPT"

# Get tsx path
TSX_PATH=$(command -v tsx)

# Check if cron job already exists
CRON_JOB="0 * * * * cd $SCRIPT_DIR && $TSX_PATH $FETCH_SCRIPT >> $SCRIPT_DIR/fetch.log 2>&1"

# Check if job exists in crontab
if crontab -l 2>/dev/null | grep -F "$FETCH_SCRIPT" >/dev/null 2>&1; then
    echo "Cron job already exists!"
    echo "Current crontab:"
    crontab -l | grep -F "$FETCH_SCRIPT"
else
    # Add cron job
    (crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -
    echo "Cron job added successfully!"
    echo "The script will run every hour at minute 0"
    echo "Logs will be saved to: $SCRIPT_DIR/fetch.log"
fi

echo ""
echo "To view current crontab: crontab -l"
echo "To remove cron job: crontab -e (and delete the line)"
echo ""
echo "Running fetch script once now to test..."
cd "$SCRIPT_DIR" && tsx "$FETCH_SCRIPT"
