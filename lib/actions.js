"use strict";

const crypto = require("node:crypto");

const MAX_FAUCET_AMOUNT = 10000;
const MAX_TOKEN_AMOUNT = 10_000_000_000_000_000n;

function asString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function requirePattern(value, label, pattern, hint) {
  const text = asString(value);
  if (!pattern.test(text)) {
    throw new Error(`${label} is invalid${hint ? `: ${hint}` : "."}`);
  }

  return text;
}

function requirePublicKey(value) {
  return requirePattern(value, "Public key", /^[A-Za-z0-9_-]{20,120}$/, "use the Thru account public key");
}

function requireReadableAccount(value) {
  const text = asString(value) || "default";
  if (text === "default") {
    return text;
  }

  return requirePublicKey(text);
}

function requireAccount(value, label) {
  return requirePattern(value, label, /^[A-Za-z0-9_-]{20,140}$/, "use the on-chain account address");
}

function requireSeed(value) {
  return requirePattern(value, "Seed", /^[a-f0-9]{64}$/i, "64 hex characters");
}

function requireSymbol(value) {
  return requirePattern(value, "Symbol", /^[A-Z][A-Z0-9]{1,11}$/, "2-12 uppercase letters or numbers");
}

function requireName(value, label) {
  return requirePattern(value, label, /^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$/i, "3-32 letters, numbers, or hyphens");
}

function requireRecordKey(value) {
  return requirePattern(value, "Record key", /^[a-z0-9][a-z0-9._-]{1,48}$/i, "2-49 letters, numbers, dots, underscores, or hyphens");
}

function requireRecordValue(value) {
  const text = asString(value);
  if (!text || text.length > 240 || /[\u0000-\u001f]/.test(text)) {
    throw new Error("Record value is invalid.");
  }

  return text;
}

function requireInt(value, label, min, max) {
  const text = String(value).trim();
  if (!/^[0-9]+$/.test(text)) {
    throw new Error(`${label} must be between ${min} and ${max}.`);
  }

  const number = Number.parseInt(text, 10);
  if (!Number.isSafeInteger(number) || number < min || number > max) {
    throw new Error(`${label} must be between ${min} and ${max}.`);
  }

  return String(number);
}

function requireBigAmount(value, label) {
  const text = requirePattern(value, label, /^[1-9][0-9]{0,30}$/, "positive integer only");
  const amount = BigInt(text);
  if (amount > MAX_TOKEN_AMOUNT) {
    throw new Error(`${label} is too large.`);
  }

  return text;
}

function createSeed() {
  return crypto.randomBytes(32).toString("hex");
}

function buildAction(action, input = {}) {
  switch (action) {
    case "health":
      return { command: "thru", args: ["--json", "getversion"] };
    case "keysList":
      return { command: "thru", args: ["--json", "keys", "list"] };
    case "keysGenerateDefault":
      return { command: "thru", args: ["keys", "generate", "default"], sensitive: true };
    case "keysGetDefault":
      return { command: "thru", args: ["--json", "keys", "get", "default"], sensitive: true };
    case "accountCreate":
      return { command: "thru", args: ["--json", "account", "create", "default"] };
    case "accountInfo":
      return { command: "thru", args: ["--json", "getaccountinfo", requireReadableAccount(input.publicKey)] };
    case "balance":
      return { command: "thru", args: ["--json", "getbalance", requireReadableAccount(input.publicKey)] };
    case "faucet":
      return {
        command: "thru",
        args: ["--json", "faucet", "withdraw", "default", requireInt(input.amount || 10000, "Faucet amount", 1, MAX_FAUCET_AMOUNT)],
      };
    case "tokenInitializeMint":
      return {
        command: "thru",
        args: [
          "--json",
          "token",
          "initialize-mint",
          requirePublicKey(input.publicKey),
          requireSymbol(input.symbol),
          requireSeed(input.seed),
          "--decimals",
          requireInt(input.decimals || 6, "Decimals", 0, 18),
        ],
      };
    case "tokenInitializeAccount":
      return {
        command: "thru",
        args: [
          "--json",
          "token",
          "initialize-account",
          requireAccount(input.mint, "Mint account"),
          requirePublicKey(input.publicKey),
          requireSeed(input.seed),
        ],
      };
    case "tokenMintTo":
      return {
        command: "thru",
        args: [
          "--json",
          "token",
          "mint-to",
          requireAccount(input.mint, "Mint account"),
          requireAccount(input.tokenAccount, "Token account"),
          requirePublicKey(input.publicKey),
          requireBigAmount(input.amount, "Mint amount"),
        ],
      };
    case "nameserviceInitRoot":
      return { command: "thru", args: ["--json", "nameservice", "init-root", requireName(input.rootName, "Root name")] };
    case "nameserviceDeriveRegistrar":
      return { command: "thru", args: ["--json", "nameservice", "derive-registrar-account", requireName(input.rootName, "Root name")] };
    case "nameserviceDeriveDomain":
      return {
        command: "thru",
        args: [
          "--json",
          "nameservice",
          "derive-domain-account",
          requireAccount(input.parentAccount, "Parent account"),
          requireName(input.domainName, "Domain name"),
        ],
      };
    case "nameserviceRegisterSubdomain":
      return {
        command: "thru",
        args: [
          "--json",
          "nameservice",
          "register-subdomain",
          requireName(input.subdomain, "Subdomain"),
          requireAccount(input.registrar, "Registrar account"),
        ],
      };
    case "nameserviceAppendRecord":
      return {
        command: "thru",
        args: [
          "--json",
          "nameservice",
          "append-record",
          requireAccount(input.domainAccount, "Domain account"),
          requireRecordKey(input.recordKey),
          requireRecordValue(input.recordValue),
        ],
      };
    case "nameserviceResolve":
      return {
        command: "thru",
        args: [
          "--json",
          "nameservice",
          "resolve",
          requireAccount(input.domainAccount, "Domain account"),
          "--key",
          requireRecordKey(input.recordKey),
        ],
      };
    case "nameserviceListRecords":
      return { command: "thru", args: ["--json", "nameservice", "list-records", requireAccount(input.domainAccount, "Domain account")] };
    default:
      throw new Error("Unknown action.");
  }
}

function commandText(step) {
  return `${step.command} ${step.args.map((arg) => (/\s/.test(arg) ? JSON.stringify(arg) : arg)).join(" ")}`;
}

function platformFamily(platform = process.platform) {
  if (platform === "darwin") {
    return "macos";
  }

  if (platform === "win32") {
    return "windows";
  }

  return "linux";
}

function buildInstallSteps(tool, platform = process.platform) {
  const family = platformFamily(platform);
  const requestedTool = asString(tool);

  const common = {
    thru: [{ command: "npm", args: ["i", "-g", "thru"] }],
    thruUpdate: [{ command: "npm", args: ["i", "-g", "thru@latest"] }],
    thruToolchain: [{ command: "thru", args: ["dev", "toolchain", "install"] }],
    thruSdkC: [{ command: "thru", args: ["dev", "sdk", "install", "c"] }],
  };

  const byPlatform = {
    macos: {
      node: [{ command: "brew", args: ["install", "node"] }],
      npm: [{ command: "brew", args: ["install", "node"] }],
      jq: [{ command: "brew", args: ["install", "jq"] }],
      openssl: [{ command: "brew", args: ["install", "openssl"] }],
      make: [{ command: "xcode-select", args: ["--install"] }],
    },
    linux: {
      node: [
        { command: "sudo", args: ["apt", "update"] },
        { command: "sudo", args: ["apt", "install", "-y", "nodejs", "npm"] },
      ],
      npm: [
        { command: "sudo", args: ["apt", "update"] },
        { command: "sudo", args: ["apt", "install", "-y", "nodejs", "npm"] },
      ],
      jq: [
        { command: "sudo", args: ["apt", "update"] },
        { command: "sudo", args: ["apt", "install", "-y", "jq"] },
      ],
      openssl: [
        { command: "sudo", args: ["apt", "update"] },
        { command: "sudo", args: ["apt", "install", "-y", "openssl"] },
      ],
      make: [
        { command: "sudo", args: ["apt", "update"] },
        { command: "sudo", args: ["apt", "install", "-y", "make", "build-essential"] },
      ],
    },
    windows: {
      node: [{ command: "winget", args: ["install", "OpenJS.NodeJS.LTS"] }],
      npm: [{ command: "winget", args: ["install", "OpenJS.NodeJS.LTS"] }],
      jq: [{ command: "winget", args: ["install", "jqlang.jq"] }],
      openssl: [{ command: "winget", args: ["install", "ShiningLight.OpenSSL"] }],
      make: [{ command: "winget", args: ["install", "GnuWin32.Make"] }],
    },
  };

  const steps = common[requestedTool] || byPlatform[family][requestedTool];
  if (!steps) {
    throw new Error("Unknown install tool.");
  }

  return {
    platform: family,
    tool: requestedTool,
    steps,
    commands: steps.map(commandText),
  };
}

function redactResult(action, text) {
  if (action !== "keysGetDefault") {
    return text;
  }

  return text.replace(/("value"\s*:\s*")[^"]+(")/g, "$1[hidden-private-key]$2");
}

module.exports = {
  buildAction,
  buildInstallSteps,
  createSeed,
  redactResult,
  validators: {
    requirePublicKey,
    requireSeed,
    requireSymbol,
  },
};
