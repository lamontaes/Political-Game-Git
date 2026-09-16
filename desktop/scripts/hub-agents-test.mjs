/* global console, process, setTimeout, URL */
/**
 * Agents tab inside the packaged private hub, in an isolated data root.
 *
 *   - start one hub-managed Codex worker from the UI (exact model/effort);
 *   - create a Claude enrollment from the UI and act as that existing Claude
 *     session through the hub's MCP endpoint with its own token;
 *   - Claude asks Codex one short question; Codex's reply arrives and is
 *     acknowledged; the owner sends Claude a message from the UI and the
 *     ledger shows Claude's acknowledgement and evidence;
 *   - Stop All stops hub-managed work only; a request sent afterwards stays
 *     queued (no inference) and is cancelled from the UI;
 *   - after a restart the managed worker is not revived.
 *
 * Usage:
 *   node scripts/hub-agents-test.mjs --hub <hub executable>
 *     --build <Internal Art Review.app> --claude-session <exact id>
 *     [--model gpt-5.6-sol] [--effort low] [--data-root <dir>]
 *     [--screenshot-dir <dir>]
 */

import { randomBytes } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { _electron as electron } from "playwright";

import { Client } from "../private-controller/node_modules/@modelcontextprotocol/sdk/dist/esm/client/index.js";
import { StreamableHTTPClientTransport } from "../private-controller/node_modules/@modelcontextprotocol/sdk/dist/esm/client/streamableHttp.js";

const args = process.argv.slice(2);
const value = (name, fallback = null) => {
  const index = args.indexOf(name);
  return index < 0 ? fallback : (args[index + 1] ?? fallback);
};
const hubExecutable = value("--hub");
const build = value("--build");
const claudeSession = value("--claude-session");
const model = value("--model", "gpt-5.6-sol");
const effort = value("--effort", "low");
if (!hubExecutable || !build || !claudeSession) {
  console.error(
    "Usage: node scripts/hub-agents-test.mjs --hub <exe> --build <app> --claude-session <id> [--model m] [--effort e] [--data-root dir] [--screenshot-dir dir]",
  );
  process.exit(2);
}
const dataRoot =
  value("--data-root") ??
  mkdtempSync(path.join(os.tmpdir(), "ocd-hub-agents-"));
mkdirSync(dataRoot, { recursive: true });
const shots = value("--screenshot-dir");
if (shots) mkdirSync(shots, { recursive: true });

const failures = [];
const check = (label, condition, detail = "") => {
  console.log(
    `${condition ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`,
  );
  if (!condition) failures.push(label);
};
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const waitFor = async (predicate, label, timeout = 60000) => {
  const deadline = Date.now() + timeout;
  for (;;) {
    const result = await predicate();
    if (result) return result;
    if (Date.now() > deadline) throw new Error(`Timed out: ${label}`);
    await sleep(500);
  }
};

const identity = JSON.parse(
  readFileSync(
    path.join(build, "Contents", "Resources", "build-identity.json"),
    "utf8",
  ),
);
writeFileSync(
  path.join(dataRoot, "state.json"),
  `${JSON.stringify(
    {
      schema: 2,
      repositoryPath: null,
      privatePackPath: null,
      selectedTrack: "main",
      tracks: {
        main: {
          branch: "main",
          current: {
            revision: identity.revision,
            appPath: path.resolve(build),
            version: identity.version,
            profile: identity.profile,
            architecture: "arm64 (fixture record)",
            installedAt: new Date().toISOString(),
            clientTreeSha256: identity.clientTreeSha256 ?? "unknown",
            privatePack: null,
          },
          pending: null,
          previous: null,
        },
      },
    },
    null,
    2,
  )}\n`,
);

async function launchHub() {
  const app = await electron.launch({
    executablePath: path.resolve(hubExecutable),
    env: {
      ...process.env,
      OCD_CONTROLLER_DATA_ROOT: dataRoot,
      OCD_HUB_SKIP_STARTUP_CHECK: "1",
      OCD_HUB_NO_BUILDS: "1",
      OCD_HUB_NO_ARTDESK_AUTOSTART: "1",
    },
  });
  const find = (pattern) =>
    waitFor(
      () => app.windows().find((page) => pattern.test(page.url())),
      String(pattern),
    );
  const chrome = await find(/^file:.*\/index\.html$/);
  const agents = await find(/^file:.*\/agents\.html$/);
  await chrome.getByRole("tab", { name: "Agents" }).click();
  await agents.waitForLoadState("domcontentloaded");
  return { app, chrome, agents };
}

async function quitHub(app) {
  await app.evaluate(({ app: electronApp }) => electronApp.quit());
  await app.waitForEvent("close", { timeout: 30000 }).catch(() => {});
}

async function mcpClient(url, token) {
  const client = new Client({ name: "hub-agents-test", version: "0.1.0" });
  await client.connect(
    new StreamableHTTPClientTransport(new URL(url), {
      requestInit: { headers: { authorization: `Bearer ${token}` } },
    }),
  );
  const call = async (name, argumentsValue) => {
    const result = await client.callTool({ name, arguments: argumentsValue });
    const parsed = JSON.parse(result.content[0].text);
    if (result.isError) throw new Error(parsed.error);
    return parsed;
  };
  return { client, call };
}

const nonce = randomBytes(4).toString("hex");
let brokerUrl = null;

// ---- Session 1 ------------------------------------------------------------
{
  const { app, agents } = await launchHub();
  await waitFor(
    async () =>
      (await agents.locator("#codex-model option").count()) > 0 &&
      (await agents.locator("#codex-effort option").count()) > 0,
    "connection check lists Codex models",
    90000,
  );
  const providerText = await agents.locator("#providers").innerText();
  check(
    "UI: connection check shows all four clients and the master-chat boundary",
    ["claude", "codex", "cursor", "antigravity", "chatgpt-master"].every((p) =>
      providerText.includes(p),
    ),
  );
  brokerUrl = (await agents.locator("#broker").innerText()).match(
    /http:\/\/127\.0\.0\.1:\d+\/mcp\/ocd/,
  )?.[0];
  check("UI: broker is on loopback", Boolean(brokerUrl), brokerUrl ?? "");

  await agents.locator("#codex-handle").fill("codex-proof");
  await agents.locator("#codex-model").selectOption(model);
  await agents.locator("#codex-effort").selectOption(effort);
  await agents.getByRole("button", { name: "Start worker" }).first().click();
  await waitFor(
    async () =>
      (await agents.locator("#people-note").innerText()).includes(
        "Started @codex-proof",
      ),
    "Codex worker started",
    60000,
  );
  const codexRow = agents.locator("#participants tr", {
    hasText: "@codex-proof",
  });
  check(
    "UI: managed Codex worker listed with exact thread, model and effort",
    (await codexRow.innerText()).includes(`${model} · ${effort}`),
    (await codexRow.innerText()).replace(/\s+/g, " "),
  );

  // Claude enrollment from the Claude card, then act as that session.
  await agents
    .locator("#providers section", { hasText: "claude" })
    .getByRole("button", { name: "Create hub enrollment" })
    .click();
  await waitFor(
    async () =>
      (await agents.locator("#enroll-out").innerText()).includes("claude-1"),
    "Claude enrollment output",
  );
  const tokenFile = (await agents.locator("#enroll-out").innerText()).match(
    /Token file \(private\): (.+claude-1\.token)/,
  )?.[1];
  const token = readFileSync(tokenFile, "utf8").trim();
  const claude = await mcpClient(brokerUrl, token);
  const bound = await claude.call("bind_session", {
    session_id: claudeSession,
    model: "claude-opus-5",
  });
  check(
    "MCP: Claude enrollment bound to the exact existing session",
    bound.sessionId === claudeSession,
  );

  const request = await claude.call("send", {
    to: "codex-proof",
    text: `Hub agents proof ${nonce}. Do not use tools. Put the exact text "nonce ${nonce}" in evidence and reply briefly.`,
    idempotency_key: `agents-proof-${nonce}`,
  });
  const reply = await waitFor(
    async () => {
      const polled = await claude.call("poll", { timeout_ms: 20000 });
      return polled.messages.find(
        (m) => m.replyTo === request.id && m.kind === "reply",
      );
    },
    "Codex reply",
    240000,
  );
  check(
    "MCP: Codex replied in the same thread from its recorded thread id",
    reply.fromSession !== claudeSession && reply.threadId === request.threadId,
    reply.text,
  );
  await claude.call("ack", { message_id: reply.id });
  await claude.call("update", {
    message_id: reply.id,
    state: "completed",
    evidence: `Claude read Codex reply for nonce ${nonce}`,
  });

  // Owner → Claude from the UI; Claude acknowledges with evidence.
  await agents.locator("#send-to").selectOption("claude-1");
  await agents.locator("#send-text").fill(`Owner check ${nonce}`);
  await agents.getByRole("button", { name: "Send", exact: true }).click();
  const ownerMessage = await waitFor(async () => {
    const polled = await claude.call("poll", { timeout_ms: 5000 });
    return polled.messages.find((m) => m.from === "owner");
  }, "owner message");
  await claude.call("ack", { message_id: ownerMessage.id });
  await claude.call("update", {
    message_id: ownerMessage.id,
    state: "completed",
    evidence: `received "${ownerMessage.text}"`,
  });
  await waitFor(
    async () =>
      (await agents.locator("#envelopes").innerText()).includes(
        `completed · claude-1 · received "Owner check ${nonce}"`,
      ),
    "ledger shows Claude's completion",
  );
  const ledger = await agents.locator("#envelopes").innerText();
  check(
    "UI: ledger shows the Codex request completed with evidence",
    ledger.includes(`nonce ${nonce}`),
  );
  if (shots)
    await agents.screenshot({
      path: path.join(shots, "agents-session1.png"),
      fullPage: true,
    });

  // Stop All: managed work only; later request stays queued, no inference.
  await agents.getByRole("button", { name: "Stop All hub work" }).click();
  await waitFor(
    async () =>
      (
        await agents
          .locator("#participants tr", { hasText: "@codex-proof" })
          .innerText()
      ).includes("stopped"),
    "worker stopped",
  );
  const late = await claude.call("send", {
    to: "codex-proof",
    text: "This must not start a turn.",
    idempotency_key: `agents-proof-late-${nonce}`,
  });
  await sleep(3000);
  const lateRow = agents.locator("#envelopes tr", {
    hasText: "This must not start a turn.",
  });
  check(
    "Stop All: a request to a stopped worker stays queued",
    (await lateRow.innerText()).includes("queued") &&
      !(await lateRow.innerText()).includes("delivered"),
  );
  await lateRow.getByRole("button", { name: "Cancel" }).click();
  await waitFor(
    async () => (await lateRow.innerText()).includes("cancelled · owner"),
    "late request cancelled",
  );
  check("UI: owner cancelled the queued request", true, late.id);
  await claude.client.close();
  await quitHub(app);
}

// ---- Session 2: restart does not revive managed workers ----------------------
{
  const { app, agents } = await launchHub();
  await waitFor(
    async () =>
      (await agents.locator("#participants").innerText()).includes(
        "@codex-proof",
      ),
    "participants after restart",
  );
  check(
    "restart: managed worker is listed but not revived",
    (
      await agents
        .locator("#participants tr", { hasText: "@codex-proof" })
        .innerText()
    ).includes("stopped"),
  );
  const history = await agents.locator("#envelopes").innerText();
  check(
    "restart: message history and states persisted",
    history.includes(`nonce ${nonce}`) && history.includes("cancelled · owner"),
  );
  await quitHub(app);
}

console.log(`Isolated hub data: ${dataRoot}`);
if (failures.length) {
  console.error(`${failures.length} agents check(s) failed.`);
  process.exit(1);
}
console.log("Hub agents checks passed.");
