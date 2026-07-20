"use strict";

const { spawnSync } = require("node:child_process");

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    stdio: options.stdio || "pipe",
    shell: false,
  });

  return {
    ok: result.status === 0,
    status: result.status,
    stdout: result.stdout || "",
    stderr: result.stderr || "",
  };
}

function hasCommand(command, args = ["--version"]) {
  return run(command, args).ok;
}

function installCodespacesPackages() {
  if (process.env.CODESPACES !== "true" || process.platform !== "linux") {
    return;
  }

  const missing = [];
  if (!hasCommand("jq")) missing.push("jq");
  if (!hasCommand("openssl", ["version"])) missing.push("openssl");
  if (!hasCommand("make", ["--version"])) missing.push("make", "build-essential");

  if (missing.length === 0) {
    return;
  }

  console.log(`Installing Codespaces packages: ${[...new Set(missing)].join(", ")}`);
  run("sudo", ["apt-get", "update"], { stdio: "inherit" });
  const install = run("sudo", ["apt-get", "install", "-y", ...new Set(missing)], { stdio: "inherit" });
  if (!install.ok) {
    console.warn("Some system packages could not be installed automatically. The web panel will show missing tools.");
  }
}

function installThruCli() {
  if (hasCommand("thru", ["--version"])) {
    return;
  }

  console.log("Thru CLI not found. Installing with npm...");
  const result = run("npm", ["i", "-g", "thru"], { stdio: "inherit" });
  if (!result.ok) {
    console.warn("Thru CLI could not be installed automatically. The web panel can retry from Setup.");
  }
}

installCodespacesPackages();
installThruCli();

require("../server");
