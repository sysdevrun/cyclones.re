#!/bin/bash
# Backup cyclone data and satellite images to S3
# Requires AWS profile "cyclones-backup" configured in ~/.aws/credentials

set -e

export AWS_PROFILE="cyclones-backup"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUCKET_NAME="cyclones-re-backup"
REGION="eu-west-3"

echo "=== Cyclone Data Backup to S3 ==="
echo "Timestamp: $(date -Iseconds)"
echo ""

# Check AWS credentials
if ! aws sts get-caller-identity &>/dev/null; then
    echo "Error: AWS profile 'cyclones-backup' not configured or invalid"
    echo "Add credentials to ~/.aws/credentials:"
    echo ""
    echo "[cyclones-backup]"
    echo "aws_access_key_id = <your-key>"
    echo "aws_secret_access_key = <your-secret>"
    echo "region = eu-west-3"
    exit 1
fi

# Check bucket exists
if ! aws s3api head-bucket --bucket "$BUCKET_NAME" 2>/dev/null; then
    echo "Error: Bucket $BUCKET_NAME does not exist"
    echo "Run setup_s3_backup.sh first to create the bucket"
    exit 1
fi

# Backup api_data.json
echo "=== Backing up api_data.json ==="
if [ -f "$SCRIPT_DIR/api_data.json" ]; then
    aws s3 cp "$SCRIPT_DIR/api_data.json" "s3://$BUCKET_NAME/api_data.json" \
        --region "$REGION"
    echo "Uploaded api_data.json"
else
    echo "Warning: api_data.json not found, skipping"
fi

# Backup satellite_metadata.json
echo ""
echo "=== Backing up satellite_metadata.json ==="
if [ -f "$SCRIPT_DIR/satellite_metadata.json" ]; then
    aws s3 cp "$SCRIPT_DIR/satellite_metadata.json" "s3://$BUCKET_NAME/satellite_metadata.json" \
        --region "$REGION"
    echo "Uploaded satellite_metadata.json"
else
    echo "Warning: satellite_metadata.json not found, skipping"
fi

# Sync data directory
echo ""
echo "=== Syncing data/ directory ==="
if [ -d "$SCRIPT_DIR/data" ]; then
    aws s3 sync "$SCRIPT_DIR/data/" "s3://$BUCKET_NAME/data/" \
        --region "$REGION" \
        --delete
    echo "Synced data/ directory"
else
    echo "Warning: data/ directory not found, skipping"
fi

# Sync satellite_images directory
echo ""
echo "=== Syncing satellite_images/ directory ==="
if [ -d "$SCRIPT_DIR/satellite_images" ]; then
    aws s3 sync "$SCRIPT_DIR/satellite_images/" "s3://$BUCKET_NAME/satellite_images/" \
        --region "$REGION" \
        --delete
    echo "Synced satellite_images/ directory"
else
    echo "Warning: satellite_images/ directory not found, skipping"
fi

echo ""
echo "=== Backup complete ==="
echo "Bucket: s3://$BUCKET_NAME"
echo "Finished: $(date -Iseconds)"
