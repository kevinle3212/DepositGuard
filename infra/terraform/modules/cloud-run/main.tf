variable "project_id" { type = string }
variable "region" { type = string }
variable "name" { type = string }
variable "image" { type = string }
variable "secrets" { type = list(string) }

resource "google_cloud_run_v2_service" "service" {
  name     = "nestcrow-${var.name}"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_INTERNAL_LOAD_BALANCER"

  template {
    service_account = google_service_account.run_sa.email

    scaling {
      min_instance_count = 0
      max_instance_count = 10
    }

    containers {
      image = var.image

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
        cpu_idle = true
      }

      dynamic "env" {
        for_each = var.secrets
        content {
          name = upper(replace(env.value, "-", "_"))
          value_source {
            secret_key_ref {
              secret  = env.value
              version = "latest"
            }
          }
        }
      }
    }
  }
}

resource "google_service_account" "run_sa" {
  account_id   = "nestcrow-${var.name}-run"
  display_name = "NestCrow ${var.name} Cloud Run SA"
}

resource "google_secret_manager_secret_iam_member" "run_sa_secrets" {
  for_each  = toset(var.secrets)
  project   = var.project_id
  secret_id = each.value
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.run_sa.email}"
}

output "service_url" { value = google_cloud_run_v2_service.service.uri }
output "service_name" { value = google_cloud_run_v2_service.service.name }
