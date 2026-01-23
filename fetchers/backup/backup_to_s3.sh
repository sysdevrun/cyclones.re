#!/bin/bash
# Backup cyclone data and satellite images to S3
# Requires AWS profile "cyclones-backup" configured in ~/.aws/credentials

set -e

export AWS_PROFILE="cyclones-backup"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
DATA_DIR="$PROJECT_ROOT/public/data"
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

# Sync entire data directory (contains all data files)
echo "=== Syncing data/ directory ==="
if [ -d "$DATA_DIR" ]; then
    aws s3 sync "$DATA_DIR/" "s3://$BUCKET_NAME/data/" \
        --region "$REGION" \
        --delete
    echo "Synced $DATA_DIR to s3://$BUCKET_NAME/data/"
else
    echo "Warning: $DATA_DIR not found, skipping"
fi

echo ""
echo "=== Backup complete ==="
echo "Bucket: s3://$BUCKET_NAME"
echo "Finished: $(date -Iseconds)"
