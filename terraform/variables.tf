variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "region" {
  description = "GCP region"
  type        = string
  default     = "europe-west1"
}

variable "bucket_name" {
  description = "Name of the GCS bucket for images and website"
  type        = string
  default     = "meteo-cyclone-images"
}
