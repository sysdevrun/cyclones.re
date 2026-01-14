output "bucket_name" {
  description = "Name of the storage bucket"
  value       = google_storage_bucket.images_bucket.name
}

output "bucket_url" {
  description = "URL of the storage bucket"
  value       = google_storage_bucket.images_bucket.url
}

output "website_url" {
  description = "Public URL for the website"
  value       = "https://storage.googleapis.com/${google_storage_bucket.images_bucket.name}/index.html"
}

output "service_account_email" {
  description = "Service account email"
  value       = google_service_account.fetch_service_account.email
}

output "cloud_run_job_name" {
  description = "Cloud Run job name"
  value       = google_cloud_run_v2_job.fetch_job.name
}

output "artifact_registry_repository" {
  description = "Artifact Registry repository"
  value       = google_artifact_registry_repository.docker_repo.id
}
