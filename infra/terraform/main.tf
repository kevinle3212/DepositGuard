terraform {
  required_version = ">= 1.8"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 5.0"
    }
  }

  backend "gcs" {
    bucket = "nestcrow-terraform-state"
    prefix = "terraform/state"
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

provider "google-beta" {
  project = var.project_id
  region  = var.region
}

# ── Artifact Registry ─────────────────────────────────────────────────────────

resource "google_artifact_registry_repository" "nestcrow" {
  location      = var.region
  repository_id = "nestcrow"
  format        = "DOCKER"
  description   = "NestCrow Cloud Run service images"
}

# ── Secret Manager ────────────────────────────────────────────────────────────

module "secrets" {
  source     = "./modules/secrets"
  project_id = var.project_id
  secret_ids = [
    "relayer-keypair",
    "gemini-api-key",
    "firebase-service-account",
    "jwt-signing-secret",
    "elevenlabs-api-key",
    "sendgrid-api-key",
  ]
}

# ── Cloud Run Services ────────────────────────────────────────────────────────

locals {
  services = [
    "verify-wallet",
    "upload-contract",
    "send-signing-link",
    "assess-damage",
    "tts",
    "notify",
    "webhook-deadline",
  ]

  image_base = "${var.region}-docker.pkg.dev/${var.project_id}/nestcrow"
}

module "cloud_run" {
  for_each   = toset(local.services)
  source     = "./modules/cloud-run"
  project_id = var.project_id
  region     = var.region
  name       = each.value
  image      = "${local.image_base}/${each.value}:latest"
  secrets    = module.secrets.secret_ids
}

# ── HTTPS Load Balancer ────────────────────────────────────────────────────────

module "networking" {
  source     = "./modules/networking"
  project_id = var.project_id
  region     = var.region
  domain     = var.domain
  services   = { for k, v in module.cloud_run : k => v.service_url }
}

# ── Cloud Scheduler — deadline enforcement ────────────────────────────────────

resource "google_cloud_scheduler_job" "deadline_enforcer" {
  name             = "nestcrow-deadline-enforcer"
  description      = "POST to /api/webhook-deadline every 15 minutes"
  schedule         = "*/15 * * * *"
  time_zone        = "UTC"
  attempt_deadline = "320s"

  http_target {
    http_method = "POST"
    uri         = "${module.cloud_run["webhook-deadline"].service_url}/webhook-deadline"

    oidc_token {
      service_account_email = google_service_account.scheduler.email
    }
  }
}

resource "google_service_account" "scheduler" {
  account_id   = "nestcrow-scheduler"
  display_name = "NestCrow Cloud Scheduler"
}

resource "google_cloud_run_v2_service_iam_member" "scheduler_invoker" {
  for_each = toset(["webhook-deadline"])
  project  = var.project_id
  location = var.region
  name     = module.cloud_run[each.value].service_name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.scheduler.email}"
}

# ── Cloud Build trigger ────────────────────────────────────────────────────────

resource "google_cloudbuild_trigger" "main_push" {
  name        = "nestcrow-main-push"
  description = "Build, test, and deploy on push to main"

  github {
    owner = var.github_owner
    name  = var.github_repo

    push {
      branch = "^main$"
    }
  }

  filename = "cloudbuild.yaml"
}
