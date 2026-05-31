# Contributing to NestCrow

## Prerequisites

- Node.js 20+, Yarn (root), npm (services)
- Rust + Anchor CLI (`anchor --version`)
- Solana CLI configured to devnet
- Firebase CLI (`firebase --version`)

## Setup

```bash
yarn install
cd programs/nest-crow && anchor build
```

## Coding Standards

- **TypeScript**: strict mode, ESLint flat config (`eslint.config.mjs`), Prettier
- **Rust/Anchor**: Clippy enforced (`clippy.toml`); zero `#[allow(...)]` without a comment explaining why
- **No secrets in source**: all keys go in `.env.local` (gitignored) or Google Secret Manager
- **Imports**: absolute imports via `@/` alias; no barrel re-exports that create circular deps

## Commit Message Format

This repo uses [Conventional Commits](https://www.conventionalcommits.org/).

```
<type>(<scope>): <short summary>

[optional body]
[optional footer]
```

**Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `ci`, `perf`

**Scopes**: `anchor`, `app`, `services`, `infra`, `docs`, `ci`

Examples:

```
feat(anchor): add open_dispute instruction
fix(app): prevent double-submission on assessment page
docs(contributing): add commit format section
```

Commitlint enforces this on every commit via Husky (`commitlint.config.ts`).

## Branch Strategy

| Branch    | Purpose                                                      |
| --------- | ------------------------------------------------------------ |
| `main`    | Production — protected; requires passing CI and one approval |
| `feat/*`  | Feature branches; open PRs against `main`                    |
| `fix/*`   | Bug fix branches                                             |
| `chore/*` | Tooling / dependency bumps                                   |

## Pull Request Process

1. Branch off `main`: `git checkout -b feat/<short-name>`
2. Keep PRs focused — one concern per PR
3. Ensure all CI checks pass before requesting review:
    - `yarn lint` — ESLint
    - `yarn typecheck` — TypeScript
    - `anchor test` — Anchor program tests
    - `yarn test` — Jest unit tests
4. Fill in the PR template fully (description, test plan, checklist)
5. Request review from at least one maintainer
6. Squash-merge once approved; delete the branch

## Testing

```bash
# TypeScript / Next.js unit tests
yarn test

# Anchor program tests (requires local validator or devnet)
anchor test

# Playwright E2E (requires running dev server)
yarn playwright test
```

## Reporting Issues

Use the GitHub issue templates. For security issues, see [SECURITY.md](SECURITY.md).
