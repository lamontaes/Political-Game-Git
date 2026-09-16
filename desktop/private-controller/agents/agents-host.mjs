/**
 * The hub's Agents tab backend: one app-owned broker, one supervisor, and
 * explicitly started hub-managed workers. Nothing starts inference on its
 * own: a worker exists only after the owner starts it, and it acts only on
 * an addressed request.
 */

import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { openBrokerStore, startBrokerServer } from "./broker.mjs";
import { CodexAppServer } from "./codex-app-server.mjs";
import { detectAll, enrollmentSnippets } from "./providers.mjs";
import { CodexWorker, Supervisor } from "./supervisor.mjs";

export const HUB_PROJECT = "ocd";
const HANDLE = /^[a-z0-9][a-z0-9_-]{0,47}$/;

export class AgentsHost {
  constructor({ dataRoot, installId, env, onChange }) {
    this.root = path.join(dataRoot, "agents");
    this.tokensDir = path.join(this.root, "tokens");
    this.workRoot = path.join(this.root, "managed-scratch");
    this.installId = installId;
    this.env = env;
    this.onChange = onChange ?? (() => {});
    this.store = null;
    this.server = null;
    this.supervisor = null;
    this.codexServers = new Map();
    this.detection = null;
  }

  async start() {
    mkdirSync(this.tokensDir, { recursive: true, mode: 0o700 });
    mkdirSync(this.workRoot, { recursive: true });
    this.store = openBrokerStore(path.join(this.root, "broker"));
    this.server = await startBrokerServer(this.store);
    const owner = this.store.enrollment(HUB_PROJECT, "owner");
    if (!owner || owner.sessionId !== this.installId)
      this.store.enroll({
        project: HUB_PROJECT,
        handle: "owner",
        provider: "human",
        sessionId: this.installId,
        authRoute: "Hub window",
        capability: "messaging (owner)",
      });
    this.supervisor = new Supervisor({
      store: this.store,
      project: HUB_PROJECT,
      log: () => this.onChange(),
    }).start();
    this.store.onEvent(() => this.onChange());
    // Managed workers from an earlier run are not silently revived; the
    // owner restarts them, which resumes their exact recorded thread.
    return this;
  }

  url() {
    return this.server ? this.server.url(HUB_PROJECT) : null;
  }

  async detect() {
    this.detection = await detectAll();
    this.onChange();
    return this.detection;
  }

  snapshot() {
    if (!this.store) return { ready: false };
    const participants = this.store.participants(HUB_PROJECT).map((p) => ({
      ...p,
      attached: p.managed ? this.codexServers.has(p.handle) : null,
    }));
    const envelopes = this.store.list(HUB_PROJECT, 80).map((e) => ({
      ...e,
      ledger: this.store.states(e.id),
    }));
    return {
      ready: true,
      url: this.url(),
      participants,
      envelopes,
      supervisor: this.supervisor?.status() ?? null,
      detection: this.detection,
    };
  }

  async startCodexWorker({ handle, model, effort }) {
    if (!HANDLE.test(handle ?? ""))
      throw new Error("Choose a lowercase handle.");
    if (this.codexServers.has(handle))
      throw new Error("That worker is already running.");
    const existing = this.store.enrollment(HUB_PROJECT, handle);
    const cwd = path.join(this.workRoot, handle);
    mkdirSync(cwd, { recursive: true });
    const server = new CodexAppServer({ cwd, env: this.env }).start();
    try {
      await server.initialize();
      const models = await server.request("model/list", {
        includeHidden: false,
      });
      const listed = (models.data ?? []).find(
        (m) => (m.id ?? m.model) === model,
      );
      if (!listed)
        throw new Error(`Model ${model} is not offered; no fallback is used.`);
      const efforts = (listed.supportedReasoningEfforts ?? []).map(
        (e) => e.reasoningEffort ?? e,
      );
      if (!efforts.includes(effort))
        throw new Error(`Effort ${effort} is not offered for ${model}.`);
      let thread;
      if (existing?.managed && existing.provider === "codex") {
        // Resume the exact recorded thread; never "latest".
        thread = await server.resumeThread({
          threadId: existing.sessionId,
          cwd,
        });
      } else {
        thread = await server.startThread({
          cwd,
          model,
          sandbox: "read-only",
          developerInstructions:
            "You are a hub-managed participant. Keep answers short. You are read-only; never claim edits.",
        });
      }
      this.store.enroll({
        project: HUB_PROJECT,
        handle,
        provider: "codex",
        sessionId: thread.id,
        model,
        effort,
        worktree: cwd,
        authRoute: "Codex-managed ChatGPT login (app-server)",
        capability: "messaging; automatic delivery (hub-managed, read-only)",
        managed: true,
      });
      this.codexServers.set(handle, server);
      this.supervisor.addWorker(
        new CodexWorker({ handle, server, threadId: thread.id, model, effort }),
      );
      this.onChange();
      return { handle, threadId: thread.id };
    } catch (error) {
      server.stop();
      throw error;
    }
  }

  /** Enroll an existing external session; returns its token file and snippets. */
  enrollExternal({ handle, provider, sessionId }) {
    if (!HANDLE.test(handle ?? ""))
      throw new Error("Choose a lowercase handle.");
    if (!["claude", "codex", "cursor", "antigravity"].includes(provider))
      throw new Error("Unknown provider.");
    if (!sessionId || String(sessionId).length > 200)
      throw new Error("The exact session id is required.");
    const { token } = this.store.enroll({
      project: HUB_PROJECT,
      handle,
      provider,
      sessionId: String(sessionId),
      authRoute: `${provider} (external session)`,
      capability: "messaging; manual attention (no verified wake path)",
    });
    const tokenFile = path.join(this.tokensDir, `${handle}.token`);
    writeFileSync(tokenFile, token, { mode: 0o600 });
    return {
      handle,
      tokenFile,
      url: this.url(),
      snippets: enrollmentSnippets({ url: this.url(), tokenFile, handle }),
    };
  }

  sendAsOwner({ to, text }) {
    return this.store.send({
      project: HUB_PROJECT,
      from: "owner",
      to,
      kind: "request",
      text,
      idempotencyKey: `owner:${randomUUID()}`,
    });
  }

  cancel(id) {
    return this.store.transition(id, "cancelled", "owner");
  }

  runningJobs() {
    const status = this.supervisor?.status();
    return status ? status.queued.length + status.running.length : 0;
  }

  /** Stop All affects hub-managed work only; external sessions are untouched. */
  async stopAll() {
    await this.supervisor?.stopAll();
    for (const server of this.codexServers.values()) server.stop();
    this.codexServers.clear();
    this.supervisor = new Supervisor({
      store: this.store,
      project: HUB_PROJECT,
      log: () => this.onChange(),
    }).start();
    this.onChange();
  }

  async close() {
    await this.supervisor?.stopAll();
    for (const server of this.codexServers.values()) server.stop();
    await this.server?.close();
    this.store?.close();
  }
}
