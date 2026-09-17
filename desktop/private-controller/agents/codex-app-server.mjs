/* global process, setTimeout, clearTimeout */
/**
 * Codex app-server client over local stdio JSON-RPC.
 *
 * `codex mcp-server` is removed upstream; embedded managed execution uses the
 * experimental `codex app-server` protocol instead. This client speaks only
 * the documented thread/turn surface: initialize, thread/start or explicit
 * thread/resume, turn/start, streamed notifications and turn/interrupt. It
 * never opens a network listener, never reads auth files, and answers every
 * server-initiated approval request with a refusal unless the caller supplies
 * an explicit decision function. Codex-managed ChatGPT login is used as-is.
 */

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";

export const CODEX_CANDIDATES = [
  "/Applications/ChatGPT.app/Contents/Resources/codex",
  "/Applications/Codex.app/Contents/Resources/codex",
  "/opt/homebrew/bin/codex",
  "/usr/local/bin/codex",
];

export function findCodex(candidates = CODEX_CANDIDATES) {
  return candidates.find((candidate) => existsSync(candidate)) ?? null;
}

export class CodexAppServer {
  constructor({ binary, cwd, env, onNotification, decideApproval } = {}) {
    this.binary = binary ?? findCodex();
    this.cwd = cwd;
    this.env = env ?? process.env;
    this.onNotification = onNotification ?? (() => {});
    this.decideApproval = decideApproval ?? null;
    this.nextId = 1;
    this.pending = new Map();
    this.child = null;
    this.buffer = "";
    this.stderr = "";
    this.activeTurns = new Map();
  }

  start() {
    if (!this.binary) throw new Error("Codex is not installed.");
    this.child = spawn(this.binary, ["app-server"], {
      cwd: this.cwd,
      env: this.env,
      stdio: ["pipe", "pipe", "pipe"],
    });
    this.child.stdout.setEncoding("utf8");
    this.child.stderr.setEncoding("utf8");
    this.child.stdout.on("data", (chunk) => this.#consume(chunk));
    this.child.stderr.on("data", (chunk) => {
      this.stderr = (this.stderr + chunk).slice(-8000);
    });
    this.child.on("exit", (code, signal) => {
      const error = new Error(
        `codex app-server exited (${signal ?? `exit ${code}`}). ${this.stderr.slice(-400)}`,
      );
      for (const { reject } of this.pending.values()) reject(error);
      this.pending.clear();
      this.child = null;
    });
    return this;
  }

  #consume(chunk) {
    this.buffer += chunk;
    let index;
    while ((index = this.buffer.indexOf("\n")) >= 0) {
      const line = this.buffer.slice(0, index).trim();
      this.buffer = this.buffer.slice(index + 1);
      if (!line) continue;
      let message;
      try {
        message = JSON.parse(line);
      } catch {
        continue;
      }
      this.#dispatch(message);
    }
  }

  #dispatch(message) {
    const hasId = message.id !== undefined && message.id !== null;
    if (hasId && message.method) {
      void this.#answerServerRequest(message);
      return;
    }
    if (hasId) {
      const waiter = this.pending.get(message.id);
      if (!waiter) return;
      this.pending.delete(message.id);
      clearTimeout(waiter.timer);
      if (message.error)
        waiter.reject(
          Object.assign(new Error(message.error.message ?? "RPC error"), {
            rpc: message.error,
          }),
        );
      else waiter.resolve(message.result);
      return;
    }
    if (message.method) this.onNotification(message);
  }

  async #answerServerRequest(message) {
    // Normal provider approval gates stay in force: without an explicit
    // decision the hub declines instead of silently approving.
    let result = { decision: "decline" };
    if (this.decideApproval) {
      try {
        result = (await this.decideApproval(message)) ?? result;
      } catch {
        result = { decision: "decline" };
      }
    }
    this.#write({ jsonrpc: "2.0", id: message.id, result });
  }

  #write(value) {
    if (!this.child) throw new Error("codex app-server is not running.");
    this.child.stdin.write(`${JSON.stringify(value)}\n`);
  }

  request(method, params, timeoutMs = 60000) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`${method} timed out`));
      }, timeoutMs);
      this.pending.set(id, { resolve, reject, timer });
      try {
        this.#write({ jsonrpc: "2.0", id, method, params });
      } catch (error) {
        clearTimeout(timer);
        this.pending.delete(id);
        reject(error);
      }
    });
  }

  notify(method, params) {
    this.#write({ jsonrpc: "2.0", method, params });
  }

  async initialize(clientInfo) {
    const result = await this.request("initialize", {
      clientInfo: clientInfo ?? {
        name: "our-civic-duty-private-hub",
        title: "Our Civic Duty Private Hub",
        version: "0.1.0",
      },
    });
    this.notify("initialized", {});
    return result;
  }

  /**
   * Run one turn and resolve with the final agent text once turn/completed
   * arrives. Streaming deltas are forwarded to onNotification as they come.
   */
  runTurn({ threadId, text, model, effort, outputSchema, timeoutMs = 300000 }) {
    return new Promise((resolve, reject) => {
      let turnId = null;
      let finalText = "";
      const items = [];
      const previous = this.onNotification;
      const timer = setTimeout(() => {
        this.onNotification = previous;
        if (turnId)
          void this.request("turn/interrupt", { threadId, turnId }).catch(
            () => {},
          );
        reject(new Error("Codex turn timed out and was interrupted."));
      }, timeoutMs);
      this.onNotification = (message) => {
        previous(message);
        const params = message.params ?? {};
        if (params.threadId && params.threadId !== threadId) return;
        if (message.method === "item/completed") {
          items.push(params.item);
          if (params.item?.type === "agentMessage")
            finalText = params.item.text ?? finalText;
        }
        if (message.method === "turn/completed") {
          clearTimeout(timer);
          this.activeTurns.delete(threadId);
          this.onNotification = previous;
          resolve({
            turnId: params.turn?.id ?? turnId,
            status: params.turn?.status ?? "unknown",
            error: params.turn?.error ?? null,
            text: finalText,
            items,
          });
        }
      };
      this.request("turn/start", {
        threadId,
        input: [{ type: "text", text }],
        ...(model ? { model } : {}),
        ...(effort ? { effort } : {}),
        ...(outputSchema ? { outputSchema } : {}),
      })
        .then((result) => {
          turnId = result?.turn?.id ?? null;
          this.activeTurns.set(threadId, turnId);
        })
        .catch((error) => {
          clearTimeout(timer);
          this.onNotification = previous;
          reject(error);
        });
    });
  }

  async startThread({
    cwd,
    model,
    sandbox = "read-only",
    developerInstructions,
  }) {
    const result = await this.request("thread/start", {
      cwd,
      model,
      sandbox,
      approvalPolicy: "on-request",
      ephemeral: false,
      ...(developerInstructions ? { developerInstructions } : {}),
    });
    return result.thread;
  }

  async resumeThread({ threadId, cwd }) {
    if (!threadId) throw new Error("An explicit thread id is required.");
    const result = await this.request("thread/resume", {
      threadId,
      cwd,
      excludeTurns: true,
    });
    return result.thread;
  }

  async interruptActive(threadId) {
    const turnId = this.activeTurns.get(threadId);
    if (!turnId) return false;
    await this.request("turn/interrupt", { threadId, turnId }).catch(() => {});
    return true;
  }

  stop() {
    if (this.child) this.child.kill("SIGTERM");
  }
}
