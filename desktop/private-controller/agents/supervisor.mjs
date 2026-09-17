/* global setTimeout, clearTimeout */
import { spawn } from "node:child_process";

/**
 * Event-driven delivery supervisor for hub-managed workers.
 *
 * Transport delivery is separate from model execution: the supervisor waits on
 * broker events and never asks a model to "check mail". A managed worker runs
 * at most one job at a time, and the supervisor caps concurrent inference.
 * ACK/status envelopes never start a turn. Envelopes that were already in
 * flight when the hub stopped are held for the owner, never replayed.
 */

import { ACTIONABLE_KINDS } from "./broker.mjs";

export const REPLY_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "message_id",
    "acknowledged",
    "status",
    "evidence",
    "reply_text",
    "peer_request",
  ],
  properties: {
    message_id: { type: "string" },
    acknowledged: { type: "boolean" },
    status: { type: "string", enum: ["completed", "blocked"] },
    evidence: { type: "string" },
    reply_text: { type: "string" },
    peer_request: {
      anyOf: [
        {
          type: "object",
          additionalProperties: false,
          required: ["to", "text"],
          properties: { to: { type: "string" }, text: { type: "string" } },
        },
        { type: "null" },
      ],
    },
  },
};

export function workerPrompt(envelope, { handle, project }) {
  return [
    `You are hub participant @${handle} in private project "${project}".`,
    "One message arrived through the local hub. Do only what it asks, inside your sandbox.",
    `message_id: ${envelope.id}`,
    `kind: ${envelope.kind}`,
    `from: @${envelope.from} (session ${envelope.fromSession})`,
    `thread: ${envelope.threadId}`,
    `source_sha: ${envelope.sourceSha ?? "none"}  branch: ${envelope.branch ?? "none"}`,
    `artifact_ref: ${envelope.artifactRef ?? "none"}`,
    "--- message ---",
    envelope.text,
    "--- end ---",
    "Answer only with JSON matching the schema: echo message_id, acknowledged=true,",
    "status completed or blocked, concrete evidence (for example the exact text you read),",
    "a short reply_text for the sender, and peer_request only if the message explicitly",
    "asks you to send one follow-up request to a named participant; otherwise null.",
  ].join("\n");
}

export function parseWorkerReply(text, envelope) {
  let value;
  try {
    value = JSON.parse(text);
  } catch {
    return { ok: false, reason: "reply-not-json" };
  }
  if (value?.message_id !== envelope.id)
    return { ok: false, reason: "message-id-mismatch" };
  if (value.acknowledged !== true)
    return { ok: false, reason: "not-acknowledged" };
  return { ok: true, value };
}

export class Supervisor {
  constructor({ store, project, maxConcurrent = 2, log = () => {} }) {
    this.store = store;
    this.project = project;
    this.maxConcurrent = maxConcurrent;
    this.log = log;
    this.workers = new Map();
    this.queue = [];
    this.running = new Map();
    this.held = [];
    this.stopped = false;
    this.unsubscribe = null;
  }

  addWorker(worker) {
    this.workers.set(worker.handle, worker);
  }

  start() {
    // Startup scan: queued work is safe to deliver; anything already past
    // queued was in flight when the hub stopped, so it is held, not replayed.
    for (const handle of this.workers.keys()) {
      for (const envelope of this.store.inbox(this.project, handle)) {
        if (envelope.state === "queued") this.#offer(envelope);
        else if (
          ["delivered", "acknowledged", "working"].includes(envelope.state)
        )
          this.held.push(envelope);
      }
    }
    this.unsubscribe = this.store.onEvent((event) => {
      if (event.type === "envelope" && event.envelope.state === "queued")
        this.#offer(event.envelope);
    });
    return this;
  }

  #offer(envelope) {
    if (this.stopped || envelope.project !== this.project) return;
    const worker = this.workers.get(envelope.to);
    if (!worker) return;
    if (!ACTIONABLE_KINDS.has(envelope.kind)) {
      // Delivery of an ACK/status is its own receipt record; no inference.
      this.store.transition(envelope.id, "delivered", "_supervisor");
      this.log({ type: "no-inference", id: envelope.id, kind: envelope.kind });
      return;
    }
    if (this.queue.some((e) => e.id === envelope.id)) return;
    if ([...this.running.values()].some((e) => e.id === envelope.id)) return;
    this.queue.push(envelope);
    setTimeout(() => this.#pump(), 0);
  }

  #pump() {
    if (this.stopped) return;
    for (const envelope of [...this.queue]) {
      if (this.running.size >= this.maxConcurrent) return;
      if (this.running.has(envelope.to)) continue; // one job per worker
      this.queue.splice(this.queue.indexOf(envelope), 1);
      this.running.set(envelope.to, envelope);
      void this.#run(this.workers.get(envelope.to), envelope).finally(() => {
        this.running.delete(envelope.to);
        this.#pump();
      });
    }
  }

  async #run(worker, envelope) {
    const { store } = this;
    const current = store.envelope(envelope.id);
    if (!current || current.state !== "queued") return; // duplicate event
    store.transition(envelope.id, "delivered", "_supervisor");
    this.log({ type: "delivered", id: envelope.id, to: worker.handle });
    if (
      envelope.sourceSha &&
      worker.expectedSha &&
      envelope.sourceSha !== worker.expectedSha
    ) {
      store.transition(
        envelope.id,
        "blocked",
        "_supervisor",
        `stale-sha: message ${envelope.sourceSha} vs worker ${worker.expectedSha}`,
      );
      this.log({ type: "stale-sha", id: envelope.id });
      return;
    }
    let outcome;
    try {
      outcome = await worker.run(envelope, {
        handle: worker.handle,
        project: this.project,
      });
    } catch (error) {
      store.transition(
        envelope.id,
        "blocked",
        "_supervisor",
        `worker-error: ${error instanceof Error ? error.message : String(error)}`,
      );
      this.log({ type: "worker-error", id: envelope.id, error: String(error) });
      return;
    }
    this.log({ type: "turn", id: envelope.id, outcome });
    const parsed = parseWorkerReply(outcome.text, envelope);
    if (!parsed.ok) {
      store.transition(envelope.id, "blocked", "_supervisor", parsed.reason);
      return;
    }
    const reply = parsed.value;
    // The worker's own echoed message id is its acknowledgement.
    store.transition(envelope.id, "acknowledged", worker.handle);
    if (reply.status === "completed" && reply.evidence.trim()) {
      const verified = worker.verify
        ? worker.verify(envelope, reply)
        : { ok: true };
      if (verified.ok) {
        store.transition(
          envelope.id,
          "completed",
          worker.handle,
          reply.evidence,
        );
      } else {
        store.transition(
          envelope.id,
          "blocked",
          worker.handle,
          `unverified-evidence: ${verified.reason}`,
        );
      }
    } else {
      store.transition(
        envelope.id,
        "blocked",
        worker.handle,
        reply.evidence || "blocked without evidence",
      );
    }
    store.send({
      project: this.project,
      from: worker.handle,
      to: envelope.from,
      kind: envelope.kind === "request" ? "reply" : "ack",
      text: reply.reply_text || "(no reply text)",
      replyTo: envelope.id,
      sourceSha: envelope.sourceSha,
      branch: envelope.branch,
      idempotencyKey: `reply:${envelope.id}`,
    });
    if (reply.peer_request && envelope.kind === "request") {
      store.send({
        project: this.project,
        from: worker.handle,
        to: reply.peer_request.to.replace(/^@/, ""),
        kind: "request",
        text: reply.peer_request.text,
        replyTo: envelope.id,
        sourceSha: envelope.sourceSha,
        branch: envelope.branch,
        idempotencyKey: `peer:${envelope.id}`,
      });
    }
  }

  /** Stop All: cancel queued hub work and interrupt running managed turns. */
  async stopAll() {
    this.stopped = true;
    for (const envelope of this.queue.splice(0)) {
      try {
        this.store.transition(envelope.id, "cancelled", "_owner");
      } catch {
        /* already moved */
      }
    }
    await Promise.all(
      [...this.running.keys()].map((handle) =>
        this.workers.get(handle)?.interrupt?.(),
      ),
    );
    this.unsubscribe?.();
  }

  status() {
    return {
      queued: this.queue.map((e) => e.id),
      running: [...this.running.values()].map((e) => e.id),
      held: this.held.map((e) => ({ id: e.id, state: e.state, to: e.to })),
      stopped: this.stopped,
    };
  }
}

/** A hub-managed Codex thread driven over app-server. */
export class CodexWorker {
  constructor({
    handle,
    server,
    threadId,
    model,
    effort,
    expectedSha,
    verify,
  }) {
    this.handle = handle;
    this.server = server;
    this.threadId = threadId;
    this.model = model;
    this.effort = effort;
    this.expectedSha = expectedSha ?? null;
    this.verify = verify ?? null;
    this.activeTurn = null;
    this.turns = 0;
    this.maxTurns = 6;
  }

  async run(envelope, context) {
    if (this.turns >= this.maxTurns)
      throw new Error("Worker turn cap reached for this session.");
    this.turns += 1;
    const turn = this.server.runTurn({
      threadId: this.threadId,
      text: workerPrompt(envelope, context),
      model: this.model,
      effort: this.effort,
      outputSchema: REPLY_SCHEMA,
      timeoutMs: 240000,
    });
    this.activeTurn = turn;
    try {
      return await turn;
    } finally {
      this.activeTurn = null;
    }
  }

  async interrupt() {
    await this.server.interruptActive?.(this.threadId);
  }
}

/**
 * A hub-managed headless Claude Code session. The first turn creates the
 * exact session id; later turns resume that id, never "latest". Tools are
 * limited to reading, and the CLI's own login and approval rules apply.
 */
export class ClaudeWorker {
  constructor({ handle, binary, sessionId, cwd, model, effort, env, resume }) {
    this.handle = handle;
    this.binary = binary;
    this.sessionId = sessionId;
    this.cwd = cwd;
    this.model = model;
    this.effort = effort;
    this.env = env;
    this.started = Boolean(resume);
    this.child = null;
    this.turns = 0;
    this.maxTurns = 6;
    this.expectedSha = null;
    this.verify = null;
  }

  argumentsFor(text) {
    return [
      "-p",
      text,
      "--output-format",
      "json",
      "--json-schema",
      JSON.stringify(REPLY_SCHEMA),
      "--model",
      this.model,
      "--effort",
      this.effort,
      "--tools",
      "Read,Glob,Grep",
      ...(this.started
        ? ["--resume", this.sessionId]
        : ["--session-id", this.sessionId]),
    ];
  }

  run(envelope, context) {
    if (this.turns >= this.maxTurns)
      return Promise.reject(
        new Error("Worker turn cap reached for this session."),
      );
    this.turns += 1;
    return new Promise((resolve, reject) => {
      const child = spawn(
        this.binary,
        this.argumentsFor(workerPrompt(envelope, context)),
        { cwd: this.cwd, env: this.env, stdio: ["ignore", "pipe", "pipe"] },
      );
      this.child = child;
      let out = "";
      let err = "";
      child.stdout.setEncoding("utf8");
      child.stderr.setEncoding("utf8");
      child.stdout.on("data", (chunk) => {
        out += chunk;
      });
      child.stderr.on("data", (chunk) => {
        err = (err + chunk).slice(-2000);
      });
      const timer = setTimeout(() => child.kill("SIGTERM"), 240000);
      child.on("error", reject);
      child.on("exit", (code, signal) => {
        clearTimeout(timer);
        this.child = null;
        let parsed = null;
        try {
          parsed = JSON.parse(out);
        } catch {
          parsed = null;
        }
        if (code !== 0 || !parsed || parsed.is_error) {
          reject(
            new Error(
              `claude exited (${signal ?? code}): ${(parsed?.result ?? err).slice(0, 300)}`,
            ),
          );
          return;
        }
        if (parsed.session_id && parsed.session_id !== this.sessionId) {
          reject(new Error("Claude answered from a different session id."));
          return;
        }
        this.started = true;
        const structured = parsed.structured_output ?? null;
        resolve({
          turnId: parsed.uuid ?? null,
          status: parsed.subtype ?? "unknown",
          error: null,
          text: structured ? JSON.stringify(structured) : String(parsed.result),
          usage: parsed.usage ?? null,
        });
      });
    });
  }

  async interrupt() {
    this.child?.kill("SIGTERM");
  }
}
