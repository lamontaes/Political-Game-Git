# Vendored murmur — provenance and modifications

- Upstream: https://github.com/instavm/murmur
- Pinned commit: `dcd793b4c5ae96f29c96d03ca5376b828206065f` (package 0.1.3, 2026-07-17)
- License: Apache-2.0 (`LICENSE`, `NOTICE` retained unmodified)
- Upstream dependencies pinned in the hub lockfile:
  `@modelcontextprotocol/sdk` 1.29.0, `zod` 3.25.76

## Files taken

- `liveness.mjs` — copied unmodified from `src/lib/liveness.mjs`.

## Modified derivative

`../../agents/broker.mjs` is a modified derivative of upstream
`src/daemon/murmurd.mjs` and `src/daemon/tools.mjs` (the Streamable-HTTP MCP
server, SQLite message/participant store, audit log, and the
register/say/poll/who/history tool shapes). Changes by the Our Civic Duty
private hub, 2026-09-16:

- One app-owned data directory (no `~/.murmur`, no global room, no pid/port
  files shared with another murmur install).
- Project-scoped routes `/mcp/<project>/<handle>` instead of one hardcoded
  room; a wrong project is refused.
- Capability authentication: every enrollment has a random bearer token
  (stored hashed); the handle comes from the token, never from a tool
  argument. Unauthenticated, wrong-project and cross-handle calls fail.
- Host/Origin checks against DNS rebinding and browser callers; loopback bind
  only.
- Same-name collision refusal (a handle is bound to one provider session).
- Envelope contract (message/job ID, sender and recipient session, thread,
  reply-to, artifact reference, source SHA/branch, creation time) with an
  append-only state ledger (queued/delivered/acknowledged/working/completed/
  blocked/cancelled). Server enqueue is recorded as `queued`, never as
  receipt.
- Idempotent sends by client-supplied key; capped hops per thread.
- Removed: the upstream CLI installer, global enrollment writers, the
  experimental per-mention headless runner and the shell controllers.
