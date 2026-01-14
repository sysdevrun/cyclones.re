# Google Cloud Platform Setup Guide

This guide explains how to deploy the Meteo Cyclone Animation system to Google Cloud Platform using GitHub Actions.

## Architecture

- **Cloud Storage**: Stores images in daily directories and hosts the static website
- **Cloud Run Job**: Runs the TypeScript fetch script in a container
- **Cloud Scheduler**: Triggers the Cloud Run job every hour
- **Artifact Registry**: Stores Docker images
- **Terraform**: Manages all GCP infrastructure as code

## Prerequisites

1. **GCP Project**
   - Create a new GCP project or use an existing one
   - Enable billing on the project

2. **GitHub Repository**
   - Fork or clone this repository
   - Set up GitHub secrets (see below)

3. **Local Tools** (for manual deployment)
   - [gcloud CLI](https://cloud.google.com/sdk/docs/install)
   - [Terraform](https://www.terraform.io/downloads)
   - Docker

## Setup Steps

### 1. Create GCP Service Account for GitHub Actions

```bash
# Set your project ID
export PROJECT_ID="your-gcp-project-id"

# Authenticate
gcloud auth login
gcloud config set project $PROJECT_ID

# Enable required APIs
gcloud services enable \
  iam.googleapis.com \
  cloudresourcemanager.googleapis.com \
  iamcredentials.googleapis.com \
  sts.googleapis.com

# Create service account
gcloud iam service-accounts create github-actions \
  --display-name="GitHub Actions Service Account"

# Grant necessary permissions
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/owner"
```

### 2. Set up Workload Identity Federation

```bash
# Create workload identity pool
gcloud iam workload-identity-pools create "github-pool" \
  --location="global" \
  --display-name="GitHub Actions Pool"

# Create workload identity provider
gcloud iam workload-identity-pools providers create-oidc "github-provider" \
  --location="global" \
  --workload-identity-pool="github-pool" \
  --display-name="GitHub Provider" \
  --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository,attribute.repository_owner=assertion.repository_owner" \
  --issuer-uri="https://token.actions.githubusercontent.com"

# Get the Workload Identity Provider resource name
gcloud iam workload-identity-pools providers describe "github-provider" \
  --location="global" \
  --workload-identity-pool="github-pool" \
  --format="value(name)"
```

### 3. Configure GitHub Secrets

Go to your GitHub repository settings → Secrets and variables → Actions, and add:

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `GCP_PROJECT_ID` | Your GCP project ID | `my-project-123` |
| `GCP_REGION` | GCP region for deployment | `europe-west1` |
| `GCS_BUCKET_NAME` | Name for the storage bucket | `meteo-cyclone-images` |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | Workload identity provider resource name | `projects/123.../providers/github-provider` |
| `GCP_SERVICE_ACCOUNT` | Service account email | `github-actions@project.iam.gserviceaccount.com` |

### 4. Create Terraform State Bucket

```bash
# Create bucket for Terraform state
gsutil mb -p $PROJECT_ID -l $REGION gs://meteo-cyclone-tfstate/

# Enable versioning
gsutil versioning set on gs://meteo-cyclone-tfstate/
```

### 5. Deploy via GitHub Actions

1. Push to the `main` branch:
   ```bash
   git checkout main
   git merge your-feature-branch
   git push origin main
   ```

2. GitHub Actions will automatically:
   - Provision GCP infrastructure with Terraform
   - Build and push Docker image to Artifact Registry
   - Deploy Cloud Run job
   - Upload index.html to GCS bucket
   - Run initial image fetch

3. Monitor the deployment:
   - Go to Actions tab in your GitHub repository
   - Click on the latest workflow run
   - View logs for each job

### 6. Access Your Website

After successful deployment, your website will be available at:
```
https://storage.googleapis.com/YOUR-BUCKET-NAME/index.html
```

The URL will be printed at the end of the GitHub Actions workflow.

## Manual Deployment (Alternative)

If you prefer to deploy manually:

### 1. Set up Terraform

```bash
cd terraform

# Copy example variables
cp terraform.tfvars.example terraform.tfvars

# Edit terraform.tfvars with your values
nano terraform.tfvars

# Initialize Terraform
terraform init

# Plan infrastructure
terraform plan

# Apply infrastructure
terraform apply
```

### 2. Build and Deploy Docker Image

```bash
# Configure Docker
gcloud auth configure-docker ${REGION}-docker.pkg.dev

# Build image
docker build -t ${REGION}-docker.pkg.dev/${PROJECT_ID}/meteo-cyclone/meteo-cyclone-fetcher:latest .

# Push image
docker push ${REGION}-docker.pkg.dev/${PROJECT_ID}/meteo-cyclone/meteo-cyclone-fetcher:latest

# Update Cloud Run job
gcloud run jobs update meteo-cyclone-fetch \
  --region=${REGION} \
  --image=${REGION}-docker.pkg.dev/${PROJECT_ID}/meteo-cyclone/meteo-cyclone-fetcher:latest
```

### 3. Upload Website

```bash
# Upload index.html
gsutil -h "Cache-Control:public, max-age=300" \
       -h "Content-Type:text/html" \
       cp index.html gs://YOUR-BUCKET-NAME/

# Run initial fetch
gcloud run jobs execute meteo-cyclone-fetch \
  --region=${REGION} \
  --wait
```

## Monitoring

### View Logs

```bash
# Cloud Run job logs
gcloud logging read "resource.type=cloud_run_job AND resource.labels.job_name=meteo-cyclone-fetch" \
  --limit 50 \
  --format=json

# Cloud Scheduler logs
gcloud logging read "resource.type=cloud_scheduler_job" \
  --limit 20
```

### Manual Trigger

```bash
# Manually trigger the fetch job
gcloud run jobs execute meteo-cyclone-fetch \
  --region=${REGION} \
  --wait
```

### List Images in Bucket

```bash
gsutil ls -lh gs://YOUR-BUCKET-NAME/images/
```

## Cost Estimation

Estimated monthly costs (as of 2024):

- **Cloud Storage**: ~$0.50/month (assuming ~1GB of images)
- **Cloud Run**: ~$0.10/month (minimal usage, pay per execution)
- **Cloud Scheduler**: $0.10/month (1 job)
- **Artifact Registry**: ~$0.10/month (1 image)

**Total**: ~$0.80/month

## Troubleshooting

### Job Fails with Permission Denied

Check service account permissions:
```bash
gcloud projects get-iam-policy $PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:serviceAccount:meteo-cyclone-fetcher@*"
```

### Image Not Downloading

Check Cloud Run logs:
```bash
gcloud logging read "resource.type=cloud_run_job" \
  --limit 10 \
  --format=json
```

### Website Not Accessible

Verify bucket is public:
```bash
gsutil iam get gs://YOUR-BUCKET-NAME/
```

## Cleanup

To remove all resources:

```bash
cd terraform
terraform destroy

# Remove Terraform state bucket
gsutil rm -r gs://meteo-cyclone-tfstate/
```

## Custom Domain (Optional)

To use a custom domain:

1. Set up Cloud Load Balancer with Cloud CDN
2. Configure SSL certificate
3. Point your domain to the load balancer IP

See: [GCP Custom Domain Guide](https://cloud.google.com/storage/docs/hosting-static-website)
