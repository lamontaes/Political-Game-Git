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

## Not done yet

Cursor and Antigravity real send/receive; hub-managed Claude workers (the
Claude Code CLI on this Mac is not signed in); ChatGPT master chat is
unsupported on this route (Pro custom MCP is read/fetch only; no tunnel set
up). Installed A-to-B continuity, offline play and branch isolation proof on
the installed app. Signing/notarization remain out of scope.
