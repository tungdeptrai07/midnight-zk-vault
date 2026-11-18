const skInput = document.getElementById("skInput");
const salaryInput = document.getElementById("salaryInput");
const tierInput = document.getElementById("tierInput");
const saltInput = document.getElementById("saltInput");
const initBtn = document.getElementById("initBtn");
const attestBtn = document.getElementById("attestBtn");
const feedbackBox = document.getElementById("feedbackBox");
const ledgerBox = document.getElementById("ledgerBox");
const manifestBox = document.getElementById("manifestBox");
const txLog = document.getElementById("txLog");
const compileBadge = document.getElementById("compileBadge");
const statusBadge = document.getElementById("statusBadge");

let staticState = {
  compilation: {
    contract_file: "nightshield.compact",
    valid_syntax: true,
    pragma_version: ">= 0.16 && <= 0.22",
    exported_circuits: ["initialize_vault", "submit_private_attestation", "pause_vault", "resume_vault"],
    witnesses: ["local_secret_key", "get_private_salary_band", "get_private_salt", "get_requested_tier", "record_local_receipt"],
  },
  publicLedger: {
    status: "uninitialized",
    vault_initialized: false,
    admin_pk: "0x" + "00".repeat(32),
    reserve_commitment: "0x" + "00".repeat(32),
    latest_nullifier: "0x" + "00".repeat(32),
    latest_payroll_commit: "0x" + "00".repeat(32),
    latest_tier: "unverified",
    verified_claims_count: 0,
  },
  circuitLog: [],
};

function esc(s) {
  const d = document.createElement("div");
  d.textContent = s ?? "";
  return d.innerHTML;
}

function showMsg(msg) {
  feedbackBox.hidden = false;
  feedbackBox.textContent = msg;
}

function render(state) {
  const c = state.compilation || {};
  const l = state.publicLedger || {};
  compileBadge.textContent = c.valid_syntax ? `Compact ${c.pragma_version}: VALID` : "Compact: Invalid";
  statusBadge.textContent = `Vault: ${l.status} (${l.verified_claims_count} claims)`;

  ledgerBox.innerHTML = [
    ["status", l.status],
    ["verified_claims_count", l.verified_claims_count],
    ["latest_tier", l.latest_tier],
    ["admin_pk", String(l.admin_pk || "").slice(0, 22) + "…"],
    ["latest_nullifier", String(l.latest_nullifier || "").slice(0, 22) + "…"],
    ["latest_payroll_commit", String(l.latest_payroll_commit || "").slice(0, 22) + "…"],
  ].map(([k, v]) => `
    <div class="item-box">
      <div class="muted">${esc(k)}</div>
      <div class="ok">${esc(String(v))}</div>
    </div>
  `).join("");

  manifestBox.innerHTML = `
    <div><strong>Exported Circuits:</strong> ${esc((c.exported_circuits || []).join(", "))}</div>
    <div style="margin-top:4px"><strong>Private Witnesses:</strong> ${esc((c.witnesses || []).join(", "))}</div>
  `;

  const logs = state.circuitLog || [];
  if (logs.length) {
    txLog.innerHTML = logs.map((tx) => `
      <div class="item-box">
        <div><strong>Circuit:</strong> <span class="ok">${esc(tx.circuit)}</span></div>
        <div style="margin-top:4px"><strong>Disclosed to Public Ledger:</strong> <code>${esc(JSON.stringify(tx.disclosedPublicWrites))}</code></div>
        <div class="muted" style="margin-top:4px">Kept Strictly Private (Witnesses): ${esc((tx.privateInputsHidden || []).join(", "))}</div>
      </div>
    `).join("");
  }
}

async function refreshState() {
  try {
    const res = await fetch("/api/state");
    const ct = res.headers.get("content-type") || "";
    if (res.ok && ct.includes("application/json")) {
      staticState = await res.json();
    }
  } catch {
    // Use client-side simulator state on static GitHub Pages.
  }
  render(staticState);
}

initBtn.addEventListener("click", async () => {
  try {
    const res = await fetch("/api/initialize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adminSecretKey: skInput.value.trim(), reserveAmountUsd: 250000 }),
    });
    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("application/json")) throw new Error("Static fallback");
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed");
    staticState = data.state;
    showMsg("Executed circuit `initialize_vault` — reserve commitment & admin PK disclosed.");
    render(staticState);
  } catch (e) {
    if (e.message !== "Static fallback") {
      showMsg(e.message);
      return;
    }
    staticState.publicLedger.status = "active";
    staticState.publicLedger.vault_initialized = true;
    staticState.publicLedger.admin_pk = "0x9f8e7d6c5b4a3928172635445566778899aabbccddeeff001122334455667788";
    staticState.circuitLog.unshift({
      circuit: "initialize_vault",
      disclosedPublicWrites: { status: "active", admin_pk: staticState.publicLedger.admin_pk },
      privateInputsHidden: ["admin_secret_key", "reserve_amount_usd"],
    });
    showMsg("Executed circuit `initialize_vault` in Static Preview Mode.");
    render(staticState);
  }
});

attestBtn.addEventListener("click", async () => {
  // Rotate salt slightly if user clicks multiple times so nullifier stays fresh.
  const currentSalt = saltInput.value.trim();
  try {
    const res = await fetch("/api/attest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secretKey: skInput.value.trim(),
        salaryBandUsd: Number(salaryInput.value) || 9500,
        salt: currentSalt,
        requestedTier: tierInput.value,
      }),
    });
    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("application/json")) throw new Error("Static fallback");
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed");
    staticState = data.state;
    saltInput.value = "0x" + Math.random().toString(16).slice(2).padEnd(64, "b");
    showMsg("Executed `submit_private_attestation` — salary & secret key stayed private; nullifier disclosed!");
    render(staticState);
  } catch (e) {
    if (e.message !== "Static fallback") {
      showMsg(e.message);
      return;
    }
    if (!staticState.publicLedger.vault_initialized) {
      showMsg("Initialize the vault first (`initialize_vault`).");
      return;
    }
    const nul = "0x" + Math.random().toString(16).slice(2).padEnd(64, "c");
    const com = "0x" + Math.random().toString(16).slice(2).padEnd(64, "d");
    staticState.publicLedger.latest_nullifier = nul;
    staticState.publicLedger.latest_payroll_commit = com;
    staticState.publicLedger.latest_tier = tierInput.value;
    staticState.publicLedger.verified_claims_count += 1;
    staticState.circuitLog.unshift({
      circuit: "submit_private_attestation",
      disclosedPublicWrites: {
        latest_nullifier: nul,
        latest_payroll_commit: com,
        latest_tier: tierInput.value,
        verified_claims_count: staticState.publicLedger.verified_claims_count,
      },
      privateInputsHidden: ["local_secret_key", "private_salary_band_usd", "private_salt"],
    });
    saltInput.value = "0x" + Math.random().toString(16).slice(2).padEnd(64, "b");
    showMsg("Executed `submit_private_attestation` — private salary hidden, nullifier disclosed!");
    render(staticState);
  }
});

refreshState();
