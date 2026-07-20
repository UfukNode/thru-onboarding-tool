"use strict";

const STORAGE_KEY = "thru-local-starter-state-v3";
const DEVICE_ID_KEY = "thru-local-starter-device-id-v2";
const FIXED_DEFAULTS = {
  faucetAmount: "10000",
  mintAmount: "1000000000",
  recordKey: "url",
};

const state = {
  busy: false,
  checks: [],
  publicKey: "",
  privateKey: "",
  balance: "",
  mint: "",
  domain: "",
  proofLog: [],
  selectedInstallTool: "",
  selectedInstallCommands: [],
  signatures: [],
  tokenAccount: "",
};

const elements = {
  appendRecordButton: document.querySelector("#appendRecordButton"),
  autoMintAmountInput: document.querySelector("#autoMintAmountInput"),
  autoRecordValueInput: document.querySelector("#autoRecordValueInput"),
  autoRootNameInput: document.querySelector("#autoRootNameInput"),
  autoTimeline: document.querySelector("#autoTimeline"),
  autoTokenSymbolInput: document.querySelector("#autoTokenSymbolInput"),
  balanceButton: document.querySelector("#balanceButton"),
  checkGrid: document.querySelector("#checkGrid"),
  clearOutputButton: document.querySelector("#clearOutputButton"),
  copyInstallButton: document.querySelector("#copyInstallButton"),
  copyProofButton: document.querySelector("#copyProofButton"),
  domainAccountInput: document.querySelector("#domainAccountInput"),
  evidenceGrid: document.querySelector("#evidenceGrid"),
  exportJsonButton: document.querySelector("#exportJsonButton"),
  exportMarkdownButton: document.querySelector("#exportMarkdownButton"),
  faucetAmountInput: document.querySelector("#faucetAmountInput"),
  faucetButton: document.querySelector("#faucetButton"),
  healthButton: document.querySelector("#healthButton"),
  installCommand: document.querySelector("#installCommand"),
  installSdkButton: document.querySelector("#installSdkButton"),
  installThruButton: document.querySelector("#installThruButton"),
  installTitle: document.querySelector("#installTitle"),
  installToolchainButton: document.querySelector("#installToolchainButton"),
  initRootButton: document.querySelector("#initRootButton"),
  initializeMintButton: document.querySelector("#initializeMintButton"),
  initializeTokenAccountButton: document.querySelector("#initializeTokenAccountButton"),
  listRecordsButton: document.querySelector("#listRecordsButton"),
  mintAccountInput: document.querySelector("#mintAccountInput"),
  mintAmountInput: document.querySelector("#mintAmountInput"),
  mintSeedButton: document.querySelector("#mintSeedButton"),
  mintSeedInput: document.querySelector("#mintSeedInput"),
  panels: document.querySelectorAll("[data-panel]"),
  publicKeyInput: document.querySelector("#publicKeyInput"),
  prepareAccountButton: document.querySelector("#prepareAccountButton"),
  createDemoNameButton: document.querySelector("#createDemoNameButton"),
  createDemoTokenButton: document.querySelector("#createDemoTokenButton"),
  refreshAfterInstallButton: document.querySelector("#refreshAfterInstallButton"),
  refreshStatusButton: document.querySelector("#refreshStatusButton"),
  registerSubdomainButton: document.querySelector("#registerSubdomainButton"),
  registrarInput: document.querySelector("#registrarInput"),
  resolveRecordButton: document.querySelector("#resolveRecordButton"),
  rootNameInput: document.querySelector("#rootNameInput"),
  runInstallButton: document.querySelector("#runInstallButton"),
  serverStatus: document.querySelector("#serverStatus"),
  subdomainInput: document.querySelector("#subdomainInput"),
  summaryBalance: document.querySelector("#summaryBalance"),
  summaryDomain: document.querySelector("#summaryDomain"),
  summaryMint: document.querySelector("#summaryMint"),
  summaryPublicKey: document.querySelector("#summaryPublicKey"),
  tabs: document.querySelectorAll("[data-tab]"),
  tokenAccountInput: document.querySelector("#tokenAccountInput"),
  tokenAccountSeedButton: document.querySelector("#tokenAccountSeedButton"),
  tokenAccountSeedInput: document.querySelector("#tokenAccountSeedInput"),
  tokenDecimalsInput: document.querySelector("#tokenDecimalsInput"),
  tokenSymbolInput: document.querySelector("#tokenSymbolInput"),
  updateThruButton: document.querySelector("#updateThruButton"),
  mintToButton: document.querySelector("#mintToButton"),
  recordKeyInput: document.querySelector("#recordKeyInput"),
  recordValueInput: document.querySelector("#recordValueInput"),
  resetSavedButton: document.querySelector("#resetSavedButton"),
};

function setBusy(isBusy) {
  state.busy = isBusy;
  document.querySelectorAll("button").forEach((button) => {
    button.disabled = isBusy;
  });
}

function shortValue(value) {
  if (!value) {
    return "-";
  }

  return value.length > 18 ? `${value.slice(0, 8)}...${value.slice(-6)}` : value;
}

function getDeviceId() {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    const bytes = new Uint8Array(8);
    crypto.getRandomValues(bytes);
    id = [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
    localStorage.setItem(DEVICE_ID_KEY, id);
  }

  return id;
}

function suggestedRootName() {
  const source = state.publicKey || getDeviceId();
  const compact = source.toLowerCase().replace(/[^a-z0-9]/g, "");
  return `root${compact.slice(-10)}`;
}

function prettyJson(text) {
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text.trim();
  }
}

function appendOutput(title, payload) {
  const timestamp = new Date().toLocaleTimeString();
  const chunks = [`[${timestamp}] ${title}`];

  if (payload.command) {
    chunks.push(`$ ${payload.command}`);
  }

  if (payload.stdout) {
    chunks.push(prettyJson(payload.stdout));
  }

  if (payload.stderr) {
    chunks.push(payload.stderr.trim());
  }

  if (Array.isArray(payload.results)) {
    payload.results.forEach((result) => {
      chunks.push(`$ ${result.command}`);
      if (result.stdout) {
        chunks.push(result.stdout.trim());
      }
      if (result.stderr) {
        chunks.push(result.stderr.trim());
      }
    });
  }

  if (payload.error) {
    chunks.push(payload.error);
  }

  console.info(chunks.join("\n"));
}

function addTimeline(label, status = "running") {
  const item = document.createElement("div");
  item.className = `timeline-item is-${status}`;
  item.dataset.label = label;
  item.innerHTML = `<span></span><strong>${escapeHtml(label)}</strong>`;
  elements.autoTimeline.prepend(item);
  return item;
}

function finishTimeline(item, status = "done") {
  if (!item) {
    return;
  }

  item.classList.remove("is-running", "is-failed", "is-done", "is-skipped");
  item.classList.add(`is-${status}`);
}

function renderSummary() {
  if (!elements.autoRootNameInput.value.trim()) {
    elements.autoRootNameInput.value = suggestedRootName();
  }
  elements.summaryPublicKey.textContent = shortValue(state.publicKey);
  elements.summaryBalance.textContent = state.balance || "-";
  elements.summaryMint.textContent = shortValue(state.mint);
  elements.summaryDomain.textContent = shortValue(state.domain);
  renderEvidence();
  saveState();
}

function proofSnapshot() {
  return {
    exportedAt: new Date().toISOString(),
    publicKey: state.publicKey,
    privateKey: state.privateKey,
    balance: state.balance,
    mint: state.mint,
    tokenAccount: state.tokenAccount,
    domain: state.domain,
    signatures: state.signatures,
    inputs: {
      faucetAmount: elements.faucetAmountInput.value.trim(),
      tokenSymbol: elements.autoTokenSymbolInput.value.trim(),
      mintAmount: elements.autoMintAmountInput.value.trim(),
      rootName: elements.autoRootNameInput.value.trim(),
      subdomain: elements.subdomainInput.value.trim(),
      recordKey: elements.recordKeyInput.value.trim(),
      recordValue: elements.autoRecordValueInput.value.trim(),
    },
    proofLog: state.proofLog,
  };
}

function requireField(input, label) {
  const value = input.value.trim();
  if (!value) {
    input.focus();
    addTimeline(`${label} is required`, "failed");
    appendOutput("Missing input.", { error: `${label} is required.` });
    return "";
  }

  return value;
}

function renderEvidence() {
  const rows = [
    { label: "Public key", value: state.publicKey },
    { label: "Balance", value: state.balance },
    { label: "Mint account", value: state.mint },
    { label: "Token account", value: state.tokenAccount },
    { label: "Domain account", value: state.domain },
    { label: "Last signature", value: state.signatures[0] || "" },
    { label: "Private key", value: state.privateKey, private: true },
  ];

  elements.evidenceGrid.innerHTML = rows
    .map(
      ({ label, value, private: isPrivate }) => `
        <div class="evidence-item ${isPrivate ? "is-private" : ""}">
          <span>${escapeHtml(label)}</span>
          <strong title="${escapeHtml(isPrivate && value ? "Keep this private key safe." : value || "")}">${escapeHtml(shortValue(value))}</strong>
          <div class="evidence-row-actions">
            <button class="secondary-button evidence-copy" type="button" data-copy-value="${escapeHtml(value || "")}">Copy</button>
            ${value && !isPrivate ? `<a class="secondary-button evidence-copy" href="${explorerUrl(label, value)}" target="_blank" rel="noreferrer">Explorer</a>` : ""}
          </div>
          ${isPrivate ? `<p class="private-key-warning">Save this private key somewhere safe. Do not share it with anyone.</p>` : ""}
        </div>
      `,
    )
    .join("");

  elements.evidenceGrid.querySelectorAll("[data-copy-value]").forEach((button) => {
    button.addEventListener("click", () => copyText(button.dataset.copyValue || ""));
  });

}

function explorerUrl(label, value) {
  const encodedValue = encodeURIComponent(value);
  const rpc = "rpc=https%3A%2F%2Frpc.alphanet.thru.org";
  if (/signature/i.test(label)) {
    return `https://scan.thru.org/tx/${encodedValue}?${rpc}`;
  }

  return `https://scan.thru.org/address/${encodedValue}?${rpc}`;
}

function saveState() {
  const saved = {
    balance: state.balance,
    domain: state.domain,
    mint: state.mint,
    proofLog: state.proofLog,
    privateKey: state.privateKey,
    publicKey: state.publicKey,
    signatures: state.signatures,
    tokenAccount: state.tokenAccount,
    autoMintAmount: elements.autoMintAmountInput.value.trim(),
    autoRecordValue: elements.autoRecordValueInput.value.trim(),
    autoRootName: elements.autoRootNameInput.value.trim(),
    autoTokenSymbol: elements.autoTokenSymbolInput.value.trim(),
    domainAccount: elements.domainAccountInput.value.trim(),
    faucetAmount: elements.faucetAmountInput.value.trim(),
    mintAccount: elements.mintAccountInput.value.trim(),
    publicKeyInput: elements.publicKeyInput.value.trim(),
    recordKey: elements.recordKeyInput.value.trim(),
    recordValue: elements.recordValueInput.value.trim(),
    rootName: elements.rootNameInput.value.trim(),
    subdomain: elements.subdomainInput.value.trim(),
    tokenAccountInput: elements.tokenAccountInput.value.trim(),
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
}

function loadState() {
  let saved = {};
  try {
    saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
  if (saved.autoTokenSymbol === "CAT") {
    saved.autoTokenSymbol = "";
  }
  if (/^myroot\d*$/i.test(saved.autoRootName || "")) {
    saved.autoRootName = "";
  }
  if (saved.subdomain === "alice") {
    saved.subdomain = "";
  }
  if (saved.autoRecordValue === "https://example.com" || saved.recordValue === "https://example.com") {
    saved.autoRecordValue = "";
    saved.recordValue = "";
  }
  state.balance = saved.balance || "";
  state.domain = saved.domain || saved.domainAccount || "";
  state.mint = saved.mint || saved.mintAccount || "";
  state.proofLog = Array.isArray(saved.proofLog) ? saved.proofLog : [];
  state.privateKey = saved.privateKey || "";
  state.publicKey = saved.publicKey || saved.publicKeyInput || "";
  state.signatures = Array.isArray(saved.signatures) ? saved.signatures : [];
  state.tokenAccount = saved.tokenAccount || saved.tokenAccountInput || "";
  elements.autoMintAmountInput.value = saved.autoMintAmount || elements.autoMintAmountInput.value;
  elements.autoRecordValueInput.value = saved.autoRecordValue || elements.autoRecordValueInput.value;
  elements.autoRootNameInput.value = saved.autoRootName || elements.autoRootNameInput.value;
  elements.autoTokenSymbolInput.value = saved.autoTokenSymbol || elements.autoTokenSymbolInput.value;
  elements.domainAccountInput.value = saved.domainAccount || state.domain;
  elements.faucetAmountInput.value = saved.faucetAmount || elements.faucetAmountInput.value;
  elements.mintAccountInput.value = saved.mintAccount || state.mint;
  elements.publicKeyInput.value = saved.publicKeyInput || state.publicKey;
  elements.recordKeyInput.value = saved.recordKey || elements.recordKeyInput.value;
  elements.recordValueInput.value = saved.recordValue || elements.autoRecordValueInput.value;
  elements.rootNameInput.value = saved.rootName || elements.autoRootNameInput.value;
  elements.subdomainInput.value = saved.subdomain || elements.subdomainInput.value;
  elements.tokenAccountInput.value = saved.tokenAccountInput || state.tokenAccount;
  elements.faucetAmountInput.value = elements.faucetAmountInput.value || FIXED_DEFAULTS.faucetAmount;
  elements.autoMintAmountInput.value = elements.autoMintAmountInput.value || FIXED_DEFAULTS.mintAmount;
  elements.recordKeyInput.value = elements.recordKeyInput.value || FIXED_DEFAULTS.recordKey;
}

function renderChecks() {
  const required = new Set(["node", "npm", "thru"]);
  const allRequiredOk = state.checks.filter((check) => required.has(check.command)).every((check) => check.ok);

  elements.serverStatus.textContent = allRequiredOk ? "Ready for Thru" : "Missing local tools";
  elements.serverStatus.classList.toggle("is-ready", allRequiredOk);
  elements.serverStatus.classList.toggle("is-warning", !allRequiredOk);
  elements.checkGrid.innerHTML = state.checks
    .map((check) => {
      const detail = check.ok ? check.version : check.error || "Not found";
      return `
        <button class="check-item ${check.ok ? "is-ok" : "is-missing"}" type="button" data-install-tool="${check.command}">
          <span>${check.command}</span>
          <strong>${check.ok ? "Ready" : "Missing"}</strong>
          <code>${escapeHtml(detail)}</code>
        </button>
      `;
    })
    .join("");

  elements.checkGrid.querySelectorAll("[data-install-tool]").forEach((button) => {
    button.addEventListener("click", () => selectInstallTool(button.dataset.installTool));
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

async function apiJson(path, options = {}) {
  const response = await fetch(path, {
    headers: {
      "Content-Type": "application/json",
    },
    ...options,
  });
  const payload = await response.json();
  if (!response.ok || !payload.ok) {
    throw Object.assign(new Error(payload.error || payload.stderr || "Request failed."), { payload });
  }

  return payload;
}

async function refreshStatus() {
  setBusy(true);
  try {
    const payload = await apiJson("/api/status");
    state.checks = payload.checks;
    renderChecks();
    appendOutput("System check completed.", { stdout: JSON.stringify(payload.checks, null, 2) });
  } catch (error) {
    appendOutput("System check failed.", error.payload || { error: error.message });
  } finally {
    setBusy(false);
  }
}

async function selectInstallTool(tool) {
  setBusy(true);
  try {
    const payload = await apiJson("/api/install-info", {
      method: "POST",
      body: JSON.stringify({ tool }),
    });
    state.selectedInstallTool = tool;
    state.selectedInstallCommands = payload.commands;
    elements.installTitle.textContent = `${tool} install`;
    elements.installCommand.textContent = payload.commands.join("\n");
  } catch (error) {
    appendOutput("Install info failed.", error.payload || { error: error.message });
  } finally {
    setBusy(false);
  }
}

async function runInstall(tool = state.selectedInstallTool) {
  if (!tool) {
    appendOutput("Pick a tool first.", { error: "Click a tool card or quick action first." });
    return;
  }

  setBusy(true);
  try {
    const payload = await apiJson("/api/install", {
      method: "POST",
      body: JSON.stringify({ tool }),
    });
    appendOutput(`${tool} install completed.`, payload);
    addProofEntry(`${tool} install`, {
      command: payload.commands.join(" && "),
      code: payload.ok ? 0 : 1,
      stdout: JSON.stringify(payload.results || [], null, 2),
      stderr: "",
    });
    await refreshStatus();
  } catch (error) {
    const payload = error.payload || { error: error.message };
    appendOutput(`${tool} install failed.`, payload);
    addProofEntry(`${tool} install`, {
      command: payload.commands ? payload.commands.join(" && ") : tool,
      code: 1,
      stdout: JSON.stringify(payload.results || [], null, 2),
      stderr: payload.error || error.message,
    }, "failed");
  } finally {
    setBusy(false);
  }
}

async function copyInstallCommand() {
  const text = state.selectedInstallCommands.join("\n");
  if (!text) {
    appendOutput("Copy failed.", { error: "Pick a tool first." });
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    appendOutput("Install command copied.", { stdout: text });
  } catch {
    appendOutput("Copy this install command.", { stdout: text });
  }
}

async function copyText(text) {
  if (!text) {
    appendOutput("Nothing to copy.", { error: "This value is empty." });
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    appendOutput("Copied.", { stdout: text });
  } catch {
    appendOutput("Copy manually.", { stdout: text });
  }
}

function addProofEntry(label, payload, status = "ok") {
  const combined = `${payload.stdout || ""}\n${payload.stderr || ""}`;
  const signatures = extractSignatures(combined);
  state.signatures = [...new Set([...signatures, ...state.signatures])].slice(0, 20);
  state.proofLog.unshift({
    at: new Date().toISOString(),
    label,
    status,
    command: payload.command || "",
    code: payload.code ?? "",
    stdout: payload.stdout || "",
    stderr: payload.stderr || "",
    signatures,
  });
  state.proofLog = state.proofLog.slice(0, 100);
  renderEvidence();
  saveState();
}

function extractSignatures(text) {
  const signatures = new Set();
  const explicit = text.match(/(?:signature|tx|transaction)[\s:=]+([A-Za-z0-9_-]{32,140})/gi) || [];
  explicit.forEach((line) => {
    const match = line.match(/([A-Za-z0-9_-]{32,140})$/);
    if (match) {
      signatures.add(match[1]);
    }
  });

  const thruSignatures = text.match(/\bts[A-Za-z0-9_-]{30,138}\b/g) || [];
  thruSignatures.forEach((signature) => signatures.add(signature));
  return [...signatures];
}

function proofMarkdown() {
  const snapshot = proofSnapshot();
  const lines = [
    "# Thru Proof",
    "",
    `Exported: ${snapshot.exportedAt}`,
    `Public key: ${snapshot.publicKey || "-"}`,
    `Private key: ${snapshot.privateKey || "-"}`,
    `Private key note: Save this key somewhere safe. Do not share it with anyone.`,
    `Balance: ${snapshot.balance || "-"}`,
    `Mint account: ${snapshot.mint || "-"}`,
    `Token account: ${snapshot.tokenAccount || "-"}`,
    `Domain account: ${snapshot.domain || "-"}`,
    `Signatures: ${snapshot.signatures.length ? snapshot.signatures.join(", ") : "-"}`,
    "",
    "## Actions",
  ];

  snapshot.proofLog.forEach((entry) => {
    const signatures = Array.isArray(entry.signatures) ? entry.signatures : [];
    lines.push(`- ${entry.at} | ${entry.label} | ${entry.status} | ${entry.command || "-"}`);
    if (signatures.length) {
      lines.push(`  Signatures: ${signatures.join(", ")}`);
    }
  });

  return lines.join("\n");
}

function exportFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function exportProofJson() {
  exportFile("thru-proof.json", JSON.stringify(proofSnapshot(), null, 2), "application/json");
}

function exportProofMarkdown() {
  exportFile("thru-proof.md", proofMarkdown(), "text/markdown");
}

async function copyProof() {
  await copyText(proofMarkdown());
}

async function runAction(action, input = {}, label = action) {
  setBusy(true);
  try {
    const payload = await apiJson("/api/run", {
      method: "POST",
      body: JSON.stringify({ action, input }),
    });
    appendOutput(label, payload);
    captureUsefulValues(payload.stdout);
    captureTextValues(payload.stderr);
    addProofEntry(label, payload, payload.ok ? "ok" : "failed");
    return payload;
  } catch (error) {
    const payload = error.payload || { error: error.message };
    appendOutput(`${label} failed.`, payload);
    addProofEntry(label, payload, "failed");
    return null;
  } finally {
    setBusy(false);
    renderSummary();
  }
}

async function generateSeed(input) {
  setBusy(true);
  try {
    const payload = await apiJson("/api/seed", { method: "POST", body: "{}" });
    input.value = payload.seed;
    appendOutput("Seed generated.", { stdout: payload.seed });
  } catch (error) {
    appendOutput("Seed generation failed.", error.payload || { error: error.message });
  } finally {
    setBusy(false);
  }
}

function captureUsefulValues(stdout) {
  if (!stdout) {
    return;
  }

  captureTextValues(stdout);

  let parsed = null;
  try {
    parsed = JSON.parse(stdout);
  } catch {
    return;
  }

  const privateKey = findPrivateKey(parsed);
  if (privateKey) {
    state.privateKey = privateKey;
  }

  const publicKey = findFirstString(parsed, ["public_key", "publicKey", "pubkey", "address", "account", "account_address"]);
  if (publicKey && !state.publicKey) {
    state.publicKey = publicKey;
    elements.publicKeyInput.value = publicKey;
  }

  const balance = findFirstString(parsed, ["balance", "amount", "lamports"]);
  if (balance) {
    state.balance = String(balance);
  }

  const mint = findFirstString(parsed, ["mint_account", "mint"]);
  if (mint) {
    state.mint = mint;
    elements.mintAccountInput.value = mint;
  }

  const tokenAccount = findFirstString(parsed, ["token_account"]);
  if (tokenAccount) {
    state.tokenAccount = tokenAccount;
    elements.tokenAccountInput.value = tokenAccount;
  }

  const registrar = findFirstString(parsed, ["registrar_account"]);
  if (registrar) {
    elements.registrarInput.value = registrar;
  }

  const domain = findFirstString(parsed, ["domain_account"]);
  if (domain) {
    state.domain = domain;
    elements.domainAccountInput.value = domain;
  }
}

function captureTextValues(text) {
  const publicKey = matchLabel(text, ["public key", "public_key", "pubkey", "address"]);
  if (publicKey && !state.publicKey) {
    state.publicKey = publicKey;
    elements.publicKeyInput.value = publicKey;
  }

  const balance = matchLabel(text, ["balance"]);
  if (balance) {
    state.balance = balance;
  }

  const mint = matchLabel(text, ["mint account", "mint_account", "mint"]);
  if (mint) {
    state.mint = mint;
    elements.mintAccountInput.value = mint;
  }

  const tokenAccount = matchLabel(text, ["token account", "token_account"]);
  if (tokenAccount) {
    state.tokenAccount = tokenAccount;
    elements.tokenAccountInput.value = tokenAccount;
  }

  const registrar = matchLabel(text, ["registrar account", "registrar_account"]);
  if (registrar) {
    elements.registrarInput.value = registrar;
  }

  const domain = matchLabel(text, ["domain account", "domain_account"]);
  if (domain) {
    state.domain = domain;
    elements.domainAccountInput.value = domain;
  }
}

function matchLabel(text, labels) {
  for (const label of labels) {
    const pattern = new RegExp(`${label.replace(/[ _]/g, "[ _-]?")}\\s*[:=]\\s*([A-Za-z0-9_./:@-]{3,240})`, "i");
    const match = text.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return "";
}

function findFirstString(value, keys) {
  if (!value || typeof value !== "object") {
    return "";
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findFirstString(item, keys);
      if (found) {
        return found;
      }
    }
    return "";
  }

  for (const [key, item] of Object.entries(value)) {
    if (keys.includes(key) && (typeof item === "string" || typeof item === "number")) {
      return String(item);
    }

    const found = findFirstString(item, keys);
    if (found) {
      return found;
    }
  }

  return "";
}

function findPrivateKey(value) {
  if (!value || typeof value !== "object") {
    return "";
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findPrivateKey(item);
      if (found) {
        return found;
      }
    }
    return "";
  }

  for (const [key, item] of Object.entries(value)) {
    if (typeof item === "string") {
      if (["private_key", "privateKey", "secret_key", "secretKey"].includes(key)) {
        return item;
      }

      if (key === "value" && parentHasDefaultKeyShape(value)) {
        return item;
      }
    }

    const found = findPrivateKey(item);
    if (found) {
      return found;
    }
  }

  return "";
}

function parentHasDefaultKeyShape(value) {
  return (
    value &&
    typeof value === "object" &&
    typeof value.value === "string" &&
    (value.name === "default" || typeof value.public_key === "string" || typeof value.publicKey === "string")
  );
}

function activePublicKey() {
  const value = elements.publicKeyInput.value.trim();
  state.publicKey = value || state.publicKey;
  return state.publicKey;
}

function isToolReady(tool) {
  return state.checks.some((check) => check.command === tool && check.ok);
}

async function autoStep(label, task, options = {}) {
  const item = addTimeline(label);
  const result = await task();
  const ok = options.optional ? true : result !== null && result !== false;
  finishTimeline(item, ok ? "done" : "failed");
  renderSummary();
  return result;
}

async function prepareAccount() {
  elements.autoTimeline.textContent = "";
  const faucetAmount = requireField(elements.faucetAmountInput, "Faucet amount");
  if (!faucetAmount) {
    return;
  }

  setBusy(true);
  setBusy(false);

  await autoStep("Checking local tools", refreshStatus);

  if (!isToolReady("thru")) {
    await autoStep("Installing Thru CLI", () => runInstall("thru"));
    await autoStep("Refreshing tools", refreshStatus);
  }

  const health = await autoStep("Running Thru health check", () => runAction("health", {}, "Thru health check"));
  if (!health) {
    return;
  }

  let key = await autoStep("Reading default key", () => runAction("keysGetDefault", {}, "Read default key"), { optional: true });
  if (!key) {
    await autoStep("Creating default key", () => runAction("keysGenerateDefault", {}, "Create default key"));
    key = await autoStep("Reading created key", () => runAction("keysGetDefault", {}, "Read default key"), { optional: true });
  }

  await autoStep("Creating on-chain account", () => runAction("accountCreate", {}, "Create on-chain account"), { optional: true });
  await autoStep("Requesting faucet", () => runAction("faucet", { amount: faucetAmount }, "Request faucet"), {
    optional: true,
  });
  await autoStep("Checking balance", () => runAction("balance", { publicKey: activePublicKey() || "default" }, "Check balance"), {
    optional: true,
  });

  if (state.publicKey) {
    elements.autoRootNameInput.value = suggestedRootName();
  }
  addTimeline("Account flow finished", "done");
  renderSummary();
}

async function createDemoToken() {
  elements.autoTimeline.textContent = "";
  const tokenSymbol = requireField(elements.autoTokenSymbolInput, "Token symbol");
  const mintAmount = requireField(elements.autoMintAmountInput, "Mint amount");
  if (!tokenSymbol || !mintAmount) {
    return;
  }

  elements.tokenSymbolInput.value = tokenSymbol.toUpperCase();
  elements.mintAmountInput.value = mintAmount;

  if (!activePublicKey()) {
    await prepareAccount();
  }

  await autoStep("Generating mint seed", () => generateSeed(elements.mintSeedInput));
  await autoStep(
    "Initializing mint",
    () =>
      runAction(
        "tokenInitializeMint",
        {
          publicKey: activePublicKey() || "default",
          symbol: elements.tokenSymbolInput.value.trim().toUpperCase(),
          seed: elements.mintSeedInput.value.trim(),
          decimals: elements.tokenDecimalsInput.value,
        },
        "Initialize mint",
      ),
    { optional: true },
  );

  await autoStep("Generating token account seed", () => generateSeed(elements.tokenAccountSeedInput));
  await autoStep(
    "Creating token account",
    () =>
      runAction(
        "tokenInitializeAccount",
        {
          mint: elements.mintAccountInput.value.trim(),
          publicKey: activePublicKey() || "default",
          seed: elements.tokenAccountSeedInput.value.trim(),
        },
        "Create token account",
      ),
    { optional: true },
  );

  await autoStep(
    "Minting supply",
    () =>
      runAction(
        "tokenMintTo",
        {
          mint: elements.mintAccountInput.value.trim(),
          tokenAccount: elements.tokenAccountInput.value.trim(),
          publicKey: activePublicKey() || "default",
          amount: elements.mintAmountInput.value.trim(),
        },
        "Mint to account",
      ),
    { optional: true },
  );

  addTimeline("Token flow finished", "done");
  renderSummary();
}

async function createDemoName() {
  elements.autoTimeline.textContent = "";
  const rootName = requireField(elements.autoRootNameInput, "Root name");
  const subdomain = requireField(elements.subdomainInput, "Subdomain");
  const recordKey = requireField(elements.recordKeyInput, "Record key");
  const recordValue = requireField(elements.autoRecordValueInput, "Record value");
  if (!rootName || !subdomain || !recordKey || !recordValue) {
    return;
  }

  elements.rootNameInput.value = rootName;
  elements.recordKeyInput.value = recordKey;
  elements.recordValueInput.value = recordValue;

  if (!activePublicKey()) {
    await prepareAccount();
  }

  await autoStep("Initializing root", () => runAction("nameserviceInitRoot", { rootName: elements.rootNameInput.value.trim() }, "Initialize root"), {
    optional: true,
  });
  await autoStep(
    "Deriving registrar account",
    () => runAction("nameserviceDeriveRegistrar", { rootName: elements.rootNameInput.value.trim() }, "Derive registrar account"),
  );
  if (!elements.registrarInput.value.trim()) {
    addTimeline("Registrar account missing", "failed");
    appendOutput("Name flow stopped.", { error: "Could not derive registrar account." });
    return;
  }

  await autoStep(
    "Registering subdomain",
    () =>
      runAction(
        "nameserviceRegisterSubdomain",
        {
          subdomain: elements.subdomainInput.value.trim(),
          registrar: elements.registrarInput.value.trim(),
        },
        "Register subdomain",
      ),
    { optional: true },
  );
  await autoStep(
    "Deriving domain account",
    () =>
      runAction(
        "nameserviceDeriveDomain",
        {
          parentAccount: elements.registrarInput.value.trim(),
          domainName: elements.subdomainInput.value.trim(),
        },
        "Derive domain account",
      ),
  );
  if (!elements.domainAccountInput.value.trim()) {
    addTimeline("Domain account missing", "failed");
    appendOutput("Name flow stopped.", { error: "Could not derive domain account." });
    return;
  }

  await autoStep(
    "Adding record",
    () =>
      runAction(
        "nameserviceAppendRecord",
        {
          domainAccount: elements.domainAccountInput.value.trim(),
          recordKey: elements.recordKeyInput.value.trim(),
          recordValue: elements.recordValueInput.value.trim(),
        },
        "Append record",
      ),
    { optional: true },
  );
  await autoStep(
    "Resolving record",
    () =>
      runAction(
        "nameserviceResolve",
        {
          domainAccount: elements.domainAccountInput.value.trim(),
          recordKey: elements.recordKeyInput.value.trim(),
        },
        "Resolve record",
      ),
    { optional: true },
  );

  addTimeline("Name flow finished", "done");
  renderSummary();
}

function resetSavedState() {
  localStorage.removeItem(STORAGE_KEY);
  state.balance = "";
  state.domain = "";
  state.mint = "";
  state.proofLog = [];
  state.privateKey = "";
  state.publicKey = "";
  state.signatures = [];
  state.tokenAccount = "";
  elements.domainAccountInput.value = "";
  elements.mintAccountInput.value = "";
  elements.publicKeyInput.value = "";
  elements.registrarInput.value = "";
  elements.tokenAccountInput.value = "";
  elements.autoTimeline.textContent = "";
  renderSummary();
  appendOutput("Saved values reset.", { stdout: "Local browser state cleared." });
}

function bindEvents() {
  elements.tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const target = tab.dataset.tab;
      elements.tabs.forEach((item) => item.classList.toggle("is-active", item === tab));
      elements.panels.forEach((panel) => panel.classList.toggle("is-active", panel.dataset.panel === target));
    });
  });

  document.querySelectorAll("[data-run]").forEach((button) => {
    button.addEventListener("click", () => runAction(button.dataset.run, {}, button.textContent.trim()));
  });

  elements.refreshStatusButton.addEventListener("click", refreshStatus);
  elements.refreshAfterInstallButton.addEventListener("click", refreshStatus);
  elements.prepareAccountButton.addEventListener("click", prepareAccount);
  elements.createDemoTokenButton.addEventListener("click", createDemoToken);
  elements.createDemoNameButton.addEventListener("click", createDemoName);
  elements.resetSavedButton.addEventListener("click", resetSavedState);
  elements.copyProofButton.addEventListener("click", copyProof);
  elements.exportJsonButton.addEventListener("click", exportProofJson);
  elements.exportMarkdownButton.addEventListener("click", exportProofMarkdown);
  elements.copyInstallButton.addEventListener("click", copyInstallCommand);
  elements.runInstallButton.addEventListener("click", () => runInstall());
  elements.installThruButton.addEventListener("click", async () => {
    await selectInstallTool("thru");
    await runInstall("thru");
  });
  elements.updateThruButton.addEventListener("click", async () => {
    await selectInstallTool("thruUpdate");
    await runInstall("thruUpdate");
  });
  elements.installToolchainButton.addEventListener("click", async () => {
    await selectInstallTool("thruToolchain");
    await runInstall("thruToolchain");
  });
  elements.installSdkButton.addEventListener("click", async () => {
    await selectInstallTool("thruSdkC");
    await runInstall("thruSdkC");
  });
  elements.healthButton.addEventListener("click", () => runAction("health", {}, "Thru health check"));
  elements.accountInfoButton.addEventListener("click", () => runAction("accountInfo", { publicKey: activePublicKey() }, "Verify account"));
  elements.balanceButton.addEventListener("click", () => runAction("balance", { publicKey: activePublicKey() }, "Check balance"));
  elements.faucetButton.addEventListener("click", () =>
    runAction("faucet", { amount: elements.faucetAmountInput.value }, "Request faucet"),
  );

  elements.mintSeedButton.addEventListener("click", () => generateSeed(elements.mintSeedInput));
  elements.tokenAccountSeedButton.addEventListener("click", () => generateSeed(elements.tokenAccountSeedInput));
  elements.initializeMintButton.addEventListener("click", () =>
    runAction(
      "tokenInitializeMint",
      {
        publicKey: activePublicKey(),
        symbol: elements.tokenSymbolInput.value.trim().toUpperCase(),
        seed: elements.mintSeedInput.value.trim(),
        decimals: elements.tokenDecimalsInput.value,
      },
      "Initialize mint",
    ),
  );
  elements.initializeTokenAccountButton.addEventListener("click", () =>
    runAction(
      "tokenInitializeAccount",
      {
        mint: elements.mintAccountInput.value.trim(),
        publicKey: activePublicKey(),
        seed: elements.tokenAccountSeedInput.value.trim(),
      },
      "Create token account",
    ),
  );
  elements.mintToButton.addEventListener("click", () =>
    runAction(
      "tokenMintTo",
      {
        mint: elements.mintAccountInput.value.trim(),
        tokenAccount: elements.tokenAccountInput.value.trim(),
        publicKey: activePublicKey(),
        amount: elements.mintAmountInput.value.trim(),
      },
      "Mint to account",
    ),
  );

  elements.initRootButton.addEventListener("click", () =>
    runAction("nameserviceInitRoot", { rootName: elements.rootNameInput.value.trim() }, "Initialize root"),
  );
  elements.registerSubdomainButton.addEventListener("click", () =>
    runAction(
      "nameserviceRegisterSubdomain",
      {
        subdomain: elements.subdomainInput.value.trim(),
        registrar: elements.registrarInput.value.trim(),
      },
      "Register subdomain",
    ),
  );
  elements.appendRecordButton.addEventListener("click", () =>
    runAction(
      "nameserviceAppendRecord",
      {
        domainAccount: elements.domainAccountInput.value.trim(),
        recordKey: elements.recordKeyInput.value.trim(),
        recordValue: elements.recordValueInput.value.trim(),
      },
      "Append record",
    ),
  );
  elements.resolveRecordButton.addEventListener("click", () =>
    runAction(
      "nameserviceResolve",
      {
        domainAccount: elements.domainAccountInput.value.trim(),
        recordKey: elements.recordKeyInput.value.trim(),
      },
      "Resolve record",
    ),
  );
  elements.listRecordsButton.addEventListener("click", () =>
    runAction("nameserviceListRecords", { domainAccount: elements.domainAccountInput.value.trim() }, "List records"),
  );

  elements.publicKeyInput.addEventListener("input", () => {
    state.publicKey = elements.publicKeyInput.value.trim();
    renderSummary();
  });
  [
    elements.autoMintAmountInput,
    elements.autoRecordValueInput,
    elements.autoRootNameInput,
    elements.autoTokenSymbolInput,
    elements.domainAccountInput,
    elements.faucetAmountInput,
    elements.mintAccountInput,
    elements.recordKeyInput,
    elements.recordValueInput,
    elements.rootNameInput,
    elements.subdomainInput,
    elements.tokenAccountInput,
  ].forEach((input) => input.addEventListener("input", saveState));
}

bindEvents();
loadState();
renderSummary();
refreshStatus();
