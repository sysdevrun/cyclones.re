#!/bin/bash
# Setup S3 bucket and IAM user for cyclone data backups
# Run with admin AWS credentials set in environment

set -e

BUCKET_NAME="cyclones-re-backup"
IAM_USER="cyclones-re-backup-user"
REGION="eu-west-3"

echo "=== Setting up S3 backup infrastructure ==="

# Check AWS credentials
if ! aws sts get-caller-identity &>/dev/null; then
    echo "Error: AWS credentials not configured or invalid"
    exit 1
fi

echo "Using AWS identity:"
aws sts get-caller-identity

# Create S3 bucket
echo ""
echo "=== Creating S3 bucket: $BUCKET_NAME ==="
if aws s3api head-bucket --bucket "$BUCKET_NAME" 2>/dev/null; then
    echo "Bucket $BUCKET_NAME already exists"
else
    aws s3api create-bucket \
        --bucket "$BUCKET_NAME" \
        --region "$REGION" \
        --create-bucket-configuration LocationConstraint="$REGION"
    echo "Bucket created successfully"
fi

# Enable versioning for data protection
echo ""
echo "=== Enabling bucket versioning ==="
aws s3api put-bucket-versioning \
    --bucket "$BUCKET_NAME" \
    --versioning-configuration Status=Enabled

# Create IAM user for backups
echo ""
echo "=== Creating IAM user: $IAM_USER ==="
if aws iam get-user --user-name "$IAM_USER" 2>/dev/null; then
    echo "User $IAM_USER already exists"
else
    aws iam create-user --user-name "$IAM_USER"
    echo "User created successfully"
fi

# Create policy for bucket access
POLICY_NAME="cyclones-re-backup-policy"
POLICY_ARN="arn:aws:iam::$(aws sts get-caller-identity --query Account --output text):policy/$POLICY_NAME"

POLICY_DOCUMENT=$(cat <<EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:GetObject",
                "s3:DeleteObject",
                "s3:ListBucket"
            ],
            "Resource": [
                "arn:aws:s3:::$BUCKET_NAME",
                "arn:aws:s3:::$BUCKET_NAME/*"
            ]
        }
    ]
}
EOF
)

echo ""
echo "=== Creating/Updating IAM policy ==="
if aws iam get-policy --policy-arn "$POLICY_ARN" 2>/dev/null; then
    echo "Policy already exists, creating new version..."
    # Delete oldest version if we have 5 versions (AWS limit)
    VERSIONS=$(aws iam list-policy-versions --policy-arn "$POLICY_ARN" --query 'Versions[?IsDefaultVersion==`false`].VersionId' --output text)
    VERSION_COUNT=$(echo "$VERSIONS" | wc -w)
    if [ "$VERSION_COUNT" -ge 4 ]; then
        OLDEST=$(echo "$VERSIONS" | awk '{print $NF}')
        aws iam delete-policy-version --policy-arn "$POLICY_ARN" --version-id "$OLDEST"
    fi
    aws iam create-policy-version \
        --policy-arn "$POLICY_ARN" \
        --policy-document "$POLICY_DOCUMENT" \
        --set-as-default
else
    aws iam create-policy \
        --policy-name "$POLICY_NAME" \
        --policy-document "$POLICY_DOCUMENT"
fi

# Attach policy to user
echo ""
echo "=== Attaching policy to user ==="
aws iam attach-user-policy \
    --user-name "$IAM_USER" \
    --policy-arn "$POLICY_ARN" 2>/dev/null || echo "Policy already attached"

# Create access key for user
echo ""
echo "=== Creating access key for $IAM_USER ==="
echo "WARNING: Save these credentials securely - they will only be shown once!"
echo ""

# Check existing keys
EXISTING_KEYS=$(aws iam list-access-keys --user-name "$IAM_USER" --query 'AccessKeyMetadata[].AccessKeyId' --output text)
if [ -n "$EXISTING_KEYS" ]; then
    echo "User already has access keys: $EXISTING_KEYS"
    read -p "Create a new key anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Skipping key creation"
        echo ""
        echo "=== Setup complete ==="
        echo "Bucket: $BUCKET_NAME"
        echo "Region: $REGION"
        exit 0
    fi
fi

ACCESS_KEY_OUTPUT=$(aws iam create-access-key --user-name "$IAM_USER")

ACCESS_KEY_ID=$(echo "$ACCESS_KEY_OUTPUT" | jq -r '.AccessKey.AccessKeyId')
SECRET_ACCESS_KEY=$(echo "$ACCESS_KEY_OUTPUT" | jq -r '.AccessKey.SecretAccessKey')

echo "=============================================="
echo "ACCESS KEY CREDENTIALS (save these securely!):"
echo "=============================================="
echo ""
echo "export AWS_ACCESS_KEY_ID=\"$ACCESS_KEY_ID\""
echo "export AWS_SECRET_ACCESS_KEY=\"$SECRET_ACCESS_KEY\""
echo ""
echo "Or add to ~/.aws/credentials:"
echo ""
echo "[cyclones-backup]"
echo "aws_access_key_id = $ACCESS_KEY_ID"
echo "aws_secret_access_key = $SECRET_ACCESS_KEY"
echo "region = $REGION"
echo ""
echo "=============================================="

echo ""
echo "=== Setup complete ==="
echo "Bucket: $BUCKET_NAME"
echo "Region: $REGION"
echo "User: $IAM_USER"
