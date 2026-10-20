# Repository technical reference

Commands and lasting technical constraints. `AGENTS.md` holds the rules; consult the section you need, not the whole file.

## Where truth lives

- **Executable truth** is live GitHub and the repository: code, tests, branches, PR heads, CI. Fetch it; never trust a remembered or local SHA.
- **Rules:** [`AGENTS.md`](../../AGENTS.md). **Work:** the pool, [`docs/pool/README.md`](../../docs/pool/README.md). **Rulings:** `docs/coordination/OWNER-DECISIONS.md`, then `docs/coordination/DECISION-REGISTER.md`.
- **The code as built:** [`ARCHITECTURE.md`](../../ARCHITECTURE.md). **The docs map:** [`docs/README.md`](../../docs/README.md), which marks what is current and what is history. **Scope:** [`docs/ROADMAP.md`](../../docs/ROADMAP.md).
- **Product principles:** [`docs/GAME-CONSTITUTION.md`](../../docs/GAME-CONSTITUTION.md) is reference; where it allows randomness or teaching steps, `AGENTS.md` ("No dice", "This is a game, not a spreadsheet") wins.
- **History:** dated plans, completion reports, evidence and audits record what happened. They are never current state or authorization.

## Commands

- `npm run bench`: the play and Dev mode server (`src/bench/server.ts`, port 3000).
- `node --import tsx tests/golden-path/runner.mjs`: the golden-path suite.
- `npm run typecheck`, `npm run lint`, `npm run build`: whole-project checks. Run eslint and prettier on changed files for a PR.
- `npm run test`: the full vitest run. `npm run validate`: the full suite. Neither is a PR gate; run the tests for changed files.
- `npm run zero-dice`: the dice guard. `npm run old-imports`: what still keeps `src/simulation` alive.
- `npm run speed:year`: a timed town year (two-minute limit, no more than 20% slower than its base).
- `npm run all-places`: the played world in all 56 places (cloud only).
- `npm run pool` and `npm run pool -- --check | claim | status | add`: the pool (`docs/pool/README.md`).
- `npm run release:declare -- <id>`: declare a change for the player-facing notes. `npm run release:check` (`-- --mode pr` for a PR) validates declarations and versions. `npm run release:preview` shows what the next push to `main` would release.
- `npm run stopgaps:report`: the open stopgaps.
- `npm run spelling` (American English), `npm run wording:check` (player wording), `npm run report:check -- <file>` (owner reports).
- `npm run agent:preflight`, `npm run agent:test-cadence`: workspace facts, and focused commands for changed files. `npm run test:skill-ops`: the instruction-file contract (skills, mirrors, these rules).
- `npm run storage -- status | workspace --owner <o> | run <operation> -- <command> | check --path <folder>`: the workspace and disk guard. It protects the owner's Mac; cloud sessions set `OCD_STORAGE_OVERRIDE` (see `storage-and-workspaces.md`).
- Art: `npm run validate:art`, `npm run inventory:art`, `npm run qa:art`, `npm run derive:scene-tiers`, `npm run intake:pg-modular`, `npm run measure:arms`.

## Working rules

- Keep `src/core2/` pure TypeScript, runnable without DOM or external APIs. The old core under `src/simulation/` gets no new work and goes once each piece is ported.
- Keep jurisdiction rules and sourced facts in data; never name a state, city or GEOID in logic.
- Preserve stable IDs, keyed generation, established facts and append-only history.
- Update the affected docs and tests with a behavior change.
- Every eligible change declares `impact: patch`, `minor` or `none` once in `docs/release/changes/`. `package.json` `version` and `PATCH_NOTES.md` are advanced only by the release on `main`, never by a branch or an agent. See [Releases](../../docs/release/README.md).
- Use no proprietary code, assets, text or implementation from other games.

## Art and asset constraints

- **Scene-first:** shared global assets, then reusable environment families, then jurisdiction or building deltas, then explicitly justified hero environments.
- **Provenance and rights:** preserve them for every source and generated asset. Unknown rights stay unknown; visibility never implies public domain or commercial reuse.
- **No fabricated precision:** measurements carry a confidence class (`exact`, `plan-derived`, `specified`, `bounded-estimate`, `visual-estimate`); missing ones stay missing.
- **No repository upscaling:** the pipeline never enlarges a raster. An external upscale is a candidate master only with its lineage declared, and that lineage follows every derived tier.
- **Lived-in, not legible:** anything the simulation owns (names, seals, bill numbers, headlines, dates, results, portraits) belongs in a declared dynamic surface slot, never baked into the picture.
- **Art identity is not a world label:** a scene family describes what the art depicts. What the world calls it comes from the world's records, never from a filename or tag.
- Adding a room is authoring data, never scene-specific screen code. See `docs/systems/scene-authoring-pipeline.md` and `docs/systems/art-assets.md`.

## Coding-agent operations

- Load the matching skill in `.agents/skills/` when its trigger fits; keep optional detail out of `AGENTS.md`.
- Verify the exact branch, local SHA and upstream SHA before publishing, and re-fetch the remote head right before pushing. Never force-push.
- For visual work, passing automated tests are not visual acceptance; visible controls need real pointer and keyboard activation.
- A completion report states the head, the checks actually run, remaining defects and what the owner can now play.
- Don't solve a recurring process problem by making prompts larger; encode it in a skill, a check or a pool item.

Helpers: delegate only when the user or repository/skill instructions authorize it and the helper has an independently useful bounded deliverable. Record its input, base/head, allowed paths and tools, expected output, and any model/effort override with its resource rationale. Helpers are read-only by default, may not spawn helpers recursively, and do not replace the parent's integration and verification. Do not commission redundant whole-repository reviews. A lead session (Opus with Sonnet helpers, `AGENTS.md`) reviews every helper diff before it becomes a PR. In trusted fresh Codex sessions, project config caps open helper threads at two per parent; that runtime ceiling excludes the primary thread and unrelated tasks.
