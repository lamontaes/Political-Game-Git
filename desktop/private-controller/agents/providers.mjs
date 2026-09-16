/* global process */
/**
 * Detects the four local coding clients and the ChatGPT master-chat route,
 * reporting only what an actual probe shows. Unknown stays unknown; nothing
 * here reads credential files, browser storage or cookies, and nothing
 * installs, upgrades or logs in.
 */

import { execFile } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import { CodexAppServer, findCodex } from "./codex-app-server.mjs";

const execFileAsync = promisify(execFile);
const home = os.homedir();

async function run(file, args, timeout = 8000) {
  try {
    const { stdout } = await execFileAsync(file, args, {
      timeout,
      env: { ...process.env, NO_COLOR: "1" },
      maxBuffer: 1024 * 1024,
    });
    return { ok: true, out: stdout.trim() };
  } catch (error) {
    return {
      ok: false,
      out: String(error?.stdout ?? ""),
      error: String(error?.message ?? error),
    };
  }
}

async function plistVersion(appPath) {
  const result = await run("/usr/bin/defaults", [
    "read",
    path.join(appPath, "Contents", "Info"),
    "CFBundleShortVersionString",
  ]);
  return result.ok ? result.out : null;
}

export function findClaude() {
  const root = path.join(
    home,
    "Library",
    "Application Support",
    "Claude",
    "claude-code",
  );
  const candidates = [];
  if (existsSync(root)) {
    const versions = readdirSync(root)
      .filter((v) => /^\d+\.\d+\.\d+$/.test(v))
      .sort((a, b) => {
        const pa = a.split(".").map(Number);
        const pb = b.split(".").map(Number);
        return pb[0] - pa[0] || pb[1] - pa[1] || pb[2] - pa[2];
      });
    for (const v of versions)
      candidates.push(
        path.join(root, v, "claude.app", "Contents", "MacOS", "claude"),
      );
  }
  candidates.push(
    path.join(home, ".local", "bin", "claude"),
    path.join(home, ".claude", "local", "claude"),
    "/opt/homebrew/bin/claude",
    "/usr/local/bin/claude",
  );
  return candidates.find((c) => existsSync(c)) ?? null;
}

const APP_LOCATIONS = (name) => [
  `/Applications/${name}.app`,
  path.join(home, "Applications", `${name}.app`),
  path.join(home, "Desktop", `${name}.app`),
];

export async function detectClaude() {
  const binary = findClaude();
  if (!binary)
    return {
      provider: "claude",
      installed: false,
      status: "unavailable",
      detail: "Claude Code CLI not found.",
    };
  const version = await run(binary, ["--version"]);
  const auth = await run(binary, ["auth", "status"]);
  let loggedIn = null;
  let authMethod = null;
  try {
    const parsed = JSON.parse(auth.out);
    loggedIn = Boolean(parsed.loggedIn);
    authMethod = parsed.authMethod ?? null;
  } catch {
    loggedIn = null;
  }
  return {
    provider: "claude",
    installed: true,
    binary,
    version: version.ok ? version.out : "unknown",
    authRoute: loggedIn
      ? `Claude Code login (${authMethod})`
      : "Claude Code CLI not signed in",
    status: loggedIn
      ? "ready"
      : loggedIn === false
        ? "awaiting-authorization"
        : "unknown",
    capabilities: {
      messaging:
        "via hub MCP (external session) or hub-managed headless session",
      automaticDelivery: loggedIn
        ? "hub-managed sessions: claude -p --resume <exact id>"
        : "unavailable until the CLI is signed in",
      wake: "existing Claude Desktop sessions: no verified wake path (manual attention)",
    },
    detail: loggedIn
      ? "Hub-managed Claude workers can run with explicit session ids."
      : "Sign in once with the Claude Code CLI login (opens the system browser) to allow hub-managed Claude workers. Existing Desktop sessions can still message through the hub peer client.",
  };
}

export async function detectCodex() {
  const binary = findCodex();
  if (!binary)
    return {
      provider: "codex",
      installed: false,
      status: "unavailable",
      detail: "Codex not found.",
    };
  const version = await run(binary, ["--version"]);
  const server = new CodexAppServer({ binary, cwd: home }).start();
  try {
    await server.initialize();
    const account = await server
      .request("account/read", {}, 15000)
      .catch(() => null);
    const rate = await server
      .request("account/rateLimits/read", undefined, 15000)
      .catch(() => null);
    const models = await server
      .request("model/list", { includeHidden: false }, 15000)
      .catch(() => null);
    const plan = account?.account?.planType ?? "unknown";
    const signedIn = account?.account?.type === "chatgpt";
    const primary = rate?.rateLimits?.primary ?? null;
    return {
      provider: "codex",
      installed: true,
      binary,
      version: version.ok ? version.out : "unknown",
      authRoute: signedIn
        ? `Codex-managed ChatGPT login (${plan})`
        : "Codex not signed in",
      status: signedIn ? "ready" : "awaiting-authorization",
      usage: primary
        ? {
            usedPercent: primary.usedPercent,
            windowMinutes: primary.windowDurationMins,
            resetsAt: primary.resetsAt
              ? new Date(primary.resetsAt * 1000).toISOString()
              : null,
            credits: rate.rateLimits?.credits?.balance ?? "unknown",
          }
        : "unknown",
      models: (models?.data ?? []).map((m) => ({
        id: m.id ?? m.model,
        efforts: (m.supportedReasoningEfforts ?? []).map(
          (e) => e.reasoningEffort ?? e,
        ),
      })),
      capabilities: {
        messaging: "hub-managed app-server thread",
        automaticDelivery: "yes (hub-managed threads, explicit thread/resume)",
        wake: "existing Codex app threads: not woken by the hub",
      },
    };
  } finally {
    server.stop();
  }
}

export async function detectCursor() {
  const app = APP_LOCATIONS("Cursor").find((p) => existsSync(p)) ?? null;
  if (!app)
    return {
      provider: "cursor",
      installed: false,
      status: "unavailable",
      detail: "Cursor.app not found.",
    };
  const cli = path.join(app, "Contents", "Resources", "app", "bin", "cursor");
  const agentBinary =
    [
      path.join(home, ".local", "bin", "cursor-agent"),
      "/opt/homebrew/bin/cursor-agent",
      "/usr/local/bin/cursor-agent",
    ].find((p) => existsSync(p)) ?? null;
  return {
    provider: "cursor",
    installed: true,
    app,
    version: (await plistVersion(app)) ?? "unknown",
    cli: existsSync(cli) ? cli : null,
    agentBinary,
    authRoute: "Cursor-managed login (not inspected)",
    status: agentBinary ? "not-tested" : "manual-attention",
    capabilities: {
      messaging:
        "Cursor MCP (streamable HTTP) — enrollment snippet from the hub",
      automaticDelivery: agentBinary
        ? "headless cursor-agent present; not yet proven"
        : "no headless cursor-agent installed; the app's 'cursor agent' installs it on first use (owner action)",
      wake: "no wake path verified in this install for open Cursor chats",
    },
  };
}

export async function detectAntigravity() {
  const app = APP_LOCATIONS("Antigravity").find((p) => existsSync(p)) ?? null;
  const agentapi = path.join(home, ".gemini", "antigravity", "bin", "agentapi");
  if (!app)
    return {
      provider: "antigravity",
      installed: false,
      status: "unavailable",
      detail: "Antigravity.app not found.",
    };
  return {
    provider: "antigravity",
    installed: true,
    app,
    version: (await plistVersion(app)) ?? "unknown",
    agentapi: existsSync(agentapi) ? agentapi : null,
    authRoute: "Antigravity-managed Google login (not inspected)",
    status: "manual-attention",
    capabilities: {
      messaging:
        "Antigravity MCP (serverUrl) — enrollment snippet from the hub",
      automaticDelivery:
        "none found in this install: its agentapi runs only inside a running Antigravity agent (needs ANTIGRAVITY_LS_ADDRESS)",
      wake: "no external wake path found in this install; an open Antigravity chat with the hub entry can poll while active",
    },
  };
}

export function chatgptMasterStatus() {
  return {
    provider: "chatgpt-master",
    installed: existsSync("/Applications/ChatGPT.app"),
    status: "unsupported",
    detail:
      "Not connected. A ChatGPT custom MCP connection needs the owner's one-time developer-mode setup and, for a private local server, OpenAI's Secure MCP Tunnel. On Pro, custom developer-mode MCP is read/fetch only, so this master chat could at most read hub status; it cannot dispatch jobs. No tunnel, upgrade or paid API is set up by the hub. Local Claude/Codex/Cursor/Antigravity connections do not depend on this.",
    capabilities: { read: "not connected", write: "unsupported on this route" },
  };
}

export async function detectAll() {
  const settle = async (fn, provider) => {
    try {
      return await fn();
    } catch (error) {
      return {
        provider,
        installed: null,
        status: "unknown",
        detail: String(error?.message ?? error),
      };
    }
  };
  const [claude, codex, cursor, antigravity] = await Promise.all([
    settle(detectClaude, "claude"),
    settle(detectCodex, "codex"),
    settle(detectCursor, "cursor"),
    settle(detectAntigravity, "antigravity"),
  ]);
  return {
    checkedAt: new Date().toISOString(),
    providers: [claude, codex, cursor, antigravity, chatgptMasterStatus()],
  };
}

/** Client configuration snippets for an external session's hub enrollment. */
export function enrollmentSnippets({ url, tokenFile, handle }) {
  return {
    claude: `claude mcp add --transport http ocd-hub ${url} --header "Authorization: Bearer $(cat '${tokenFile}')"`,
    codex: `[mcp_servers.ocd_hub]\nurl = "${url}"\nbearer_token_env_var = "OCD_HUB_TOKEN_${handle.replace(/[^A-Za-z0-9]/g, "_").toUpperCase()}"`,
    cursor: `~/.cursor/mcp.json → "mcpServers": { "ocd-hub": { "url": "${url}", "headers": { "Authorization": "Bearer <token>" } } }`,
    antigravity: `~/.gemini/config/mcp_config.json → "mcpServers": { "ocd-hub": { "serverUrl": "${url}", "headers": { "Authorization": "Bearer <token>" } } }`,
  };
}

/** The exact client entry, token included, for the owner's clipboard only. */
export function clientEntry(provider, { url, token }) {
  const headers = { Authorization: `Bearer ${token}` };
  const entry =
    provider === "antigravity" ? { serverUrl: url, headers } : { url, headers };
  return JSON.stringify({ "ocd-hub": entry }, null, 2);
}
