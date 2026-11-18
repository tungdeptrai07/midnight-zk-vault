"""Unit and end-to-end tests for NightShield Midnight Compact contract & simulator."""

from __future__ import annotations

import json
import sys
import threading
import unittest
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from backend.simulator import (
    NightShieldSimulator,
    PrivateWitnessState,
    verify_compact_source,
)
from backend.server import create_server


class TestNightShieldMidnightVault(unittest.TestCase):
    """Verifies Compact contract compilation check, ZK witness isolation, and circuits."""

    @classmethod
    def setUpClass(cls) -> None:
        cls.srv = create_server(port=0)
        cls.port = cls.srv.server_address[1]
        threading.Thread(target=cls.srv.serve_forever, daemon=True).start()

    @classmethod
    def tearDownClass(cls) -> None:
        cls.srv.shutdown()
        cls.srv.server_close()

    def test_compact_contract_syntax_and_circuits_valid(self) -> None:
        report = verify_compact_source()
        self.assertTrue(report.valid_syntax, f"Compact syntax errors: {report.errors}")
        self.assertIn("initialize_vault", report.exported_circuits)
        self.assertIn("submit_private_attestation", report.exported_circuits)
        self.assertIn("pause_vault", report.exported_circuits)
        self.assertIn("resume_vault", report.exported_circuits)
        self.assertEqual(len(report.ledger_fields), 8)

    def test_private_witness_never_leaks_and_nullifier_prevents_replay(self) -> None:
        sim = NightShieldSimulator()
        admin_sk = "0x" + ("11" * 32)
        sim.initialize_vault(admin_secret_key_hex=admin_sk, reserve_amount_usd=500_000)

        w1 = PrivateWitnessState(
            secret_key_hex="0x" + ("22" * 32),
            salary_band_usd=12500,
            salt_hex="0x" + ("ab" * 32),
            requested_tier="institutional_tier",
        )
        tx = sim.submit_private_attestation(w1)
        ledger_json = json.dumps(sim.get_state_snapshot()["publicLedger"])

        # Private salary (12500) and raw secret key must NOT appear in public ledger.
        self.assertNotIn("12500", ledger_json)
        self.assertNotIn("22" * 32, ledger_json)
        self.assertEqual(sim.ledger.verified_claims_count, 1)
        self.assertEqual(sim.ledger.latest_tier, "institutional_tier")
        self.assertEqual(len(w1.local_receipts), 1)
        self.assertIn("latest_nullifier", tx["disclosedPublicWrites"])

        # Replaying same secret key + salt must be rejected by nullifier check.
        with self.assertRaises(ValueError):
            sim.submit_private_attestation(w1)

        # Non-admin pause must fail; admin pause must succeed.
        with self.assertRaises(ValueError):
            sim.pause_vault("0x" + ("99" * 32))
        sim.pause_vault(admin_sk)
        self.assertEqual(sim.ledger.status, "paused")

    def test_http_api_initialize_and_attest(self) -> None:
        init_req = urllib.request.Request(
            f"http://127.0.0.1:{self.port}/api/initialize",
            data=json.dumps({"adminSecretKey": "0x" + "01" * 32, "reserveAmountUsd": 300000}).encode(),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(init_req, timeout=5) as r1:
            res1 = json.loads(r1.read().decode("utf-8"))
        self.assertEqual(res1["state"]["publicLedger"]["status"], "active")

        att_req = urllib.request.Request(
            f"http://127.0.0.1:{self.port}/api/attest",
            data=json.dumps(
                {
                    "secretKey": "0x" + "02" * 32,
                    "salaryBandUsd": 9200,
                    "salt": "0x" + "cd" * 32,
                    "requestedTier": "standard_tier",
                }
            ).encode(),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(att_req, timeout=5) as r2:
            res2 = json.loads(r2.read().decode("utf-8"))
        self.assertEqual(res2["state"]["publicLedger"]["verified_claims_count"], 1)


if __name__ == "__main__":
    unittest.main()
