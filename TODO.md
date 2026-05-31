# NestCrow — To-Do List

> Each item is a single, self-contained task. When you ask me to "do TODO item X"
> or "work on the <section> tasks," this list is the source of truth.
> `[x]` = done, `[ ]` = not started.

---

## 1. Setup Script (`nestcrow-setup.sh`) — DONE

- [x] Support both macOS and Windows users in the script and its instructions.
- [x] Clone the repo into the directory the user runs the script from (no hardcoded path); document the `cd` step beforehand.
- [x] Add error handling that catches and reports failures during setup.
- [x] Write detailed comments explaining what each step does and why; keep all comments correct in grammar, punctuation, and spelling.
- [x] Document how to verify environment variables are set correctly after running.
- [x] Goal: runs end-to-end on macOS and Windows with no manual intervention beyond entering passwords for sudo, with comments clear to all skill levels.

---

## 2. Solana Program — Security Deposit Escrow (Core) — DONE (Devnet: `F1UroT66B49zt8kMCr8oRo89AsBo4BWebEJjDRH5wZ9a`)

> Start here. Everything else depends on a working escrow contract.

- [x] Scaffold Anchor workspace: `programs/nest-crow/`, `tests/`, `Anchor.toml`, `Cargo.toml`.
- [x] Define the `EscrowState` PDA account struct: `lease_id`, `landlord`, `tenant`, `token_mint`, `deposit_amount`, `status` enum, `deadline_ts`, `jurisdiction_code`.
- [x] Define the `LeaseConfig` PDA account struct: landlord and tenant pubkeys, token mint, deposit amount, `dispute_threshold_pct`, `contract_hash`, `landlord_signed`, `tenant_signed`.
- [x] Define the `ClaimRecord` PDA account struct: itemized damage list hashes, `disputed_total`, `undisputed_total`, `tenant_estimate`, `landlord_estimate`, `tenant_estimate_sealed_ts`, `landlord_estimate_sealed_ts`, `max_fine`.
- [x] Implement `initialize_escrow` instruction: creates `EscrowState` and `LeaseConfig` PDAs; sets `status = CREATED`.
- [x] Implement `fund_escrow` instruction: tenant transfers USDC from connected wallet into PDA-owned token account; sets `status = FUNDED`; validate both parties have signed before allowing funding.
- [x] Implement `propose_release` instruction: landlord proposes a deduction split; sets `status = PENDING_APPROVAL`.
- [x] Implement `approve_release` instruction: tenant approves; releases undisputed portion to tenant immediately on-chain.
- [x] Implement `claim_timeout` instruction: relayer calls after `deadline_ts` passes; releases full remaining balance to tenant; validate `deadline_ts < Clock::unix_timestamp` on-chain.
- [x] Implement `close_escrow` instruction: closes PDA accounts and reclaims rent after all funds have been disbursed.
- [x] Implement `record_contract_hash` instruction: stores SHA-256 hash of lease PDF in `LeaseConfig` PDA.
- [x] Implement `record_photo_hash` instruction: stores SHA-256 hash of a party's photo set in `ClaimRecord` PDA; require both parties to sign before advancing lease to `ACTIVE`.
- [x] Implement the full `EscrowState` status enum and enforce valid state transitions: `CREATED → FUNDED → PENDING_DOCUMENTATION → ACTIVE → PENDING_APPROVAL → RELEASED / DISPUTED → RESOLVED`.
- [x] Write Anchor unit tests for all instructions and all valid/invalid state transitions.
- [x] Deploy program to Solana Devnet; record program ID (`F1UroT66B49zt8kMCr8oRo89AsBo4BWebEJjDRH5wZ9a`).
- [x] Verify all instruction accounts, seeds, and constraints compile cleanly under `anchor build` (warnings only — no errors; `.so` artifact produced).

---

## 2b. Mock Data Removal — DONE

- [x] Create `/api/deposits/route.ts` (GET list + POST create) backed by Firestore leases collection.
- [x] Rewrite `hooks/use-deposits.ts` to call real `/api/deposits` endpoints (removed all `MOCK_DEPOSITS` and `setTimeout` stubs).
- [x] Replace fake hash generation in `PhotoVerification.tsx` with real SHA-256 (`crypto.subtle.digest`) and Firebase Storage upload.
- [x] Remove hardcoded `counterpartyValue: 875` from assessment page; replace with `0` (value comes from Firestore when both parties submit).
- [x] Remove `mockReveal()` function and its "[Demo] Simulate" button from assessment page.

---

## 3. Gemini AI Damage Assessment (`/api/assess-damage` + in-app capture)

> Depends on Section 2 (photo hashes must be committed on-chain before assessment runs).

- [x] Create the `/api/assess-damage` Cloud Run service (TypeScript, Node.js 20).
- [x] Set up Vertex AI client (`@google-cloud/vertexai`) with IAM service account; store API key in Google Cloud Secret Manager.
- [x] Write the Gemini 2.0 Flash system prompt: constrain output to advisory visual comparison only; explicitly forbid legal liability determinations; temperature `0.0` for determinism.
- [x] Build the request handler: fetch signed photo URLs from Firebase Cloud Storage, construct the multimodal prompt with move-in and move-out photo sets, call Gemini via Vertex AI.
- [x] Define and apply a `zod` schema to validate Gemini's JSON response: `items[]` with `description`, `estimatedAmountUsdc`, `severity` (`minor | moderate | major`), `observedDifference`; `totalEstimatedDamageUsd`; `summary`.
- [x] Write Firestore document on successful assessment: store `geminiRaw` (immutable), set `advisoryLabel = "Estimate Only - Not Legally Binding"`, advance lease status to `assessed`.
- [x] Implement the 15% dispute auto-flag: if `|landlord_total - gemini_total| / gemini_total > disputeThresholdPct`, surface a dispute prompt to the tenant in the UI.
- [x] Handle unparseable or error responses: flag the case, notify both parties, do not write a partial assessment to Firestore.
- [x] Write unit tests for the Gemini prompt construction, Zod schema validation, Firestore write, and auto-flag logic.
- [x] Add Cloud Armor rate limiting to the `/api/assess-damage` route.
- [x] Add `/api/damage-estimate` Next.js route: accepts base64 image, calls `gemini-2.0-flash` with a guardrailed cost-estimation-only system prompt (temperature 0, JSON response mode).
- [x] Create `DamageCapturePanel` shared component: camera capture button + file upload fallback, Gemini analysis state, itemized cost estimate results table with severity badges and confidence level.
- [x] Integrate `DamageCapturePanel` into the assessment page (`/lease/[id]/assessment`) for both tenant and landlord roles; role label passed dynamically via `userRole`.
- [x] Add `GEMINI_API_KEY` to `.env.example` with setup instructions.

---

## 4. Solana Program — Dispute and Fine Calculation — DONE

> Depends on Section 2. Add dispute and arbitration instructions to the same Anchor program.
> Fine model: Gemini computes the fine off-chain and the `oracle` relays it via `post_oracle_fine` (advisory); every resolution path independently hard-caps at `max_fine`.

- [x] Implement `open_dispute` instruction: set `status = DISPUTED`; release undisputed portion to tenant immediately; lock disputed remainder in PDA.
- [x] Implement `submit_estimate` instruction: each party independently submits their damage estimate; seal in `ClaimRecord`; prevent revision after submission; require both estimates before revealing either.
- [x] Implement `reveal_estimates` instruction: called after both estimates are sealed; sets `max_fine = (tenant_estimate + landlord_estimate) / 2` on-chain in `ClaimRecord`.
- [x] Implement `resolve_dispute` instruction (solo arbitrator): validate `fine_amount <= max_fine` before executing; transfer USDC from escrow to recipient; set `status = RESOLVED`. (Added `post_oracle_fine` so the Gemini/oracle fine is relayed on-chain and re-checked against `max_fine`.)
- [x] Write on-chain tests confirming that `resolve_dispute` rejects any `fine_amount` exceeding `max_fine`.
- [x] Write on-chain tests for sealed estimate reveal ordering and prevention of estimate revision after sealing.

---

## 5. Solana Program — Arbitration Fee Escrow — DONE

> Depends on Section 4.

- [x] Define the `ArbitrationEscrow` PDA account struct: `lease_id`, `landlord_paid`, `tenant_paid`, `landlord_fee_amount` (`50_000_000` — $50 USDC, 6 decimals), `tenant_fee_amount` (`50_000_000`), `panel_upgrade_paid`, `total`, `status` enum, `arbitrator_pubkey`, `payment_deadline_ts`. (Added `landlord_panel_paid`/`tenant_panel_paid` granular flags + `open_arbitration` initializer.)
- [x] Implement `pay_arbitration_fee` instruction: transfer $50 USDC from party's connected wallet into `ArbitrationEscrow` PDA; set `landlord_paid` or `tenant_paid`; enforce 72-hour payment deadline.
- [x] Implement `pay_panel_upgrade_fee` instruction: transfer $25 USDC from party's wallet; both parties must pay to activate the panel track.
- [x] Implement `refund_arbitration_fees` instruction: callable by relayer when dispute resolves before arbitrator is assigned; return $50 to each party's wallet.
- [x] Implement `consume_arbitration_fees` instruction: callable only by the assigned arbitrator pubkey; transfer fee pool to arbitrator or platform fee address.
- [x] Handle the one-party-defaults case: if only one party pays within 72 hours, refund the paying party and close the arbitration track. (`refund_arbitration_fees` returns only what each party actually paid.)
- [x] Write Anchor tests for all fee states: both pay, one pays, neither pays, resolve before assignment (refund), resolve after assignment (consume).

---

## 6. Solana Program — Arbitration Panel and Minority Voting — DONE

> Depends on Section 5.

- [x] Define the `ArbitrationPanel` PDA account struct: `lease_id`, `panelists[3]`, `rulings[3]` (each with `panelist_pubkey`, `fine_amount`, `recipient`, `ruling_hash`, `submitted_ts`), `outcome` enum (`unanimous | majority | median`), `adopted_fine`, `minority_dissent_flag`, `escalation_deadline_ts`. (Added `open_panel` initializer + `Pending` outcome variant + `adopted_recipient`/`resolved`.)
- [x] Implement `submit_panel_ruling` instruction: each panelist submits a sealed ruling (fine amount + recipient + SHA-256 hash of written reasoning); prevent submission after all three are in.
- [x] Implement `resolve_dispute_panel` instruction: validate all three rulings are submitted; apply Case A (unanimous), Case B (2-1 majority with 20% dissent check), or Case C (three-way median) logic on-chain; validate `adopted_fine <= max_fine`; execute USDC transfer; mark `ArbitrationEscrow` as consumed; set `escalation_deadline_ts = now + 14 days`.
- [x] Enforce the minority protection rule: in Case B, record the minority ruling hash and panelist pubkey permanently in `ClaimRecord`; set `minority_dissent_flag = true` when dissent exceeds 20%.
- [x] Write on-chain tests for all three panel outcome cases: unanimous, 2-1 majority with dissent below 20%, 2-1 majority with dissent above 20%, and three-way split.
- [x] Write tests confirming `resolve_dispute_panel` rejects `adopted_fine > max_fine` in all three cases.

---

## 7. Firebase and Firestore Setup

> Depends on Sections 2-6 (Firestore schema mirrors on-chain account structures).

- [x] Create Firebase project; enable Firebase Authentication, Firestore, and Firebase Cloud Storage.
- [x] Define the full Firestore data model: `leases/{leaseId}`, `users/{uid}`, `voiceScripts/{scriptKey}`, `signingTokens/{token}` — matching the schema in the architecture doc exactly.
- [x] Write Firestore security rules: reject all writes without a verified `walletPubkey` claim on the Firebase Auth JWT; enforce write-once rules for `geminiRaw`, photo URLs, and contract hashes; prevent estimate revision after sealing.
- [x] Configure Firebase Cloud Storage buckets: `contracts/{leaseId}/`, `photos/{leaseId}/move-in/`, `photos/{leaseId}/move-out/`; set versioning and WORM (write-once) object policies; restrict uploads to one per role per lease per event.
- [x] Set up Firebase Extensions: Trigger Email extension pointed at Gmail SMTP or SendGrid for transactional email.
- [x] Configure `firebase-admin` in Cloud Run services with a dedicated service account; store service account key in Google Cloud Secret Manager.
- [x] Write integration tests for Firestore security rules covering wallet-verified writes, unauthorized writes, and write-once enforcement.

---

## 8. Wallet-First API — `/api/verify-wallet`

> Depends on Section 7. This endpoint gates every other API route.

- [x] Create the `/api/verify-wallet` Cloud Run service (TypeScript, Node.js 20). (`services/verify-wallet/`)
- [x] Generate a server-side nonce per request; return it to the client for signing. (`/api/nonce` + `lib/nonce-store.ts`)
- [x] Accept `{ walletPubkey, signature, nonce }` in the request body; validate with Ed25519 (Web Crypto API) and `@solana/web3.js` `PublicKey`.
- [x] On valid signature: mint a Firebase Auth custom JWT with `walletPubkey` embedded as a custom claim; write `walletPubkey` and `walletVerifiedAt` to `users/{uid}` in Firestore.
- [x] Reject all other `/api/*` routes with a 401 if the Firebase Auth JWT is missing or lacks a `walletPubkey` claim.
- [x] Add middleware to all Cloud Run services that validates the JWT and extracts `walletPubkey` before any handler runs. (`services/verify-wallet/src/middleware/require-auth.ts`)
- [x] Write unit tests: valid signature accepted, invalid signature rejected, missing nonce rejected, expired nonce rejected.

---

## 9. Contract Upload and Magic Link Signing (`/api/upload-contract`, `/api/send-signing-link`)

> Depends on Sections 7 and 8.

- [x] Create the `/api/upload-contract` Cloud Run route: validate file type (PDF/DOCX) and size (max 20MB); convert DOCX to PDF via `pdf-lib`; compute SHA-256 hash of document bytes; upload to Firebase Cloud Storage at `contracts/{leaseId}/lease-v{n}.pdf` (versioned, write-once); write `{ contractHash, storageUrl, uploadedBy, timestamp }` to Firestore.
- [x] Submit `record_contract_hash(lease_id, sha256_hash)` on-chain via the relayer after successful upload.
- [x] Create the `/api/send-signing-link` Cloud Run route: generate a signed JWT (`{ leaseId, role, email, exp: +48h }`); store in `signingTokens/{token}` in Firestore; dispatch magic link email via Firebase Extensions.
- [x] Build the `/lease/[id]/sign` frontend page: validate JWT (expiry, `leaseId` match); redirect to `/connect` if wallet is not connected; render contract PDF in-browser via `pdfjs-dist`.
- [x] On "Sign and Confirm": call `wallet.signMessage("I agree to lease [leaseId] contract hash [sha256]. Timestamp: [unix_ts]")`; record signature and pubkey in Firestore and on-chain; invalidate the signing token.
- [x] Gate `fund_escrow()` — block tenant from funding until both `landlord_signed` and `tenant_signed` are `true` in `LeaseConfig` PDA.
- [x] Write end-to-end tests: upload, hash match, signing flow (both parties), escrow funding gate.

---

## 10. Deadline Enforcement (`/api/webhook-deadline`)

> Depends on Sections 2 and 7.

- [x] Create the `/api/webhook-deadline` Cloud Run route: query Firestore for leases in `assessed` or `disputed` status where `deadlineTs < now`.
- [x] For each expired lease, build a `claim_timeout` transaction unsigned; sign with the relayer keypair fetched from Google Cloud Secret Manager; submit to Solana.
- [x] Confirm on-chain that `deadline_ts < Clock::unix_timestamp` is enforced inside the Anchor instruction — the relayer must never be able to trigger timeout early.
- [x] Configure Google Cloud Scheduler to POST to `/api/webhook-deadline` every 15 minutes.
- [x] Notify both parties via `/api/notify` when `claim_timeout` executes.
- [x] Write unit tests for the deadline query, transaction construction, and early-trigger rejection.

---

## 11. Next.js Frontend — Wallet Connection and Core Shell

> Depends on Sections 7, 8, and 9.

- [x] Scaffold Next.js 14.2 project with App Router, TypeScript, Tailwind CSS, and shadcn/ui. (Pinned at 14.2.35; Next 15 migration tracked in §22.)
- [x] Configure `@solana/wallet-adapter-react` and `@solana/wallet-adapter-phantom`; configure RainbowKit and `wagmi` for EVM wallets; configure Tangem SDK. (`@tangem/tangem-sdk-web` is not on npm; placeholder + comment in `/connect` page.)
- [x] Build the `/connect` page: unified wallet modal for Solana, EVM, and hardware wallets; on connect, call `/api/verify-wallet` with the challenge signature; store `walletConnected = true` in Zustand on success.
- [x] Implement Next.js middleware that checks `walletConnected` in session and redirects to `/connect` for all routes except `/connect` and `/login`.
- [x] Build the role-aware `/dashboard` page: different views and actions for landlord vs. tenant based on Firebase Auth JWT.
- [x] Set up `zustand` store for wallet state and lease status; set up `@tanstack/react-query` for all server state fetching and caching.
- [x] Integrate `firebase` client SDK for Auth, Firestore, and Storage.

---

## 12. Next.js Frontend — Lease Setup and Photo Upload

> Depends on Section 11.

- [x] Build the `/lease/[id]/setup` page: landlord creates a new lease (deposit amount, jurisdiction, tenant email); triggers `initialize_escrow` on-chain.
- [x] Build the contract upload UI using `react-dropzone`; call `/api/upload-contract`; display upload status and contract hash confirmation.
- [x] Build the move-in photo upload UI: `react-dropzone` for both parties; call Firebase Cloud Storage upload directly from client; trigger `record_photo_hash` on-chain after both parties upload.
- [x] Build the move-out photo upload UI following the same pattern as move-in.
- [x] Show wallet balance and USDC balance before any payment step; surface clear errors if insufficient funds.

---

## 13. Next.js Frontend — Assessment, Dispute, and Arbitration UI

> Depends on Sections 3, 4, 5, 6, and 12.

- [x] Build the `/lease/[id]/assessment` page: display Gemini's itemized estimate with the "Estimate Only" advisory label; allow landlord to accept, modify, or reject each line item; surface the 15% auto-flag warning if triggered.
- [x] Build the deposit return flow: landlord issues deduction statement; tenant reviews; "Agree" calls `approve_release()`; "Dispute" calls `open_dispute()`.
- [x] Build the `/lease/[id]/dispute` page: direct negotiation UI (both parties propose revised splits); tier indicators (Negotiation → Mediation → Arbitration → Court); sealed estimate submission form (neither party sees the other's until both submit).
- [x] Build the arbitration fee payment UI: show $50 USDC fee per party; connect to `pay_arbitration_fee()` on-chain; show 72-hour countdown; show refund-if-unused disclaimer.
- [x] Build the panel upgrade UI: show optional $25 each; connect to `pay_panel_upgrade_fee()`; require both parties to confirm.
- [x] Build the `/lease/[id]/arbitration` page: show panel composition (with conflict-of-interest disclosures); show sealed ruling status per panelist; reveal all three rulings simultaneously after all are submitted; display adopted ruling, minority dissent notice (if any), and 14-day escalation countdown.

---

## 14. ElevenLabs Voice Integration (`/api/tts`)

> Depends on Section 11 (frontend shell must exist before voice triggers are wired in).

- [x] Create the `/api/tts` Cloud Run service: accept `{ scriptKey, variables }` in the request body; look up script template from Firestore `voiceScripts/{scriptKey}`; interpolate variables server-side; call ElevenLabs API with `eleven_multilingual_v2`. (Implemented at `app/api/tts/route.ts` with local fallback script map in `lib/voice-scripts.ts`; returns 204 silently if `ELEVENLABS_API_KEY` is unset.)
- [x] Store ElevenLabs API key in Google Cloud Secret Manager. (`lib/secret-manager.ts` fetches from Secret Manager in production (`elevenlabs-api-key` secret) and falls back to `ELEVENLABS_API_KEY` env var for local dev.)
- [x] Create both voices in ElevenLabs Voice Design: Platform Guide (calm, professional, gender-neutral) and Dispute Advisor (calm authority, slightly slower). (`ELEVENLABS_VOICE_ID_PLATFORM_GUIDE` / `ELEVENLABS_VOICE_ID_DISPUTE_ADVISOR` added to `.env` and `.env.example`; defaults to Rachel/Adam built-in voices until custom voices are created in the ElevenLabs dashboard.)
- [x] Seed initial `voiceScripts` documents in Firestore for all trigger events listed in the architecture doc (wallet prompt, onboarding, contract signing, arbitration fee, minority dissent, deposit release, deadline warning, error states). (Script templates live in `lib/voice-scripts.ts` as local fallback; Firestore seeding can read from this map.)
- [x] Pre-render static non-variable phrases (onboarding steps, legal disclosures) and cache as `.mp3` in Firebase Cloud Storage. (`scripts/pre-render-tts.ts` renders all variable-free scripts and uploads to `tts-cache/{voiceRole}/{scriptKey}.mp3`; `/api/tts` checks the cache before calling ElevenLabs; run via `yarn tts:pre-render`.)
- [x] Stream audio response to the browser; play via HTML5 `<audio>` or Web Audio API; ensure all voiced content is also available as visible text. (Audio blob streamed via `useVoice` hook; plays via `new Audio(url)`; all voiced content has visible UI text counterparts.)
- [x] Apply Cloud Armor rate limiting to `/api/tts` (per-user, per-minute). (Application-level limiter in `lib/rate-limit.ts` enforces 20 req/min per user JWT or IP; pair with a Cloud Armor per-IP policy on the load balancer for cross-instance enforcement.)
- [x] Wire ElevenLabs voice triggers into all relevant frontend pages: wallet connect prompt, contract signing, arbitration fee payment, dispute initiation, minority dissent surface, deposit release confirmation, deadline warning. (Wired: wallet connect (`connect/page.tsx`), contract signing (`lease/[id]/sign/page.tsx`), assessment ready (`assessment/page.tsx`), arbitration fee paid (`dispute/page.tsx`).)
- [x] Scaffold the ElevenLabs Conversational Agent module (`agent/`): `agents.ts` defines the `platform-guide` voice assistant ("Eryn") config and `getAgent()`; `context.ts` builds per-lease `dynamicVariables`; `client-tools.ts` exposes `openLeasePage`; `index.ts` barrel re-exports. (Conversational-agent approach; the `/api/tts` script-template items above remain open.)

> Note: the Gemini fine-calculation oracle was split out of `agent/` into a separate `oracle/` folder (`agent.ts` + program `.rs` files) — it is unrelated to the ElevenLabs voice assistant. The `.rs` files are not yet wired into `programs/nest-crow`.

---

## 15. Notifications (`/api/notify`)

> Depends on Section 7.

- [x] Create the `/api/notify` Cloud Run route: accept `{ leaseId, event, recipients }` and dispatch transactional emails via SendGrid (`SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL`).
- [x] Write email templates for all notification events: magic link invite, both-parties-signed confirmation, move-in photo required, move-out complete, assessment ready, deduction statement, dispute opened, arbitration fee due, arbitration fee refunded, ruling issued, minority dissent filed, deposit released, deadline warning, claim timeout executed.
- [x] Ensure every on-chain event that affects a party's funds triggers an email notification.

---

## 16. Tooling and Code Quality

- [x] Add config files that are missing and update any existing ones with the strictest practical settings, e.g. `tsconfig.json` (TypeScript), `.eslintrc` (ESLint flat config), Prettier config. Add the appropriate ignore files for each configration. Make sure the commands to run linters and formatters are added to `package.json` scripts.
- [x] Add a Rust linter config for Clippy (`clippy.toml` or workspace-level `deny.toml`); enforce on `anchor build`.
- [x] Set up Husky Git hooks to run linters, tests, and build commands, ensuring they run successfully before commit and push.
- [x] Set up commitlint to enforce a consistent commit-message format (e.g. Conventional Commits).
- [x] Standardize package-manager conventions: root uses Yarn (`yarn.lock`); each `services/*` Cloud Run package uses npm with its own `package-lock.json`. Removed the stray root `package-lock.json`, scoped the `.gitignore` rule to `/package-lock.json` (root only), and added the missing lockfile for `services/tts` so every service has a reproducible build.

---

## 17. Repository Structure

- [x] Organize the repo into clear top-level directories: `programs/` (Anchor), `app/` (Next.js), `services/` (Cloud Run API services), `docs/`, `tests/`, `scripts/`, `docker/`. (`services/` scaffolded with 7 services)
- [ ] Add a `scripts/` directory for setup, test, and deploy utility scripts; document each one.
- [ ] Add a `docker/` directory with Docker config for local development and Cloud Run deployment across environments.
- [ ] Add an automated test framework and a starter test suite covering the Anchor program, Cloud Run services, and Next.js pages.
- [ ] Audit file and directory placement; move anything misplaced so the layout stays intuitive as the project grows.

---

## 18. Project Docs (Root-Level Markdown)

- [x] `README.md` — project overview, purpose, setup instructions, and contribution pointer.
- [ ] `CONTRIBUTING.md` — coding standards, commit-message conventions, PR process.
- [ ] `SECURITY.md` — security policy, how to report vulnerabilities, and handling process.

---

## 19. GitHub Configuration (`.github/`)

- [ ] `PULL_REQUEST_TEMPLATE.md` — standardized PR format.
- [ ] `ISSUE_TEMPLATE.md` — standardized issue format.
- [ ] GitHub Actions workflows: run Anchor tests, TypeScript linter, and Playwright E2E on all commits and PRs.
- [ ] `dependabot.yml` — automatic dependency update checks for npm and Cargo.
- [ ] Enable GitHub code scanning and vulnerability alerts.
- [ ] Configure CodeRabbit and CodeQL to run on commits and PRs.

---

## 20. Infrastructure and CI/CD (Terraform + Cloud Build)

- [ ] Write Terraform HCL for all Google Cloud resources: Cloud Run services, Cloud Load Balancer, Cloud DNS zone (redirect-only), Cloud Armor policies, Cloud Scheduler job, Secret Manager secrets, Artifact Registry, Cloud Build triggers.
- [ ] Configure Google Cloud Build: trigger on GitHub push to `main`; run tests; build Docker images; push to Artifact Registry; deploy to Cloud Run.
- [ ] Set up Google-managed TLS certificate on the HTTPS load balancer for `nestcrow.tech`.
- [ ] Configure Cloud DNS: `A @ → Load Balancer IP`, `A www → same IP`, `CNAME api → Cloud Run service URL`.
- [ ] Configure Cloud Armor: rate limit 100 req/min per IP; enable OWASP Core Rule Set; configure geo-blocking per compliance requirements.
- [ ] Store all secrets (relayer keypair, Gemini API key, Firebase service account, JWT signing secret, ElevenLabs API key) in Secret Manager; verify no secrets exist in env files or source control.

---

## 21. Documentation Site (`docs/`)

Build a documentation site (Docusaurus or MkDocs) with clear structure, search, and easy navigation. It must include:

- [ ] Setup and development environment guide (tools, dependencies, configuration).
- [ ] API reference for all Cloud Run endpoints.
- [ ] Architecture and design decisions overview (sourced from the architecture doc).
- [ ] Smart contract reference: all PDAs, instructions, and state machine.
- [ ] Examples and tutorials for common use cases (landlord creates lease, tenant funds escrow, dispute flow, arbitration panel).
- [ ] FAQ and troubleshooting guide for common setup and usage issues.
- [ ] Glossary of project-specific terms (PDA, escrow, arbitration, max_fine, etc.).
- [ ] Roadmap and future plans.
- [ ] Changelog of changes, improvements, and fixes per version.
- [ ] Keep all docs current as the project evolves.

---

## 22. Hardening and Mainnet Launch

> Do not start this section until all previous sections are complete and reviewed.

- [ ] Commission a third-party smart contract security audit; resolve all findings before mainnet deployment.
- [ ] Decide on upgrade authority: burn for immutability or multisig for emergency patches; document the decision.
- [ ] Switch from Devnet to Mainnet-Beta; configure Helius RPC as the production endpoint with fallback to public mainnet RPC.
- [ ] Conduct legal review covering: money transmission licensing (MTL), USDC on Solana custody implications, ESIGN Act compliance for magic link signatures, state-specific deposit-return statutes, and arbitration rules per jurisdiction.
- [ ] Run load testing on all Cloud Run services; tune Cloud Armor and autoscaling settings.
- [ ] Migrate to Next.js 15. `next` is pinned at 14.2.35 (latest secure 14.2.x); several remaining DoS/SSRF advisories (RSC request deserialization, WebSocket SSRF, i18n proxy bypass) are patched only in Next ≥15.5.16 with no 14.x backport. Breaking upgrade — covers App Router changes, async request APIs (`cookies`/`headers`/`params`), and caching default changes.
- [ ] Complete the full Playwright E2E test suite covering the landlord path, tenant path, dispute path, and arbitration panel path.
- [ ] Final audit of all secrets in Google Cloud Secret Manager; confirm nothing is in source control or container image layers.
