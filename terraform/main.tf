terraform {
  required_version = ">= 1.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }

  backend "gcs" {
    bucket = "meteo-cyclone-tfstate"
    prefix = "terraform/state"
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# Storage bucket for images and static website
resource "google_storage_bucket" "images_bucket" {
  name          = var.bucket_name
  location      = var.region
  force_destroy = false

  uniform_bucket_level_access = true

  website {
    main_page_suffix = "index.html"
    not_found_page   = "index.html"
  }

  cors {
    origin          = ["*"]
    method          = ["GET", "HEAD"]
    response_header = ["*"]
    max_age_seconds = 3600
  }
}

# Make bucket publicly readable
resource "google_storage_bucket_iam_member" "public_read" {
  bucket = google_storage_bucket.images_bucket.name
  role   = "roles/storage.objectViewer"
  member = "allUsers"
}

# Service account for Cloud Run
resource "google_service_account" "fetch_service_account" {
  account_id   = "meteo-cyclone-fetcher"
  display_name = "Meteo Cyclone Image Fetcher"
  description  = "Service account for fetching and storing cyclone images"
}

# Grant storage admin to service account
resource "google_storage_bucket_iam_member" "fetch_service_account_admin" {
  bucket = google_storage_bucket.images_bucket.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.fetch_service_account.email}"
}

# Cloud Run service
resource "google_cloud_run_v2_job" "fetch_job" {
  name     = "meteo-cyclone-fetch"
  location = var.region

  template {
    template {
      service_account = google_service_account.fetch_service_account.email

      containers {
        image = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.docker_repo.name}/meteo-cyclone-fetcher:latest"

        env {
          name  = "GCS_BUCKET_NAME"
          value = google_storage_bucket.images_bucket.name
        }

        resources {
          limits = {
            cpu    = "1"
            memory = "512Mi"
          }
        }
      }

      timeout         = "300s"
      max_retries     = 2
    }
  }

  lifecycle {
    ignore_changes = [
      template[0].template[0].containers[0].image,
    ]
  }
}

# Artifact Registry repository
resource "google_artifact_registry_repository" "docker_repo" {
  location      = var.region
  repository_id = "meteo-cyclone"
  description   = "Docker repository for meteo cyclone fetcher"
  format        = "DOCKER"
}

# Cloud Scheduler job to trigger Cloud Run hourly
resource "google_cloud_scheduler_job" "fetch_scheduler" {
  name             = "meteo-cyclone-fetch-hourly"
  description      = "Trigger image fetch every hour"
  schedule         = "0 * * * *"
  time_zone        = "UTC"
  attempt_deadline = "320s"
  region           = var.region

  retry_config {
    retry_count = 1
  }

  http_target {
    http_method = "POST"
    uri         = "https://${var.region}-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/${var.project_id}/jobs/${google_cloud_run_v2_job.fetch_job.name}:run"

    oauth_token {
      service_account_email = google_service_account.fetch_service_account.email
    }
  }
}

# Enable required APIs
resource "google_project_service" "cloud_run" {
  service            = "run.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "cloud_scheduler" {
  service            = "cloudscheduler.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "artifact_registry" {
  service            = "artifactregistry.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "cloud_build" {
  service            = "cloudbuild.googleapis.com"
  disable_on_destroy = false
}
