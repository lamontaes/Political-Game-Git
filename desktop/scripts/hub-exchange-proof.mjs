/* global console, process, setTimeout */
/**
 * First bounded Claude↔Codex exchange through the private hub broker.
 *
 * Starts the authenticated broker, opens one hub-managed Codex app-server
 * thread (exact model and effort, no fallback), enrolls it and one existing
 * Claude session, then waits on broker events. The Claude side acts through
 * scripts/hub-peer.mjs. This proves communication, not code correctness.
 */

import { randomBytes } from "node:crypto";
import {
  appendFileSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

import {
  openBrokerStore,
  startBrokerServer,
} from "../private-controller/agents/broker.mjs";
import { CodexAppServer } from "../private-controller/agents/codex-app-server.mjs";
import {
  CodexWorker,
  Supervisor,
} from "../private-controller/agents/supervisor.mjs";

const args = process.argv.slice(2);
const value = (name, fallback = null) => {
  const index = args.indexOf(name);
  return index < 0 ? fallback : args[index + 1];
};
const dataDir = path.resolve(value("--data"));
const fixtureDir = path.resolve(value("--fixture"));
const claudeSession = value("--claude-session");
const sourceSha = value("--source-sha");
const model = value("--model", "gpt-5.6-sol");
const effort = value("--effort", "low");
const project = "ocd-proof";
const minutes = Number(value("--minutes", "20"));

mkdirSync(path.join(dataDir, "tokens"), { recursive: true, mode: 0o700 });
const eventsPath = path.join(dataDir, "events.jsonl");
const log = (event) => {
  const line = { at: new Date().toISOString(), ...event };
  appendFileSync(eventsPath, `${JSON.stringify(line)}\n`);
  console.log(JSON.stringify(line));
};

const store = openBrokerStore(path.join(dataDir, "broker"));
store.onEvent((event) => {
  if (event.type === "envelope")
    log({
      type: "envelope-state",
      id: event.envelope.id,
      kind: event.envelope.kind,
      from: event.envelope.from,
      to: event.envelope.to,
      state: event.envelope.state,
    });
});
const server = await startBrokerServer(store);
writeFileSync(
  path.join(dataDir, "broker.json"),
  JSON.stringify({ port: server.port, project }, null, 2),
);

const codex = new CodexAppServer({ cwd: fixtureDir }).start();
await codex.initialize();
const models = await codex.request("model/list", { includeHidden: false });
const listed = (models.data ?? []).find((m) => (m.id ?? m.model) === model);
if (!listed) {
  log({ type: "refused", reason: `model ${model} not exposed; no fallback` });
  process.exit(2);
}
const efforts = (listed.supportedReasoningEfforts ?? []).map(
  (e) => e.reasoningEffort ?? e,
);
if (!efforts.includes(effort)) {
  log({ type: "refused", reason: `effort ${effort} not offered` });
  process.exit(2);
}
const rate = await codex.request("account/rateLimits/read", undefined);
log({
  type: "codex-allowance",
  usedPercent: rate.rateLimits?.primary?.usedPercent ?? "unknown",
  credits: rate.rateLimits?.credits?.balance ?? "unknown",
  planType: rate.rateLimits?.planType ?? "unknown",
});
if ((rate.rateLimits?.primary?.usedPercent ?? 0) >= 99) {
  log({ type: "refused", reason: "included Codex allowance exhausted" });
  process.exit(2);
}
const thread = await codex.startThread({
  cwd: fixtureDir,
  model,
  sandbox: "read-only",
  developerInstructions:
    "You are a scratch hub participant. Keep every answer short. Never edit files.",
});
log({ type: "codex-thread", threadId: thread.id, model, effort });

const claudeEnrollment = store.enroll({
  project,
  handle: "claude-scratch",
  provider: "claude",
  sessionId: claudeSession,
  model: "claude-opus-5",
  effort: "high",
  authRoute: "Claude Desktop (existing session, hub peer CLI)",
  capability: "messaging; manual-attention (external session, no wake path)",
});
writeFileSync(
  path.join(dataDir, "tokens", "claude-scratch.token"),
  claudeEnrollment.token,
  { mode: 0o600 },
);
store.enroll({
  project,
  handle: "codex-scratch",
  provider: "codex",
  sessionId: thread.id,
  model,
  effort,
  worktree: fixtureDir,
  head: sourceSha,
  authRoute: "Codex-managed ChatGPT login (app-server)",
  capability: "messaging; automatic delivery (hub-managed)",
  managed: true,
});

const fixtureText = readFileSync(
  path.join(fixtureDir, "codex-read.txt"),
  "utf8",
);
const supervisor = new Supervisor({ store, project, log }).start();
supervisor.addWorker(
  new CodexWorker({
    handle: "codex-scratch",
    server: codex,
    threadId: thread.id,
    model,
    effort,
    expectedSha: sourceSha,
    verify: (envelope, reply) => {
      if (!/codex-read\.txt/.test(envelope.text)) return { ok: true };
      const nonceLine = fixtureText
        .split("\n")
        .find((line) => line.startsWith("nonce:"));
      return reply.evidence.includes(nonceLine.slice(7).trim())
        ? { ok: true }
        : { ok: false, reason: "fixture nonce absent from evidence" };
    },
  }),
);
log({
  type: "ready",
  port: server.port,
  proofNonce: randomBytes(4).toString("hex"),
});

const stop = async (reason) => {
  log({ type: "stopping", reason, supervisor: supervisor.status() });
  await supervisor.stopAll();
  codex.stop();
  await server.close();
  store.close();
  process.exit(0);
};
process.on("SIGTERM", () => void stop("SIGTERM"));
process.on("SIGINT", () => void stop("SIGINT"));
setTimeout(() => void stop("time limit"), minutes * 60000);
