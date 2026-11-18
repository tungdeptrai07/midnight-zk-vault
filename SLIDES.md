# NightShield ZK Vault  |  AKINDO Midnight Wave 3 (4,000 USDT)

## Slide 1: NightShield: Privacy-First Payroll & Compliance on Midnight
*Zero-Knowledge Attestations with Compact 0.16..0.22 Dual-Ledger State*

- **Problem**: On-chain payroll & compliance leak employee salaries and secret identities.
- **Solution**: NightShield Compact contract proves tier eligibility while hiding salaries.
- **Apache-2.0 Open Source**: Includes contracts/nightshield.compact, witnesses, and simulator.

## Slide 2: Dual-Ledger Compact Architecture
*Selective disclosure via persistentHash commitments and nullifier replay protection*

- **Private Witnesses**: local_secret_key, get_private_salary_band, get_private_salt stay local.
- **Public Ledger**: Only admin_pk, reserve_commitment, latest_nullifier, and tier disclosed.
- **Verified QA**: 3/3 unit tests verify zero salary/key leakage and replay rejection.
