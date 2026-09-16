/* global process, URL, Buffer, setTimeout, clearTimeout */
/**
 * Private hub agent broker.
 *
 * A modified derivative of instavm/murmur (Apache-2.0, pinned dcd793b4; see
 * ../vendor/murmur/MODIFICATIONS.md). It keeps murmur's shape — one local
 * Streamable-HTTP MCP endpoint over a SQLite store with an audit log — and
 * adds what upstream v1 lacks: project scoping, capability tokens, Host and
 * Origin checks, same-name collision refusal, and an envelope contract with an
 * append-only delivery/acknowledgement ledger.
 *
 * The broker owns coordination state only. It is not a World, save, source or
 * decision store; payloads travel as small text plus Drive/Git references.
 */

import { createHash, randomBytes, randomUUID } from "node:crypto";
import { appendFileSync, mkdirSync } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";

import { classify } from "../vendor/murmur/liveness.mjs";

export const ENVELOPE_STATES = [
  "queued",
  "delivered",
  "acknowledged",
  "working",
  "completed",
  "blocked",
  "cancelled",
];
const TERMINAL = new Set(["completed", "blocked", "cancelled"]);
const NEXT = {
  queued: new Set(["delivered", "cancelled", "blocked"]),
  delivered: new Set(["acknowledged", "cancelled", "blocked"]),
  acknowledged: new Set(["working", "completed", "blocked", "cancelled"]),
  working: new Set(["completed", "blocked", "cancelled"]),
};
export const ENVELOPE_KINDS = ["request", "reply", "ack", "status"];
/** Kinds that may start an inference turn. ACK/status never do. */
export const ACTIONABLE_KINDS = new Set(["request", "reply"]);
export const MAX_THREAD_HOPS = 6;
export const MAX_TEXT = 8000;

const HANDLE = /^[a-z0-9][a-z0-9_-]{0,47}$/;
const PROJECT = /^[a-z0-9][a-z0-9_-]{0,47}$/;
const SHA = /^[0-9a-f]{40}$/;

const hashToken = (token) =>
  createHash("sha256").update(String(token)).digest("hex");

export function openBrokerStore(dataDir) {
  mkdirSync(dataDir, { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(path.join(dataDir, "broker.sqlite"));
  const auditPath = path.join(dataDir, "audit.jsonl");
  db.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS enrollments (
      project TEXT NOT NULL,
      handle TEXT NOT NULL,
      provider TEXT NOT NULL,
      session_id TEXT NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      model TEXT, effort TEXT, worktree TEXT, head TEXT,
      auth_route TEXT, capability TEXT NOT NULL,
      managed INTEGER NOT NULL DEFAULT 0,
      enrolled_at TEXT NOT NULL,
      last_seen TEXT,
      revoked_at TEXT,
      PRIMARY KEY (project, handle)
    );
    CREATE TABLE IF NOT EXISTS envelopes (
      seq INTEGER PRIMARY KEY AUTOINCREMENT,
      id TEXT NOT NULL UNIQUE,
      project TEXT NOT NULL,
      kind TEXT NOT NULL,
      sender TEXT NOT NULL,
      sender_session TEXT NOT NULL,
      recipient TEXT NOT NULL,
      recipient_session TEXT,
      thread_id TEXT NOT NULL,
      reply_to TEXT,
      hop INTEGER NOT NULL,
      body TEXT NOT NULL,
      artifact_ref TEXT,
      source_sha TEXT,
      branch TEXT,
      idempotency_key TEXT,
      created_at TEXT NOT NULL,
      state TEXT NOT NULL,
      UNIQUE (project, sender, idempotency_key)
    );
    CREATE TABLE IF NOT EXISTS envelope_states (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      envelope_id TEXT NOT NULL,
      state TEXT NOT NULL,
      actor TEXT NOT NULL,
      evidence TEXT,
      at TEXT NOT NULL
    );
  `);

  const audit = (entry) =>
    appendFileSync(
      auditPath,
      `${JSON.stringify({ ts: new Date().toISOString(), ...entry })}\n`,
      { mode: 0o600 },
    );

  const listeners = new Set();
  const emit = (event) => {
    for (const listener of listeners) {
      try {
        listener(event);
      } catch {
        /* a listener failure never breaks delivery */
      }
    }
  };

  const envelopeRow = (id) =>
    db.prepare("SELECT * FROM envelopes WHERE id = ?").get(id) ?? null;

  const publicEnvelope = (row) =>
    row && {
      id: row.id,
      seq: row.seq,
      project: row.project,
      kind: row.kind,
      from: row.sender,
      fromSession: row.sender_session,
      to: row.recipient,
      toSession: row.recipient_session,
      threadId: row.thread_id,
      replyTo: row.reply_to,
      hop: row.hop,
      text: row.body,
      artifactRef: row.artifact_ref,
      sourceSha: row.source_sha,
      branch: row.branch,
      createdAt: row.created_at,
      state: row.state,
    };

  const publicEnrollment = (row) =>
    row && {
      project: row.project,
      handle: row.handle,
      provider: row.provider,
      sessionId: row.session_id,
      model: row.model,
      effort: row.effort,
      worktree: row.worktree,
      head: row.head,
      authRoute: row.auth_route,
      capability: row.capability,
      managed: Boolean(row.managed),
      enrolledAt: row.enrolled_at,
      lastSeen: row.last_seen,
      liveness: classify(row.last_seen).status,
      revoked: Boolean(row.revoked_at),
    };

  const store = {
    dataDir,
    onEvent(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    enroll({
      project,
      handle,
      provider,
      sessionId,
      model = null,
      effort = null,
      worktree = null,
      head = null,
      authRoute = null,
      capability = "messaging",
      managed = false,
    }) {
      if (!PROJECT.test(project ?? "")) throw new Error("Invalid project id.");
      if (!HANDLE.test(handle ?? "")) throw new Error("Invalid handle.");
      if (!provider || !sessionId)
        throw new Error("Provider and exact session id are required.");
      const existing = db
        .prepare("SELECT * FROM enrollments WHERE project = ? AND handle = ?")
        .get(project, handle);
      if (
        existing &&
        !existing.revoked_at &&
        (existing.session_id !== sessionId || existing.provider !== provider)
      ) {
        audit({ tool: "_enroll_refused", project, handle, provider });
        throw Object.assign(
          new Error(
            `Handle '${handle}' is bound to another ${existing.provider} session.`,
          ),
          { code: "handle-collision" },
        );
      }
      const token = randomBytes(32).toString("base64url");
      const now = new Date().toISOString();
      db.prepare(
        `INSERT INTO enrollments (project, handle, provider, session_id, token_hash,
           model, effort, worktree, head, auth_route, capability, managed, enrolled_at, last_seen, revoked_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,NULL,NULL)
         ON CONFLICT(project, handle) DO UPDATE SET
           provider=excluded.provider, session_id=excluded.session_id,
           token_hash=excluded.token_hash, model=excluded.model,
           effort=excluded.effort, worktree=excluded.worktree,
           head=excluded.head, auth_route=excluded.auth_route,
           capability=excluded.capability, managed=excluded.managed,
           enrolled_at=excluded.enrolled_at, revoked_at=NULL`,
      ).run(
        project,
        handle,
        provider,
        sessionId,
        hashToken(token),
        model,
        effort,
        worktree,
        head,
        authRoute,
        capability,
        managed ? 1 : 0,
        now,
      );
      audit({ tool: "_enroll", project, handle, provider, sessionId });
      emit({ type: "enrollment", project, handle });
      return { token, enrollment: store.enrollment(project, handle) };
    },

    revoke(project, handle) {
      db.prepare(
        "UPDATE enrollments SET revoked_at = ? WHERE project = ? AND handle = ?",
      ).run(new Date().toISOString(), project, handle);
      audit({ tool: "_revoke", project, handle });
      emit({ type: "enrollment", project, handle });
    },

    enrollment(project, handle) {
      return publicEnrollment(
        db
          .prepare("SELECT * FROM enrollments WHERE project = ? AND handle = ?")
          .get(project, handle),
      );
    },

    participants(project) {
      return db
        .prepare(
          "SELECT * FROM enrollments WHERE project = ? AND revoked_at IS NULL ORDER BY handle",
        )
        .all(project)
        .map(publicEnrollment);
    },

    authenticate(project, token) {
      if (!token) return null;
      const row = db
        .prepare(
          "SELECT * FROM enrollments WHERE token_hash = ? AND revoked_at IS NULL",
        )
        .get(hashToken(token));
      if (!row || row.project !== project) return null;
      return publicEnrollment(row);
    },

    touch(project, handle) {
      db.prepare(
        "UPDATE enrollments SET last_seen = ? WHERE project = ? AND handle = ?",
      ).run(new Date().toISOString(), project, handle);
    },

    send({
      project,
      from,
      to,
      kind = "request",
      text,
      threadId = null,
      replyTo = null,
      artifactRef = null,
      sourceSha = null,
      branch = null,
      idempotencyKey = null,
    }) {
      const sender = store.enrollment(project, from);
      if (!sender || sender.revoked)
        throw new Error("Sender is not enrolled in this project.");
      const recipient = store.enrollment(project, to);
      if (!recipient || recipient.revoked)
        throw Object.assign(new Error(`Unknown recipient '${to}'.`), {
          code: "unknown-recipient",
        });
      if (to === from) throw new Error("A participant cannot message itself.");
      if (!ENVELOPE_KINDS.includes(kind)) throw new Error("Invalid kind.");
      const body = String(text ?? "");
      if (!body.trim()) throw new Error("Empty message.");
      if (body.length > MAX_TEXT)
        throw new Error(
          "Message too large; send a Drive or Git reference instead.",
        );
      if (sourceSha !== null && !SHA.test(sourceSha))
        throw new Error("sourceSha must be a full 40-character SHA.");
      if (idempotencyKey) {
        const prior = db
          .prepare(
            "SELECT * FROM envelopes WHERE project = ? AND sender = ? AND idempotency_key = ?",
          )
          .get(project, from, idempotencyKey);
        if (prior) return { ...publicEnvelope(prior), duplicate: true };
      }
      let hop = 0;
      let thread = threadId;
      if (replyTo) {
        const parent = envelopeRow(replyTo);
        if (!parent || parent.project !== project)
          throw new Error("reply_to is not in this project.");
        hop = parent.hop + 1;
        thread = parent.thread_id;
      }
      if (hop > MAX_THREAD_HOPS)
        throw Object.assign(new Error("Thread hop limit reached."), {
          code: "hop-limit",
        });
      const id = `env_${randomUUID()}`;
      const now = new Date().toISOString();
      db.prepare(
        `INSERT INTO envelopes (id, project, kind, sender, sender_session, recipient,
           recipient_session, thread_id, reply_to, hop, body, artifact_ref,
           source_sha, branch, idempotency_key, created_at, state)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?, 'queued')`,
      ).run(
        id,
        project,
        kind,
        from,
        sender.sessionId,
        to,
        recipient.sessionId,
        thread ?? `thr_${randomUUID()}`,
        replyTo,
        hop,
        body,
        artifactRef,
        sourceSha,
        branch,
        idempotencyKey,
        now,
      );
      db.prepare(
        "INSERT INTO envelope_states (envelope_id, state, actor, evidence, at) VALUES (?, 'queued', ?, NULL, ?)",
      ).run(id, from, now);
      store.touch(project, from);
      audit({ tool: "send", project, from, to, id, kind, hop });
      const envelope = publicEnvelope(envelopeRow(id));
      emit({ type: "envelope", envelope });
      return envelope;
    },

    transition(id, state, actor, evidence = null) {
      const row = envelopeRow(id);
      if (!row) throw new Error("Unknown envelope.");
      if (!ENVELOPE_STATES.includes(state)) throw new Error("Invalid state.");
      if (row.state === state) return publicEnvelope(row); // idempotent
      if (TERMINAL.has(row.state))
        throw Object.assign(new Error(`Envelope is already ${row.state}.`), {
          code: "terminal",
        });
      if (!NEXT[row.state]?.has(state))
        throw Object.assign(new Error(`Cannot move ${row.state} → ${state}.`), {
          code: "bad-transition",
        });
      // Receipt and completion are the recipient's to declare.
      const recipientOnly = ["acknowledged", "working", "completed"];
      if (recipientOnly.includes(state) && actor !== row.recipient)
        throw Object.assign(
          new Error("Only the recipient may acknowledge or complete."),
          { code: "not-recipient" },
        );
      if (state === "completed" && !String(evidence ?? "").trim())
        throw Object.assign(new Error("Completion requires evidence."), {
          code: "missing-evidence",
        });
      const now = new Date().toISOString();
      db.prepare("UPDATE envelopes SET state = ? WHERE id = ?").run(state, id);
      db.prepare(
        "INSERT INTO envelope_states (envelope_id, state, actor, evidence, at) VALUES (?,?,?,?,?)",
      ).run(id, state, actor, evidence, now);
      audit({ tool: "transition", id, state, actor });
      const envelope = publicEnvelope(envelopeRow(id));
      emit({ type: "envelope", envelope });
      return envelope;
    },

    envelope(id) {
      return publicEnvelope(envelopeRow(id));
    },

    states(id) {
      return db
        .prepare(
          "SELECT state, actor, evidence, at FROM envelope_states WHERE envelope_id = ? ORDER BY id",
        )
        .all(id);
    },

    inbox(project, handle, { afterSeq = 0, undeliveredOnly = false } = {}) {
      const rows = db
        .prepare(
          `SELECT * FROM envelopes WHERE project = ? AND recipient = ? AND seq > ?
           ${undeliveredOnly ? "AND state = 'queued'" : ""} ORDER BY seq`,
        )
        .all(project, handle, afterSeq);
      return rows.map(publicEnvelope);
    },

    list(project, limit = 100) {
      return db
        .prepare(
          "SELECT * FROM envelopes WHERE project = ? ORDER BY seq DESC LIMIT ?",
        )
        .all(project, limit)
        .map(publicEnvelope);
    },

    thread(project, threadId) {
      return db
        .prepare(
          "SELECT * FROM envelopes WHERE project = ? AND thread_id = ? ORDER BY seq",
        )
        .all(project, threadId)
        .map(publicEnvelope);
    },

    close() {
      db.close();
    },
  };
  return store;
}

const text = (value) => ({
  content: [{ type: "text", text: JSON.stringify(value) }],
});
const failure = (error) => ({
  isError: true,
  content: [
    {
      type: "text",
      text: JSON.stringify({
        error: error instanceof Error ? error.message : String(error),
        code: error?.code ?? null,
      }),
    },
  ],
});

function buildMcpServer(store, identity) {
  const { project, handle } = identity;
  const server = new McpServer({ name: "ocd-hub", version: "0.1.0" });
  const guard = (fn) => async (args) => {
    try {
      store.touch(project, handle);
      return text(await fn(args ?? {}));
    } catch (error) {
      return failure(error);
    }
  };

  server.tool(
    "whoami",
    "Your authenticated identity in this project's hub room.",
    {},
    guard(() => store.enrollment(project, handle)),
  );
  server.tool(
    "who",
    "Participants in this project with provider, exact session, capability and liveness.",
    {},
    guard(() => ({ participants: store.participants(project) })),
  );
  server.tool(
    "send",
    "Send one small message to exactly one participant. Use Drive/Git references for large payloads. kind=ack/status never starts work.",
    {
      to: z.string(),
      text: z.string().max(MAX_TEXT),
      kind: z.enum(ENVELOPE_KINDS).optional(),
      reply_to: z.string().optional(),
      artifact_ref: z.string().max(1000).optional(),
      source_sha: z.string().optional(),
      branch: z.string().max(200).optional(),
      idempotency_key: z.string().max(200).optional(),
    },
    guard((args) =>
      store.send({
        project,
        from: handle,
        to: args.to,
        kind: args.kind ?? "request",
        text: args.text,
        replyTo: args.reply_to ?? null,
        artifactRef: args.artifact_ref ?? null,
        sourceSha: args.source_sha ?? null,
        branch: args.branch ?? null,
        idempotencyKey: args.idempotency_key ?? null,
      }),
    ),
  );
  server.tool(
    "poll",
    "Wait up to timeout_ms for messages addressed to you. An empty result is not a stop signal. Returned messages are marked delivered; acknowledge them with ack.",
    {
      after_seq: z.number().int().min(0).optional(),
      timeout_ms: z.number().int().min(0).max(60000).optional(),
    },
    guard(async ({ after_seq = 0, timeout_ms = 25000 }) => {
      const deadline = Date.now() + timeout_ms;
      for (;;) {
        const messages = store.inbox(project, handle, { afterSeq: after_seq });
        if (messages.length || Date.now() >= deadline) {
          for (const message of messages)
            if (message.state === "queued")
              store.transition(message.id, "delivered", "_broker");
          return {
            messages: messages.map((m) => store.envelope(m.id)),
            cursor: messages.length ? messages.at(-1).seq : after_seq,
          };
        }
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
    }),
  );
  server.tool(
    "ack",
    "Acknowledge receipt of a message addressed to you (proof of receipt).",
    { message_id: z.string() },
    guard(({ message_id }) => {
      const envelope = store.envelope(message_id);
      if (!envelope || envelope.project !== project)
        throw new Error("Unknown message.");
      if (envelope.state === "queued")
        store.transition(message_id, "delivered", "_broker");
      return store.transition(message_id, "acknowledged", handle);
    }),
  );
  server.tool(
    "update",
    "Move a message addressed to you to working, completed (evidence required) or blocked.",
    {
      message_id: z.string(),
      state: z.enum(["working", "completed", "blocked"]),
      evidence: z.string().max(4000).optional(),
    },
    guard(({ message_id, state, evidence }) => {
      const envelope = store.envelope(message_id);
      if (!envelope || envelope.project !== project)
        throw new Error("Unknown message.");
      return store.transition(message_id, state, handle, evidence ?? null);
    }),
  );
  server.tool(
    "thread",
    "Read one thread in this project.",
    { thread_id: z.string() },
    guard(({ thread_id }) => ({ messages: store.thread(project, thread_id) })),
  );
  return server;
}

/**
 * Loopback Host allow-list and browser-origin refusal. Loopback binding alone
 * is not authorization: a web page can reach 127.0.0.1 via DNS rebinding, so
 * the Host header must name the loopback listener and no browser Origin is
 * accepted.
 */
export function requestAllowed(headers, port) {
  const host = String(headers.host ?? "").toLowerCase();
  const hostOk = host === `127.0.0.1:${port}` || host === `localhost:${port}`;
  if (!hostOk) return { ok: false, status: 421, reason: "bad-host" };
  const origin = headers.origin;
  if (origin !== undefined && origin !== "null")
    return { ok: false, status: 403, reason: "browser-origin" };
  // Node/undici clients send sec-fetch-mode too, so it is not a browser
  // signal here; a browser cannot obtain the bearer token regardless.
  return { ok: true };
}

export function bearerToken(headers) {
  const value = String(headers.authorization ?? "");
  const match = /^Bearer ([A-Za-z0-9_-]{20,200})$/.exec(value);
  return match ? match[1] : null;
}

export async function startBrokerServer(store, { port = 0 } = {}) {
  const sessions = new Map();
  const audit = (entry) =>
    appendFileSync(
      path.join(store.dataDir, "audit.jsonl"),
      `${JSON.stringify({ ts: new Date().toISOString(), ...entry })}\n`,
    );
  let boundPort = port;

  const readBody = (req) =>
    new Promise((resolve, reject) => {
      const chunks = [];
      let size = 0;
      req.on("data", (chunk) => {
        size += chunk.length;
        if (size > 64 * 1024) {
          reject(new Error("body too large"));
          req.destroy();
          return;
        }
        chunks.push(chunk);
      });
      req.on("end", () => {
        const raw = Buffer.concat(chunks).toString("utf8");
        if (!raw) return resolve(undefined);
        try {
          resolve(JSON.parse(raw));
        } catch (error) {
          reject(error);
        }
      });
      req.on("error", reject);
    });

  const httpServer = createServer(async (req, res) => {
    const allowed = requestAllowed(req.headers, boundPort);
    if (!allowed.ok) {
      audit({ tool: "_refused", reason: allowed.reason });
      res.writeHead(allowed.status).end(allowed.reason);
      return;
    }
    const url = new URL(req.url ?? "/", `http://127.0.0.1:${boundPort}`);
    const match = /^\/mcp\/([a-z0-9_-]+)\/?$/.exec(url.pathname);
    if (!match) {
      res.writeHead(404).end("not found");
      return;
    }
    const project = match[1];
    const identity = store.authenticate(project, bearerToken(req.headers));
    if (!identity) {
      audit({ tool: "_refused", reason: "unauthorized", project });
      res.writeHead(401).end("unauthorized");
      return;
    }
    try {
      const sessionId = req.headers["mcp-session-id"];
      let entry = sessionId ? sessions.get(sessionId) : undefined;
      if (entry && entry.handle !== identity.handle) {
        res.writeHead(403).end("session belongs to another participant");
        return;
      }
      if (!entry) {
        if (req.method !== "POST") {
          res.writeHead(400).end("unknown session");
          return;
        }
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (sid) => {
            sessions.set(sid, { transport, handle: identity.handle });
          },
        });
        transport.onclose = () => {
          if (transport.sessionId) sessions.delete(transport.sessionId);
        };
        await buildMcpServer(store, identity).connect(transport);
        entry = { transport, handle: identity.handle };
      }
      const body = req.method === "POST" ? await readBody(req) : undefined;
      await entry.transport.handleRequest(req, res, body);
    } catch (error) {
      if (!res.headersSent)
        res.writeHead(500).end(String(error?.message ?? error));
    }
  });

  await new Promise((resolve, reject) => {
    httpServer.once("error", reject);
    httpServer.listen(port, "127.0.0.1", resolve);
  });
  boundPort = httpServer.address().port;
  audit({ tool: "_startup", port: boundPort, pid: process.pid });
  return {
    port: boundPort,
    url: (project) => `http://127.0.0.1:${boundPort}/mcp/${project}`,
    close: () =>
      new Promise((resolve) => {
        for (const { transport } of sessions.values()) void transport.close?.();
        sessions.clear();
        const timer = setTimeout(resolve, 2000);
        httpServer.close(() => {
          clearTimeout(timer);
          resolve();
        });
        httpServer.closeAllConnections?.();
      }),
  };
}
