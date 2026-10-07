# Our Civic Duty — repository guide

A political and government RPG with supporting life simulation. Deliver the requested player experience through the existing systems; do not expand routine jobs, school administration, or tooling because a substrate exists.

## Standing owner rules

Owner's standing rules, binding on every session regardless of trigger. Detail and
self-checks are in the matching `.claude/skills/<name>/SKILL.md`.

- **No dice.** No seeded roll or fixed percentage decides what a person, business,
  official or body does; the actor's traits, principles, relationships, money,
  health, the law in force and the place's conditions decide. Real rates check
  totals, they never pick one actor's outcome. See `no-dice` — a rolled outcome
  erases the player agency the game exists to reward.
- **Sliding scales, causes, births (owner, Sept 29).** Nothing flips at a
  threshold; every factor bears on a decision smoothly. World events happen from
  causes (a hazard record and season, a health record, a law, a price change),
  never a monthly chance. A new person's looks, name and upbringing come from
  their parents, real records and their family's circumstances; a seeded pick
  is allowed only among real options. Starting values are realistic (real
  averages with a per-world spread), not necessarily the real 2026 figure.
- **Speed budget (owner, Sept 29).** No change may make a game year more than
  20% slower than main. Run `npm run speed:years -- --years 3` against
  current main and the candidate in exclusive host windows. The local gate
  (`node scripts/local-gate.mjs --baseline <main-receipt> --tests <files>`)
  refuses any year over 120% of main. Never scan the whole world or a
  whole history list every day; use indexes or act on the day something changed.
- **One rule, all 56 places.** Never name a state, city or GEOID in logic; place
  facts live in data, and watched runs and tests draw a random place from all 56
  (50 states, D.C., Puerto Rico, Guam, USVI, American Samoa, Northern Marianas),
  naming place and seed. See `one-rule-all-places` — a fix proven in one place
  only is a demo, not a fix.
- **Estimate, never UNKNOWN.** An unread value a player can see starts from the
  real average with a per-world spread, marked ESTIMATED FROM AVERAGE with
  source; exact values are for things players actually recognize; finish simple
  research instead of estimating around it. See `estimate-not-unknown` — a
  visible gap breaks the world worse than a marked estimate does.
- **Wire to the world.** Every new law or feature moves money, people or places
  in the same PR, proven by a watched-world test; a bill carries its own terms
  written from its sponsor's views, and a rule applies to its whole module, not
  just the named example. Fix a known bug with a fast fix instead of only
  reporting it. See `wire-to-the-world` — scaffolding nobody can see happen
  isn't delivered.
- **Emergence, reported.** Every hand-back opens `MERGED`, then `WHAT EMERGED`
  with each outcome marked `DECIDED` (quote the recorded reason) or `HARDWIRED`
  (file:line), then wider knock-on effects and missing links, then
  `VITAL STATISTICS`. Report only what the simulation actually traced. See
  `emergence-report` — the owner tracks the game by what it produced, not intent.
- **Local gate, not the full suite.** Validate typecheck/eslint/prettier on
  changed files, `release:check --mode pr`, `npm run zero-dice`, and the tests
  for changed files (browser specs only if screens changed); a failure that's
  also red on a clean `main` doesn't block. Never force-push, never a permanent delete. See
  `local-gate` — a light gate that runs beats a heavy one everyone skips.
- **Research before building.** Look up real examples of whatever the feature
  touches across the country; real data checks the simulation and never decides
  an outcome by itself, and player screens never show sources. See
  `research-habit`.
- **Scenes are places, not backdrops.** A scene is a background shaped by the
  world's current state, narration that reads that state, anchors, and the real
  people actually there, posed and clickable; places are multi-use by default.
  See `scenes`.
- **Lowest model/effort that works.** Sonnet Medium for agreed designs, Opus
  Medium (not High) for judgment calls; escalate only after the lower tier
  actually fails. See `model-effort`.

## Current assignment and evidence

The assigned Google Doc and the current Assignment Board own product scope and ownership. Live GitHub, source and executed checks establish implementation state. Historical reports are evidence at their named heads, not current tasks. Read the assigned task once, check the Board's current dispatch and relevant decision entries, and fetch the working refs. Resume from that state; reread only when a dependency, scope or owner changes. Do not traverse the whole ledger and every past handoff for each edit.

The Game Constitution and accepted decisions remain binding. Consult `docs/GAME-CONSTITUTION.md` and `docs/decisions/DECISION-LOG.md` for product/semantic choices; `ARCHITECTURE.md` and the relevant `docs/systems/` contract for a boundary change; release/deployment documentation for a publication change. Ordinary local repairs do not require another whole-project architecture audit. Contradictions are resolved explicitly, not by silently weakening a contract.

Full command and technical reference: `.agents/rules/repository-reference.md`. Its older universal reading/verification itinerary is superseded by this task-sensitive routing; its applicable substantive constraints remain in force. Use matching `.agents/skills/` only when the task triggers them. Any report or write-up for the owner triggers `.agents/skills/civic-reports/`.

## Implementation boundaries

- Keep simulation code pure TypeScript, independent of React, DOM and external APIs. Reuse canonical people, employment, enrollment, time, actions, money, knowledge, history and art systems.
- Preserve IDs, seeded identity, old saves, source evidence and append-oriented history. Unknown facts are not zero or permission. Read-only screens spend no game time and do not create facts.
- A scoped fictional event may be authored through existing simulation writers, then rendered from its recorded context. A prose-only renderer must not invent facts absent from its packet. Do not replace a missing producer with vague text or pretend a proposed action already happened.
- Use actual jurisdiction/location records. Kentucky/Lexington is an explicit scenario, not a universal normal-start default. Do not overwrite newer sourced behavior with an old placeholder assumption.
- Preserve asset originals, hashes, views and source-to-derivative lineage. Check the correct existing source bank before asking for replacement art. No raster enlargement, fabricated measurement, automatic art approval, or side-view deletion to satisfy a front-view consumer. Candidate preview and approved production remain distinguishable, with isolated saves.
- A room is first-person. Render actual present NPCs; do not manufacture relatives or add a second visible player merely to fill it.
- Write American English everywhere — player text, content, tests, docs, skill and instruction files: color, center, labor; miles, feet, inches, pounds, ounces; month/day/year dates. `tests/american-english-sweep.test.ts` enforces it, and `npm run spelling` lists what it would flag (`-- --write` repairs prose in place) — run it before merging new docs or copy; the house style is in `.agents/skills/civic-prose/references/prose-contract.md`. Persisted identifiers keep their spelling (`"cancelled"`, `returning-favour`); rename one only with the lanes that read it.
- No proprietary material from other games. Version numbers and patch notes remain owned by the release machinery, not hand-edited branch bumps.

## Ownership and execution

Use preflight and identify workspace, branch, local/upstream head before substantial work. Keep one writer per overlapping surface, working in your registered workspace (below); a genuinely parallel writer may need a separate tree, a retry or a new branch does not. Do not stash, reset, clean, force-push or overwrite someone else's work. Protect the owner's play folder, saves and port. Recheck upstream immediately before publishing.

Safe local implementation, fixture tests and repairs caused by the task do not require permission at every step. Continue through the running route, observed defects and handoff the task requests, rather than stop after the first component or report. Escalate only a material product/authority decision, missing permission, destructive action or paid external operation. LAND retains merge authority; do not self-approve consequential code.

A helper needs an independently useful bounded output and explicit path/tool ownership; no recursive delegation or duplicate full-repo review. Preserve configured concurrency limits. Model effort is proportional to the actual task, not permanently maximum.

## Workspaces and storage

On 2026-09-19 more than 100 GB of project copies had accumulated on the owner's Mac, and a manual cleanup removed the repository every worktree shared. `scripts/storage/` exists so that does not recur. It is a script, not an operating-system quota.

- Reuse the registered workspace: `npm run storage -- workspace --owner <owner>` returns the same folder every time. A new chat, retry, viewport, browser or small repair is not a new directory, and a new branch is a version-control operation in the folder you have. A temporary comparison tree needs a named task, exact baseline, lease and retirement condition.
- Guarded entry points take byte headroom first and refuse (exit 3) with the numbers, leaving source, saves, apps and evidence untouched. `npm run build` and any command started as `npm run storage -- run <operation> -- <command>` (or `node scripts/agent-run-receipt.mjs --storage <operation> …`) hold the reservation until the command ends, fails or is signaled. Playwright (`playwright.config.ts`), `desktop/scripts/stage.mjs` and `desktop/scripts/package.mjs` (all `dist:*`) hold it for their own process. `npm run agent:preflight` and `npm run storage -- gate <operation>` are admission checks only: they hold nothing afterwards. Defaults: 25 GiB free-space reserve; 60 GiB across at most 8 registered workspaces; 6 GiB and 3 recent runs per disposable output root. Machine overrides: `~/.ocd-dev/storage-policy.json`. The only exempt host is a GitHub-hosted Actions runner (`CI=true` alone is not); `OCD_STORAGE_OVERRIDE="reason"` records a deliberate bypass.
- What this is not. A reservation is admission control on an estimate, not a byte quota: a command can write more than was reserved, and nothing stops it mid-run. The workspace byte budget is checked when a workspace is created or registered, not continuously. The registry in `~/.ocd-dev/` is shared state, not interception: a checkout that does not contain `scripts/storage/` is not guarded at all.
- Outside the guard even here: `npm ci`/`npm install`, `vite`/`npm run dev`, plain `vitest`, the art, pack and source-acquisition scripts, raw `git clone`, `git worktree add`, `cp -R`, downloads, and any tool that never calls it. Run a heavy one through `npm run storage -- run <operation> -- …`, and never use them to provision another copy of the project.
- Output cleanup removes runs only inside an exact directory registered with `npm run storage -- output-root --path <dir>`, which must sit inside a registered workspace and may not be, contain or lie within source, a Git checkout or a protected path; any other root is measured read-only. A run stays if a `.pin` exists anywhere inside it, if it overlaps a protected path, if a live operation is writing it, or if it predates the root's registration and no disposition has been recorded (`--historical-disposable` records one).
- Never delete by name — `base`, `raw`, `scratch`, `backup`, `test-results` prove nothing. `npm run storage -- check --path <folder>` lists what blocks retirement: an active or protected path, a live reservation, unpublished commits, stashes, tracked changes, untracked files (private inputs and evidence are in no bundle), a common Git directory other worktrees use, an object store another clone borrows through alternates, or a folder another checkout reaches through a symlink (a shared `node_modules`). Only a network remote counts as published; a remote that is a folder on this machine does not. `npm run storage -- record --plan <plan.json>` writes a content manifest into the plan: source identity plus a SHA-256 of every tracked difference, staged entry, untracked file, index-skipped path and ignored file outside the plan's named `disposableRoots`, with symlinks bound by target. Approval covers those bytes only; `retire --plan <approved.json> --apply` refuses a path with no manifest and any path whose manifest no longer matches, re-checked at each removal.
- Large inputs are referenced, not copied: a code-only change reuses installed artwork and data, an unchanged lockfile reuses the valid install, and private packs are immutable — stage them, never edit in place.

## Validation and delivery

Use relevant format/lint/type checks, the actual release declaration range, focused behavior/regression tests and the affected integration path. Run the full gate when required by repository protections or by the final composition; don't repeat unaffected full suites after every tiny edit. Art changes run the applicable art gates; a prose or menu typo does not by itself require all art regeneration. No removed assertions, fake baselines, false passes or blanket timeout/exclusion workarounds.

UI changes need the real interaction and viewport being changed. Prose needs the actual assembled output and saved follow-through, not only row counts. Passing code tests is not human visual approval. Keep captures outside tracked evidence unless performing its explicit refresh workflow.

**Generated-world proof.** Claims about simulation-driven events, scenes, dialogue, or law consequences require the affected route in an ordinary generated world through existing producers and canonical writers. Fixed or hand-inserted fixtures supply edge-case evidence only; they do not prove the generated-world route.

Name the checked head, seed, world ID, simulation date, place, and relevant record IDs. Show actual conditions and effective laws only where the route consults them, and identify the actor knowledge, personality, and relationships it uses. Follow the same selected subject from eligibility through meaning and assembled English to saved consequences and reload. When applicable, include a different eligible subject or context, plus an ineligible or quiet case.

Reuse existing causal inspectors, traces, and calculators. Distinguish saved reasons from reconstruction using current code, and explicitly identify missing provenance. Inspection must remain pure: it must not advance time, write records, or invent facts.

Declare a finite acceptance endpoint for the affected route. In cloud work, complete focused checks on changed paths and send the exact checked head to Merge. Unrelated suites or worldwide coverage must not add a hold to that endpoint; repository protections remain binding. A documentation-only assignment ends when its changed documents are checked and merged and authorizes no engine edits.

A fix is not landed until it is on the branch where the failure reproduces. A correct fix with a correct explanation, committed to a sibling branch, leaves the failing branch exactly as red as before and looks from there like an unsolved problem; check the failing branch's own history before diagnosing, and after fixing, before calling it done. Diagnose a failure from a log on every platform that shows it, not from the first one: name an entry or a report after the failure observed, never after the suspected cause, until the cause is measured.

Publish cohesive ready fixes promptly. Minor safe polish is a follow-up, not a hold on unrelated useful work. Preserve unsafe paths behind their proper boundary until fixed. Report the exact published head/build route, what changed for the player, tests executed and specific remaining gaps. A PR, a merge into a feature branch, the build the owner plays, art approval and public release are different states.
