# Our Civic Duty — repository guide

A political and government RPG with a full life simulation underneath. Every Claude and Codex session follows this file. Keep it short: rules that must never be skipped are automatic checks, and detailed how-tos live in `.claude/skills/` and `.agents/rules/`.

## Where the game is going (owner, Oct 10, 2026)

- **The new core (`src/core2`) is the engine.** Build onto it through modules and data rows. Never start a parallel engine, writer, scheduler or system. The old core runs only until each piece is ported (`docs/design/core2-porting-plan.md`); add no new features to it.
- **Progress is the golden path with the world running.** The player's path: turn 18 → meet people → file for office where that place files (clerk, registrar or board of elections, from its records) → campaign → win or lose → propose an ordinance → negotiate → pass or fail → the town visibly changes → people bring it up → the next election uses the record. Around it the whole time: the national economy, state and federal governments acting through the same engines as local government, and other places at a coarser level. Report the furthest step a player reaches, never an audit percentage.
- **Early access:** local and state offices playable (council, mayor, county, state legislature, governor), including the executive role. Federal is built in parallel on the same engines; playing as president is a goal that early access doesn't wait for. Courts come after early access.
- **The roadmap is `docs/ROADMAP.md`.** Work is tracked on the GitHub Project. Owner ideas go into its "Next" list and get scheduled at the weekly reschedule; work in progress finishes unless the owner says stop.

## Who does what

- **Codex builds.** Modules, ports, data and tests, on draft PRs, from a package spec in `docs/packages/`.
- **A separate Claude session finishes.** Opus for judgment calls, Sonnet for agreed designs. It checks the build against the package, clears or justifies every placeholder, wires it to the world, fixes defects and writes the owner's report. A builder never grades its own work.
- **The CTO merges.** Nobody merges their own PR. The owner approves designs and package text before anything is sent to a session.
- **One writer per area.** Stack branches on the core; never push to another session's branch. Claim a task on the GitHub Project before starting it.
- **Helpers.** A helper needs an independently useful bounded output and explicit path/tool ownership; no recursive delegation or duplicate full-repo review. Preserve configured concurrency limits. Model effort is proportional to the actual task (see `model-effort`).

## How every session works

1. **Start:** read the package, the roadmap's progress file and the git log; run the test bench and confirm the game still works before changing anything.
2. **Contract:** before building, write what you will build and how it will be checked (the golden-path test, in a random place). The finisher agrees first.
3. **One feature at a time.** Commit after each meaningful unit, with tests passing.
4. **Finish:** update the progress file, including what failed and why; leave the branch mergeable. The next feature gets a fresh session.
5. **Done means checked:** a feature is done only when the finisher has played it in the test bench in a randomly drawn place, never on the builder's word.

## Placeholders

- Every shortcut (a number, text, behavior, a faked mechanic, assumed data, something that works in only one place) is a **registered stopgap**: an ID, a marker in the code, the reason, the author and date, and what replaces it. An unregistered placeholder is a defect.
- Builders may leave registered stopgaps; finishers clear each one or keep it with a reason the CTO accepts. The release build refuses to build while any stopgap is open, and the tripwire tests fail on an unregistered one.
- Every number lives in the parameter table, tagged SOURCED (with citation), ESTIMATED (with source and spread) or TUNABLE (with the spread it's checked against).

## Standing owner rules

Detail and self-checks are in the matching `.claude/skills/<name>/SKILL.md`.

- **No dice.** No seeded roll or fixed percentage decides what a person, business, official or body does; their traits, principles, relationships, money, health, the law in force and the place's conditions decide. Real rates check totals; they never pick one actor's outcome. Seeded generation of who exists is allowed. See `no-dice`.
- **Sliding scales and causes.** Nothing flips at a threshold. World events happen from causes (a hazard record, a health record, a law, a price change), never a monthly chance.
- **One rule, all 56 places.** Never name a state, city or GEOID in logic, plans or packages; place facts live in data. Tests and watched runs draw a random place from all 56 (50 states, D.C., Puerto Rico, Guam, USVI, American Samoa, Northern Marianas) and name the place and seed. See `one-rule-all-places`.
- **Estimate, never UNKNOWN.** A value a player can see starts from the real average with a per-world spread, marked as an estimate with its source. See `estimate-not-unknown`.
- **Wire to the world.** Every feature moves money, people or places, proven in a generated world, and applies to its whole module, not just the named example. See `wire-to-the-world`.
- **No hand-written player text.** Words come from the English engine; screens show record data and control names.
- **Research before building.** Real data checks the simulation and never decides an outcome by itself. See `research-habit`.
- **Speed.** A town's game year must run in under two minutes. No change may make a year more than 20% slower than its base: measure before and after on the same base, on the same machine, one process at a time. Never scan the whole world or a whole history every day; use indexes or act on the day something changed.
- **Saves don't matter** until early-access preparation, when a versioned save format is built.
- **American English everywhere**, enforced by `tests/american-english-sweep.test.ts`; `npm run spelling` lists what it would flag. Persisted identifiers keep their spelling.

## Process

- **Light by default.** Reviews and evidence reports at milestones, not on every patch. Provenance is tracked by record type, not on every item. PR bodies say what changed for the player, the measured result and what's next.
- **Local gate, not the full suite.** Typecheck, eslint and prettier on changed files, `release:check --mode pr`, `npm run zero-dice`, and the tests for changed files. A failure that's also red on clean `main` doesn't block. Never force-push; never permanently delete. See `local-gate`.
- **Generated-world proof.** Claims about simulation-driven events, scenes, dialogue or law effects need the route in an ordinary generated world through existing producers and writers, naming the head, seed, place and record ids. Hand-inserted fixtures prove edge cases only.
- **A fix lands on the branch where the failure reproduces.** Diagnose from the log on every platform that shows the failure.
- **Owner reports** use `.agents/skills/civic-reports/`: what changed for the player first, then the numbers, in plain American English.

## Implementation boundaries

- Simulation code is pure TypeScript, independent of React, DOM and external APIs.
- Unknown facts are not zero or permission. Read-only screens spend no game time and create no facts.
- Preserve asset originals, hashes and source-to-derivative lineage. No proprietary material from other games. Version numbers and patch notes belong to the release machinery.

## Workspaces and storage

On 2026-09-19 more than 100 GB of project copies filled the owner's Mac. Never copy the repository.

- Reuse your registered workspace: `npm run storage -- workspace --owner <owner>`. A new chat, retry or branch is not a new directory.
- Run heavy commands through `npm run storage -- run <operation> -- <command>`. Never use `npm ci`, `git clone`, `git worktree add` or `cp -R` to provision another copy of the project.
- Never delete by name; check first with `npm run storage -- check --path <folder>`.
- No world runs, full suites or package builds on the owner's Mac; heavy runs go to the cloud.
- Full rules: `.agents/rules/storage-and-workspaces.md`. Command reference: `.agents/rules/repository-reference.md`.
