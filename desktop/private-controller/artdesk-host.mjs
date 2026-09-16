/* global process, setTimeout, clearTimeout, fetch, URL, AbortController */
/**
 * Hosts the existing Art Desk bench for the hub's Art Desk tab.
 *
 * The bench and its request/review store belong to the Art Desk writer; this
 * host only prepares one hub-owned authoring worktree at an explicitly
 * selected owner-repository SHA, stages the private pack with the pack's own
 * installer, and runs the bench's identified loopback server
 * (scripts/dev-identified.mjs, which enables PG_LOCAL_REVIEW) on a free
 * 127.0.0.1 port. Nothing here sets DEV globally or exposes the bridge to a
 * production build. The authoring worktree is never reset or cleaned: local
 * reviews stay until they are handed to Git.
 *
 * Record-root seam (LAND, 2026-09-16): the hub reserves one project-scoped
 * Art Desk data root outside every worktree and hands the bench only its
 * stable path and a per-launch capability, as environment variables:
 *   PG_ART_DESK_RECORD_ROOT  absolute directory owned by the hub (0700)
 *   PG_ART_DESK_TOKEN        random per-launch token
 * The hub's Art Desk view sends that token on every bench request as the
 * X-OCD-Art-Desk-Token header. The bench writer owns the record schema and
 * decides when its bridge requires the header and uses the root.
 */

export const ART_DESK_TOKEN_HEADER = "X-OCD-Art-Desk-Token";
export const ART_DESK_PROJECT = "ocd";

import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import path from "node:path";

import { branchSlug, validBranchName, validRevision } from "./hub-model.mjs";

export function freePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

function runQuiet(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env ?? process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let out = "";
    let err = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (c) => {
      out += c;
      options.onLog?.(c);
    });
    child.stderr.on("data", (c) => {
      err = (err + c).slice(-4000);
      options.onLog?.(c);
    });
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0
        ? resolve(out.trim())
        : reject(
            new Error(
              `${options.label ?? command} failed (${code}). ${err.slice(-300)}`,
            ),
          ),
    );
  });
}

export class ArtDeskHost {
  constructor({ dataRoot, env, onStatus }) {
    this.root = path.join(dataRoot, "artdesk");
    this.recordRoot = path.join(dataRoot, "art-records", ART_DESK_PROJECT);
    this.token = null;
    this.env = env;
    this.onStatus = onStatus ?? (() => {});
    this.child = null;
    this.url = null;
    this.status = { state: "idle", message: "Art Desk is not started." };
  }

  #set(state, message, extra = {}) {
    this.status = { state, message, ...extra };
    this.onStatus(this.status);
  }

  worktreeFor(branch) {
    return path.join(this.root, branchSlug(branch), "source");
  }

  /**
   * Prepare and start the bench for `branch` at the exact `revision` the hub
   * resolved. An existing authoring worktree at another revision is kept as
   * is and reported, never moved underneath local reviews.
   */
  async start({ repositoryPath, branch, revision, packPath }) {
    if (this.child) return this.status;
    if (!validBranchName(branch) || !validRevision(revision))
      throw new Error(
        "Art Desk source must be a valid branch at an exact SHA.",
      );
    const worktree = this.worktreeFor(branch);
    const git = (args, label) =>
      runQuiet("/usr/bin/git", args, { cwd: worktree, env: this.env, label });
    try {
      if (!existsSync(worktree)) {
        this.#set(
          "preparing",
          `Creating the Art Desk workspace at ${revision.slice(0, 12)}…`,
        );
        mkdirSync(path.dirname(worktree), { recursive: true });
        writeFileSync(
          path.join(path.dirname(worktree), ".ocd-hub-artdesk"),
          `${branch}\n`,
        );
        await runQuiet(
          "/usr/bin/git",
          ["worktree", "add", "--detach", worktree, revision],
          { cwd: repositoryPath, env: this.env, label: "git worktree add" },
        );
      }
      const head = await git(["rev-parse", "HEAD"], "git rev-parse");
      const trackedChanges = await git(
        ["status", "--porcelain", "--untracked-files=no"],
        "git status",
      );
      let sourceNote = null;
      if (head !== revision) {
        if (trackedChanges) {
          sourceNote = `Newer source ${revision.slice(0, 12)} is available; this workspace stays at ${head.slice(0, 12)} because it holds unsaved Art Desk records.`;
        } else {
          this.#set(
            "preparing",
            `Moving the Art Desk workspace to ${revision.slice(0, 12)}…`,
          );
          await git(["checkout", "--detach", revision], "git checkout");
        }
      }
      const activeHead = await git(["rev-parse", "HEAD"], "git rev-parse");
      this.#set("preparing", "Staging private art inputs for the Art Desk…");
      await runQuiet(
        "/bin/sh",
        [path.join(packPath, "stage-into-worktree.sh"), worktree],
        {
          env: this.env,
          label: "private pack installer",
        },
      );
      if (!existsSync(path.join(worktree, "node_modules", "vite"))) {
        this.#set(
          "preparing",
          "Installing the Art Desk's pinned dependencies (first run)…",
        );
        await runQuiet(
          "/usr/bin/env",
          ["npm", "ci", "--no-audit", "--no-fund"],
          {
            cwd: worktree,
            env: this.env,
            label: "npm ci",
          },
        );
      }
      mkdirSync(this.recordRoot, { recursive: true, mode: 0o700 });
      this.token = randomBytes(32).toString("base64url");
      const port = await freePort();
      this.#set("starting", "Starting the identified Art Desk server…");
      const child = spawn(
        "/usr/bin/env",
        [
          "node",
          "scripts/dev-identified.mjs",
          "--host",
          "127.0.0.1",
          "--port",
          String(port),
        ],
        {
          cwd: worktree,
          env: {
            ...this.env,
            PG_PRIVATE_ART_PACK: packPath,
            PG_ART_DESK_RECORD_ROOT: this.recordRoot,
            PG_ART_DESK_TOKEN: this.token,
            BROWSER: "none",
          },
          stdio: ["ignore", "pipe", "pipe"],
        },
      );
      this.child = child;
      let tail = "";
      const keep = (chunk) => {
        tail = (tail + chunk).slice(-3000);
      };
      child.stdout.setEncoding("utf8");
      child.stderr.setEncoding("utf8");
      child.stdout.on("data", keep);
      child.stderr.on("data", keep);
      child.on("exit", (code, signal) => {
        this.child = null;
        this.url = null;
        this.#set(
          "stopped",
          `Art Desk server stopped (${signal ?? `exit ${code}`}).`,
          { tail: tail.slice(-600) },
        );
      });
      const base = `http://127.0.0.1:${port}`;
      const identity = await this.#waitReady(base, 120000);
      this.url = `${base}/art-desk.html`;
      this.#set("ready", "Art Desk ready.", {
        url: this.url,
        branch,
        revision: activeHead,
        requestedRevision: revision,
        sourceNote,
        identity,
        worktree,
        packPath,
        recordRoot: this.recordRoot,
      });
      return this.status;
    } catch (error) {
      this.stop();
      this.#set(
        "failed",
        error instanceof Error ? error.message : String(error),
      );
      return this.status;
    }
  }

  async #waitReady(base, timeoutMs) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      if (!this.child)
        throw new Error("The Art Desk server exited during startup.");
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 3000);
        const response = await fetch(new URL("/__dev/identity", base), {
          signal: controller.signal,
        });
        clearTimeout(timer);
        if (response.ok) return await response.json().catch(() => ({}));
      } catch {
        /* not up yet */
      }
      await new Promise((resolve) => setTimeout(resolve, 750));
    }
    throw new Error("The Art Desk server did not become ready.");
  }

  /** Receipt of private inputs as the bench itself reports them. */
  async inputs() {
    if (!this.url) return null;
    try {
      const response = await fetch(new URL("/__dev/art-desk/inputs", this.url));
      return response.ok ? await response.json() : { status: response.status };
    } catch (error) {
      return { error: String(error) };
    }
  }

  stop() {
    if (this.child) this.child.kill("SIGTERM");
  }
}
