# Private desktop hub — Play, Art Desk, Agents

Owner packet: DESKTOP-CLIENT1 doc, section "PRIVATE DESKTOP HUB — PLAY, ART
DESK, AGENTS". Base `fed321f7667bbe5c3570679554a2f6b88d3bf8b1`. Branch
`claude/desktop-hub`. LAND handshake: Drive doc "PRIVATE DESKTOP HUB — Claude
desktop handshake to LAND (2026-09-16)". This is the owner's private
workbench; nothing here enters the public/Steam game.

## Shape

`desktop/private-controller/` grows from the Play/Update controller into one
window with enclosed tabs:

- **Play** — the verified cached game served over the shell's own
  `app://game` protocol (`desktop/app-protocol.mjs`, extracted unchanged from
  `desktop/main.mjs`) in a per-track session. Follow main reuses the existing
  internal art-review profile (backed up once before first use); each branch
  preview has its own profile. Tabs hide views, never unload them.
- **Source selector** — Follow main or an owner-repository branch, resolved to
  an exact SHA by the existing update worker (now track-aware, argument-array
  Git only). Builds run in managed worktrees with the private pack staged by
  its own installer and verified against its manifest; a public-only build is
  refused. Newer builds wait until Play for that track is closed; rollback to
  the retained previous build.
- **Art Desk** — the Art Desk writer's bench, run through its identified
  loopback server (`scripts/dev-identified.mjs`, `PG_PRIVATE_ART_PACK`) in a
  hub-owned authoring worktree that is never reset.
- **Agents** — `agents/broker.mjs`, a marked derivative of instavm/murmur
  (pinned `dcd793b4`, Apache-2.0) with project scoping, bearer capabilities,
  Host/Origin defence, collision refusal, envelope/state ledger, idempotent
  sends and hop caps; `agents/supervisor.mjs` event-driven delivery (one job
  per worker, two concurrent, ACK/status never infer, in-flight work held on
  restart); `agents/codex-app-server.mjs` for hub-managed Codex threads;
  `agents/providers.mjs` honest client detection.

## Proofs so far

- Claude↔Codex exchange (2026-09-16): Claude session
  `20e35f8a-cfd4-4381-a20e-1d28521f8fb6` (Claude Desktop, Opus 5) and
  hub-managed Codex thread `01a0ab55-d83a-7ec2-8ccc-a07ee201aa28`
  (gpt-5.6-sol, low, standard, ChatGPT Pro included allowance) exchanged a
  nonce with source `fed321f7` and pack `modular41-current-0a044d183ad7`.
  Codex ran `cat codex-read.txt` and returned the fixture nonce, which the
  supervisor verified before `completed`; Codex then asked Claude to read the
  reverse fixture; Claude acknowledged, completed with evidence and replied;
  Codex acknowledged the content with an `ack` envelope that started no
  further turn. Live negatives: duplicate key returned the original envelope,
  no token 401, rebinding Host 421, browser Origin 403, wrong project 401.
  Two Codex turns total. This proves communication, not code correctness.
- `desktop/tests/hub-broker.test.mjs` covers collision, scoping, receipt vs
  enqueue, evidence, idempotency, hop cap and MCP-over-HTTP auth.
- Packaged hub launch smoke (`scripts/controller-smoke-test.mjs`): chrome
  tabs, source selector, embedded Play over `app://game`, keyboard/pointer tab
  switching without unloading the game.

- `scripts/hub-continuity-test.mjs` (packaged hub, isolated root, real
  builds `6e227fb2` → `fed321f7` + pack `0a044d18`): a kept life continues
  A→B after the waiting build is activated; Play requests stay on
  `app://game`; a branch preview profile is isolated; B's creator draws
  decoded `ep41-*` current private people (600×1200).
- `scripts/hub-artdesk-test.mjs` (packaged hub, Art Desk branch `73baa7da`):
  QA request → import → verified hash → decoded preview → fixture-author
  review → restart → same hash, sidecar association, preview and review. The
  bench's decision buttons record the owner as author, so no agent clicks them.
- `scripts/hub-agents-test.mjs` (packaged hub): UI connection check of all
  four clients plus the master-chat boundary; UI-started Codex worker
  (gpt-5.6-sol, low) answered this Claude session's request in-thread;
  owner→Claude message from the UI acknowledged with evidence; Stop All left a
  later request queued (no inference) and the owner cancelled it; restart
  kept history and did not revive the worker.
- Installed from the delivered ZIP into /Applications and launched through
  Finder (parent launchd): first private main build passed the hub-owned
  health check and became Play.

## Seams

- Art Desk record root (LAND): `<hub data>/art-records/ocd` passed as
  `PG_ART_DESK_RECORD_ROOT`, per-launch `PG_ART_DESK_TOKEN`, sent only by the
  Art Desk view as `X-OCD-Art-Desk-Token`. The bench writer owns the schema.
- Health check: the worker runs the hub's bundled harness, not the target's.
  The old harness `fetch()`ed prepared SVG `blob:` layers, which the packaged
  CSP refuses; it now hashes decoded pixels.

## Not done yet / owner-dependent

- Cursor and Antigravity: the hub enrolls a client handle and copies its exact
  entry to the clipboard; the owner pastes it once into the client's MCP file
  and asks one chat to call `bind_session`. Automatic edits to those files
  were refused by the session safety classifier. No external wake path exists
  for either (Antigravity `agentapi` needs `ANTIGRAVITY_LS_ADDRESS`, set only
  inside Antigravity; Cursor has no headless `cursor-agent` installed).
- Hub-managed Claude workers need the Claude Code CLI signed in on this Mac.
- ChatGPT master chat is unsupported on this route (Pro custom MCP is
  read/fetch only; no tunnel set up).
- Real network-off play was not toggled; offline is shown by Play making no
  request outside `app://game`. Signing/notarization, Intel and Windows are
  not covered by these arm64 runs.
