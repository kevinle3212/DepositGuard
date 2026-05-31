variable "project_id" {
  description = "Google Cloud project ID"
  type        = string
}

variable "region" {
  description = "Primary Google Cloud region"
  type        = string
  default     = "us-central1"
}

variable "domain" {
  description = "Primary domain name"
  type        = string
  default     = "nestcrow.tech"
}

variable "github_owner" {
  description = "GitHub organisation or username that owns the repo"
  type        = string
}

variable "github_repo" {
  description = "GitHub repository name"
  type        = string
  default     = "DepositGuard"
}
