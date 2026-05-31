# Docker

Local development and CI/CD container configuration.

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (or Docker Engine + Compose plugin)
- A populated `.env` file at the repo root (copy `.env.example` and fill in values)

## Start all Cloud Run services locally

```bash
docker compose -f docker/docker-compose.yml --env-file .env up --build
```

Each service maps to a local port:

| Service           | Local port |
| ----------------- | ---------- |
| verify-wallet     | 8081       |
| upload-contract   | 8082       |
| send-signing-link | 8083       |
| assess-damage     | 8084       |
| tts               | 8085       |
| notify            | 8086       |
| webhook-deadline  | 8087       |

## Start a single service

```bash
docker compose -f docker/docker-compose.yml --env-file .env up verify-wallet
```

## Rebuild after code changes

```bash
docker compose -f docker/docker-compose.yml --env-file .env up --build <service>
```

## Stop all services

```bash
docker compose -f docker/docker-compose.yml down
```

## Using with the Next.js frontend

Run `yarn dev` in the repo root in a separate terminal. The Next.js app reads service URLs from `.env`; point each `*_SERVICE_URL` variable at the corresponding `localhost:80XX` port above.

## Production Docker images

Each `services/<name>/Dockerfile` is a multi-stage build (deps → build → runner) targeting Node.js 20 Alpine. The same Dockerfiles are used by Google Cloud Build for Cloud Run deployments — see `cloudbuild.yaml`.
