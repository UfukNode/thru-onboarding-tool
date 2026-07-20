"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { buildAction, buildInstallSteps, createSeed, redactResult } = require("../lib/actions");

test("builds fixed health action without shell text", () => {
  assert.deepEqual(buildAction("health"), {
    command: "thru",
    args: ["--json", "getversion"],
  });
  assert.deepEqual(buildAction("keysGenerateDefault"), {
    command: "thru",
    args: ["keys", "generate", "default"],
    sensitive: true,
  });
  assert.deepEqual(buildAction("balance", {}).args, ["--json", "getbalance", "default"]);
});

test("validates faucet amount range", () => {
  assert.deepEqual(buildAction("faucet", { amount: 10000 }).args, ["--json", "faucet", "withdraw", "default", "10000"]);
  assert.throws(() => buildAction("faucet", { amount: 10001 }), /between 1 and 10000/);
  assert.throws(() => buildAction("faucet", { amount: "1; rm -rf" }), /between 1 and 10000/);
});

test("validates token mint inputs", () => {
  const seed = "a".repeat(64);
  const publicKey = "arttTtvqOGeI69sPaozNRFOILvn0YN4lgjXHWE_D2Hofv";
  const action = buildAction("tokenInitializeMint", {
    publicKey,
    symbol: "CAT",
    seed,
    decimals: 6,
  });

  assert.deepEqual(action.args, ["--json", "token", "initialize-mint", publicKey, "CAT", seed, "--decimals", "6"]);
  assert.throws(() => buildAction("tokenInitializeMint", { publicKey, symbol: "cat", seed, decimals: 6 }), /Symbol is invalid/);
  assert.throws(() => buildAction("tokenInitializeMint", { publicKey, symbol: "CAT", seed: "bad", decimals: 6 }), /Seed is invalid/);
});

test("validates name service records", () => {
  const domainAccount = "domainAccount_12345678901234567890";
  const parentAccount = "taOSypORDk1SVZts1jObbVQYROMzgT5mEYen1LM9ZVNf_8";
  assert.deepEqual(buildAction("nameserviceDeriveRegistrar", { rootName: "rootname" }).args, [
    "--json",
    "nameservice",
    "derive-registrar-account",
    "rootname",
  ]);
  assert.deepEqual(buildAction("nameserviceDeriveDomain", { parentAccount, domainName: "subname" }).args, [
    "--json",
    "nameservice",
    "derive-domain-account",
    parentAccount,
    "subname",
  ]);
  const action = buildAction("nameserviceAppendRecord", {
    domainAccount,
    recordKey: "com.twitter",
    recordValue: "@mztacat",
  });

  assert.deepEqual(action.args, ["--json", "nameservice", "append-record", domainAccount, "com.twitter", "@mztacat"]);
  assert.throws(() =>
    buildAction("nameserviceAppendRecord", {
      domainAccount,
      recordKey: "bad key",
      recordValue: "x",
    }),
  );
});

test("creates 32-byte hex seeds", () => {
  assert.match(createSeed(), /^[a-f0-9]{64}$/);
});

test("redacts default private key output", () => {
  const output = '{"keys":{"name":"default","value":"secret-private-key","public_key":"abc"}}';
  assert.equal(redactResult("keysGetDefault", output), '{"keys":{"name":"default","value":"[hidden-private-key]","public_key":"abc"}}');
});

test("builds platform install steps from allowlist only", () => {
  assert.deepEqual(buildInstallSteps("thru", "darwin").commands, ["npm i -g thru"]);
  assert.deepEqual(buildInstallSteps("jq", "darwin").commands, ["brew install jq"]);
  assert.deepEqual(buildInstallSteps("node", "linux").commands, [
    "sudo apt update",
    "sudo apt install -y nodejs npm",
  ]);
  assert.deepEqual(buildInstallSteps("thruSdkC", "linux").commands, ["thru dev sdk install c"]);
  assert.throws(() => buildInstallSteps("jq; rm -rf", "darwin"), /Unknown install tool/);
});
