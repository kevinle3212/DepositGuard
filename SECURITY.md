# Security Policy

## Supported Versions

| Version         | Supported                    |
| --------------- | ---------------------------- |
| `main` (latest) | Yes                          |
| older commits   | No — please update to `main` |

## Scope

The following are **in scope** for security reports:

- Solana / Anchor smart contract vulnerabilities (the `programs/nest-crow` program on devnet/mainnet)
- Authentication and wallet verification flaws (`/api/verify-wallet`, JWT handling)
- Privilege escalation — accessing another user's lease data or funds
- Firestore security rule bypasses
- Secret leakage (keys, service accounts) in source, logs, or container layers
- Injection vulnerabilities (SQL, command, prompt injection into Gemini/ElevenLabs)
- Cloud Run endpoint abuse (authentication bypass, IDOR, SSRF)

The following are **out of scope**:

- Vulnerabilities in third-party dependencies with no direct exploit path in this project
- Social engineering or phishing attacks
- Theoretical or unproven issues with no reproducer
- Rate-limiting findings on test/devnet environments

## Reporting a Vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

1. Email **mattstne@icloud.com** with the subject line `[SECURITY] NestCrow — <brief title>`.
2. Include:
    - A clear description of the vulnerability
    - Steps to reproduce (or a minimal proof-of-concept)
    - Affected component(s) and version/commit
    - Your assessment of impact and severity (CVSS score if possible)
3. You will receive an acknowledgement within **48 hours**.

## Handling Process

| Step                                   | Timeline                                                  |
| -------------------------------------- | --------------------------------------------------------- |
| Acknowledgement                        | ≤ 48 hours                                                |
| Initial triage and severity assessment | ≤ 5 business days                                         |
| Fix developed and reviewed             | Depends on severity (critical: ≤ 7 days; high: ≤ 30 days) |
| Coordinated disclosure / CVE published | After fix is deployed                                     |

We follow responsible disclosure. We ask that you do not publish details until a fix has been deployed, or until 90 days have elapsed from initial report, whichever comes first.

## Smart Contract Risks

NestCrow holds USDC in on-chain escrow PDAs. Any finding that could allow unauthorized withdrawal of funds or permanent lock of deposits is treated as **critical severity** and will be patched before mainnet launch. All critical findings discovered before mainnet will be included in the mandatory third-party audit scope (TODO §22).

## Acknowledgements

We appreciate responsible disclosure. Reporters of confirmed vulnerabilities will be credited in the release notes (with their consent).
