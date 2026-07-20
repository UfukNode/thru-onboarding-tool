"use strict";

const fs = require("node:fs/promises");
const http = require("node:http");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { buildAction, buildInstallSteps, createSeed, redactResult } = require("./lib/actions");

const host = process.env.HOST || (process.env.CODESPACES === "true" ? "0.0.0.0" : "127.0.0.1");
let port = Number.parseInt(process.env.PORT || process.argv[2] || "5173", 10);
const root = __dirname;
const safeRoot = root.endsWith(path.sep) ? root : `${root}${path.sep}`;
const COMMAND_TIMEOUT_MS = 120000;

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

function send(response, statusCode, body, contentType = "text/plain; charset=utf-8") {
  response.writeHead(statusCode, {
    "Cache-Control": "no-store",
    "Content-Type": contentType,
    "X-Content-Type-Options": "nosniff",
  });
  response.end(body);
}

function sendJson(response, statusCode, payload) {
  send(response, statusCode, JSON.stringify(payload), "application/json; charset=utf-8");
}

async function readJson(request) {
  let body = "";
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 1024 * 32) {
      throw new Error("Request body is too large.");
    }
  }

  return body ? JSON.parse(body) : {};
}

function runProcess(command, args, options = {}) {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    const child = spawn(command, args, {
      cwd: root,
      env: process.env,
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
    }, options.timeout || COMMAND_TIMEOUT_MS);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString("utf8");
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf8");
    });

    child.on("error", (error) => {
      clearTimeout(timer);
      resolve({
        ok: false,
        code: error.code === "ENOENT" ? 127 : 1,
        stdout: "",
        stderr: error.code === "ENOENT" ? `${command} is not installed or not in PATH.` : error.message,
        durationMs: Date.now() - startedAt,
      });
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({
        ok: code === 0 && !timedOut,
        code: timedOut ? 124 : code,
        stdout,
        stderr: timedOut ? `${command} timed out.` : stderr,
        durationMs: Date.now() - startedAt,
      });
    });
  });
}

async function runSteps(steps, options = {}) {
  const results = [];

  for (const step of steps) {
    const result = await runProcess(step.command, step.args, options);
    results.push({
      ...result,
      command: `${step.command} ${step.args.map((arg) => (/\s/.test(arg) ? JSON.stringify(arg) : arg)).join(" ")}`,
    });

    if (!result.ok) {
      break;
    }
  }

  return results;
}

async function checkCommand(command, args = ["--version"]) {
  const result = await runProcess(command, args, { timeout: 7000 });
  return {
    command,
    ok: result.ok,
    version: result.ok ? (result.stdout || result.stderr).trim().split("\n")[0] : "",
    error: result.ok ? "" : result.stderr.trim(),
  };
}

async function handleStatus(response) {
  const checks = await Promise.all([
    checkCommand("node", ["--version"]),
    checkCommand("npm", ["--version"]),
    checkCommand("thru", ["--version"]),
    checkCommand("jq", ["--version"]),
    checkCommand("openssl", ["version"]),
    checkCommand("make", ["--version"]),
  ]);

  sendJson(response, 200, { ok: true, platform: process.platform, checks });
}

async function handleRun(request, response) {
  const body = await readJson(request);
  const action = typeof body.action === "string" ? body.action : "";
  const input = body.input && typeof body.input === "object" ? body.input : {};
  const built = buildAction(action, input);
  const result = await runProcess(built.command, built.args);
  const stdout = redactResult(action, result.stdout);
  const stderr = redactResult(action, result.stderr);
  const ok = result.ok || (action === "keysGenerateDefault" && /already exists/i.test(stderr));

  sendJson(response, ok ? 200 : 500, {
    ok,
    action,
    command: `${built.command} ${built.args.map((arg) => (/\s/.test(arg) ? JSON.stringify(arg) : arg)).join(" ")}`,
    code: result.code,
    stdout,
    stderr,
    durationMs: result.durationMs,
    sensitive: Boolean(built.sensitive),
  });
}

async function handleInstallInfo(request, response) {
  const body = await readJson(request);
  const info = buildInstallSteps(body.tool);
  sendJson(response, 200, { ok: true, ...info });
}

async function handleInstall(request, response) {
  const body = await readJson(request);
  const info = buildInstallSteps(body.tool);
  const results = await runSteps(info.steps, { timeout: 600000 });
  const ok = results.length > 0 && results.every((result) => result.ok);

  sendJson(response, ok ? 200 : 500, {
    ok,
    ...info,
    results,
  });
}

async function handleApi(request, response, pathname) {
  try {
    if (request.method === "GET" && pathname === "/api/status") {
      await handleStatus(response);
      return;
    }

    if (request.method === "POST" && pathname === "/api/seed") {
      sendJson(response, 200, { ok: true, seed: createSeed() });
      return;
    }

    if (request.method === "POST" && pathname === "/api/install-info") {
      await handleInstallInfo(request, response);
      return;
    }

    if (request.method === "POST" && pathname === "/api/install") {
      await handleInstall(request, response);
      return;
    }

    if (request.method === "POST" && pathname === "/api/run") {
      await handleRun(request, response);
      return;
    }

    sendJson(response, 404, { ok: false, error: "Not found." });
  } catch (error) {
    sendJson(response, 400, { ok: false, error: error.message });
  }
}

async function handleStatic(response, pathname) {
  const safePathname = pathname === "/" ? "/index.html" : pathname;
  const filePath = path.normalize(path.join(root, decodeURIComponent(safePathname)));

  if (filePath !== root && !filePath.startsWith(safeRoot)) {
    send(response, 403, "Forbidden");
    return;
  }

  const body = await fs.readFile(filePath);
  send(response, 200, body, contentTypes[path.extname(filePath)] || "application/octet-stream");
}

const server = http.createServer(async (request, response) => {
  try {
    const requestUrl = new URL(request.url, `http://${request.headers.host}`);
    if (requestUrl.pathname.startsWith("/api/")) {
      await handleApi(request, response, requestUrl.pathname);
      return;
    }

    await handleStatic(response, requestUrl.pathname);
  } catch (error) {
    if (error.code === "ENOENT") {
      send(response, 404, "Not found");
      return;
    }

    send(response, 500, "Server error");
  }
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    if (port < 5190) {
      port += 1;
      console.warn(`Port ${port - 1} is already in use. Trying ${port}...`);
      server.listen(port, host);
      return;
    }

    console.error("Ports 5173-5190 are already in use.");
    process.exit(1);
  }

  if (error.code === "EPERM") {
    console.error(`Cannot bind to http://${host}:${port}. Try another port or check local permissions.`);
    process.exit(1);
  }

  throw error;
});

server.listen(port, host, () => {
  const visibleHost = host === "0.0.0.0" ? "127.0.0.1" : host;
  console.log(`Thru Onboarding Tool running at http://${visibleHost}:${port}`);
  if (process.env.CODESPACES === "true") {
    console.log(`Codespaces will forward port ${port}. Open it from the Ports tab.`);
  }
});
