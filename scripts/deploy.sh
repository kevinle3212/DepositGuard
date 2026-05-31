#!/usr/bin/env bash
# Builds and deploys all Cloud Run services to GCP.
# Usage: bash scripts/deploy.sh [staging|production]
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

ENV="${1:-staging}"
if [[ "$ENV" != "staging" && "$ENV" != "production" ]]; then
  echo "Usage: $0 [staging|production]" >&2
  exit 1
fi

PROJECT="${GOOGLE_CLOUD_PROJECT:-$(gcloud config get-value project 2>/dev/null)}"
[[ -z "$PROJECT" ]] && { echo "Set GOOGLE_CLOUD_PROJECT or run: gcloud config set project <ID>" >&2; exit 1; }

REGION="us-central1"
REGISTRY="gcr.io/$PROJECT"

SERVICES=(assess-damage notify send-signing-link tts upload-contract verify-wallet webhook-deadline)

echo "[deploy] Environment : $ENV"
echo "[deploy] GCP project : $PROJECT"
echo "[deploy] Region      : $REGION"
echo ""

for svc in "${SERVICES[@]}"; do
  svc_dir="services/$svc"
  image="$REGISTRY/depositguard-$svc:$ENV-$(git rev-parse --short HEAD)"

  echo "[deploy] Building $svc → $image"
  docker build -t "$image" "$svc_dir"

  echo "[deploy] Pushing $svc"
  docker push "$image"

  echo "[deploy] Deploying $svc to Cloud Run"
  gcloud run deploy "depositguard-$svc" \
    --image "$image" \
    --region "$REGION" \
    --platform managed \
    --allow-unauthenticated \
    --quiet

  echo "[deploy] ✓ $svc deployed"
  echo ""
done

echo "[deploy] All services deployed to $ENV."
