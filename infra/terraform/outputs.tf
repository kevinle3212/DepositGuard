output "load_balancer_ip" {
  description = "External IP of the HTTPS load balancer — set this as your A record"
  value       = module.networking.load_balancer_ip
}

output "cloud_run_urls" {
  description = "Cloud Run service URLs by service name"
  value       = { for k, v in module.cloud_run : k => v.service_url }
}

output "artifact_registry_url" {
  description = "Artifact Registry base URL for Docker images"
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/nestcrow"
}
