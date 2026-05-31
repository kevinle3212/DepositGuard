variable "project_id" { type = string }
variable "secret_ids" { type = list(string) }

resource "google_secret_manager_secret" "secrets" {
  for_each  = toset(var.secret_ids)
  secret_id = each.value

  replication {
    auto {}
  }

  labels = {
    managed-by = "terraform"
    project    = "nestcrow"
  }
}

output "secret_ids" {
  value = [for s in google_secret_manager_secret.secrets : s.secret_id]
}
