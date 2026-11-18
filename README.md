# NightShield ZK Vault — Privacy-First Payroll & Compliance on Midnight

Submission for **Build Privacy-First Apps on Midnight (3rd Wave)** on AKINDO (`#TypeScript`, `#Compact`, `#midnightntwrk`).

## Overview
**NightShield ZK Vault** enables organizations and DAOs on Midnight Network to verify payroll compliance, credit tiers, and reserve solvency on the public ledger while keeping **individual salaries, contributor secret keys, and witness salts strictly private**.

## Midnight Compact Contract (`contracts/nightshield.compact`)
- **Language Version**: `pragma language_version >= 0.16 && <= 0.22;` with `import CompactStandardLibrary;`
- **Public Ledger (`export ledger`)**: `status`, `vault_initialized`, `admin_pk`, `reserve_commitment`, `latest_nullifier`, `latest_payroll_commit`, `latest_tier`, `verified_claims_count`.
- **Private Witnesses (`witness`)**: `local_secret_key()`, `get_private_salary_band()`, `get_private_salt()`, `get_requested_tier()`, `record_local_receipt()`.
- **Exported Circuits (`export circuit`)**:
  - `initialize_vault(initial_reserve_commit: Bytes<32>)`: Derives admin public key via `persistentHash` and initializes the active vault.
  - `submit_private_attestation()`: Proves membership and salary tier in zero-knowledge, prevents double-claims via domain-separated nullifier (`nightshield:nullifier:v1`), and selectively discloses only the commitment and tier (`disclose()`).
  - `pause_vault()` / `resume_vault()`: Admin-authenticated emergency controls.

## License
Licensed under the **Apache License 2.0** (see [`LICENSE`](LICENSE)).

## Run & Test Locally
```bash
python -m unittest discover -s tests -v
python backend/server.py
# Open http://127.0.0.1:8092
```
