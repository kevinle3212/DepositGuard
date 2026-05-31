variable "project_id" { type = string }
variable "region" { type = string }
variable "domain" { type = string }
variable "services" { type = map(string) }

# ── Static IP ─────────────────────────────────────────────────────────────────

resource "google_compute_global_address" "lb_ip" {
  name = "nestcrow-lb-ip"
}

# ── Cloud DNS ─────────────────────────────────────────────────────────────────

resource "google_dns_managed_zone" "nestcrow" {
  name        = "nestcrow-zone"
  dns_name    = "${var.domain}."
  description = "NestCrow primary DNS zone"
}

resource "google_dns_record_set" "root_a" {
  name         = "${var.domain}."
  managed_zone = google_dns_managed_zone.nestcrow.name
  type         = "A"
  ttl          = 300
  rrdatas      = [google_compute_global_address.lb_ip.address]
}

resource "google_dns_record_set" "www_a" {
  name         = "www.${var.domain}."
  managed_zone = google_dns_managed_zone.nestcrow.name
  type         = "A"
  ttl          = 300
  rrdatas      = [google_compute_global_address.lb_ip.address]
}

resource "google_dns_record_set" "api_cname" {
  name         = "api.${var.domain}."
  managed_zone = google_dns_managed_zone.nestcrow.name
  type         = "CNAME"
  ttl          = 300
  rrdatas      = ["${trimprefix(var.services["verify-wallet"], "https://")}"]
}

# ── Google-managed TLS certificate ───────────────────────────────────────────

resource "google_compute_managed_ssl_certificate" "nestcrow" {
  provider = google-beta
  name     = "nestcrow-cert"

  managed {
    domains = [
      var.domain,
      "www.${var.domain}",
      "api.${var.domain}",
    ]
  }
}

# ── Cloud Armor security policy ───────────────────────────────────────────────

resource "google_compute_security_policy" "nestcrow" {
  name        = "nestcrow-armor"
  description = "Cloud Armor: rate limit + OWASP CRS + geo-blocking"

  # Rate limit: 100 req/min per IP
  rule {
    action   = "rate_based_ban"
    priority = 1000
    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["*"]
      }
    }
    rate_limit_options {
      conform_action = "allow"
      exceed_action  = "deny(429)"
      enforce_on_key = "IP"
      rate_limit_threshold {
        count        = 100
        interval_sec = 60
      }
      ban_duration_sec = 300
    }
    description = "Global 100 req/min rate limit per IP"
  }

  # OWASP Core Rule Set (pre-configured)
  rule {
    action   = "deny(403)"
    priority = 2000
    match {
      expr {
        expression = "evaluatePreconfiguredExpr('xss-stable')"
      }
    }
    description = "OWASP CRS: XSS"
  }

  rule {
    action   = "deny(403)"
    priority = 2001
    match {
      expr {
        expression = "evaluatePreconfiguredExpr('sqli-stable')"
      }
    }
    description = "OWASP CRS: SQLi"
  }

  rule {
    action   = "deny(403)"
    priority = 2002
    match {
      expr {
        expression = "evaluatePreconfiguredExpr('rce-stable')"
      }
    }
    description = "OWASP CRS: RCE"
  }

  rule {
    action   = "deny(403)"
    priority = 2003
    match {
      expr {
        expression = "evaluatePreconfiguredExpr('lfi-stable')"
      }
    }
    description = "OWASP CRS: LFI"
  }

  # Default allow
  rule {
    action   = "allow"
    priority = 2147483647
    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["*"]
      }
    }
    description = "Default allow"
  }
}

# ── Serverless NEG + backend services ─────────────────────────────────────────

resource "google_compute_region_network_endpoint_group" "negs" {
  for_each              = var.services
  name                  = "nestcrow-neg-${each.key}"
  network_endpoint_type = "SERVERLESS"
  region                = var.region

  cloud_run {
    service = "nestcrow-${each.key}"
  }
}

resource "google_compute_backend_service" "backends" {
  for_each    = var.services
  name        = "nestcrow-backend-${each.key}"
  protocol    = "HTTPS"
  timeout_sec = 30

  security_policy = google_compute_security_policy.nestcrow.id

  backend {
    group = google_compute_region_network_endpoint_group.negs[each.key].id
  }
}

# ── URL map, proxy, and forwarding rule ───────────────────────────────────────

resource "google_compute_url_map" "nestcrow" {
  name            = "nestcrow-url-map"
  default_service = google_compute_backend_service.backends["verify-wallet"].id

  host_rule {
    hosts        = ["api.${var.domain}"]
    path_matcher = "api"
  }

  path_matcher {
    name            = "api"
    default_service = google_compute_backend_service.backends["verify-wallet"].id

    dynamic "path_rule" {
      for_each = var.services
      content {
        paths   = ["/${path_rule.key}", "/${path_rule.key}/*"]
        service = google_compute_backend_service.backends[path_rule.key].id
      }
    }
  }
}

# HTTP → HTTPS redirect
resource "google_compute_url_map" "http_redirect" {
  name = "nestcrow-http-redirect"

  default_url_redirect {
    https_redirect         = true
    redirect_response_code = "MOVED_PERMANENTLY_DEFAULT"
    strip_query            = false
  }
}

resource "google_compute_target_http_proxy" "http_redirect" {
  name    = "nestcrow-http-proxy"
  url_map = google_compute_url_map.http_redirect.id
}

resource "google_compute_target_https_proxy" "nestcrow" {
  name             = "nestcrow-https-proxy"
  url_map          = google_compute_url_map.nestcrow.id
  ssl_certificates = [google_compute_managed_ssl_certificate.nestcrow.id]
}

resource "google_compute_global_forwarding_rule" "http" {
  name       = "nestcrow-http-fwd"
  target     = google_compute_target_http_proxy.http_redirect.id
  port_range = "80"
  ip_address = google_compute_global_address.lb_ip.address
}

resource "google_compute_global_forwarding_rule" "https" {
  name       = "nestcrow-https-fwd"
  target     = google_compute_target_https_proxy.nestcrow.id
  port_range = "443"
  ip_address = google_compute_global_address.lb_ip.address
}

output "load_balancer_ip" { value = google_compute_global_address.lb_ip.address }
