# Our Civic Duty — repository guide

A political and government RPG with a full life simulation underneath. Every agent (Claude, Codex, Cursor, Antigravity or another) follows this file. It holds only what every session needs; procedures live in skills (`.agents/skills/`, mirrored in `.claude/skills/`), the standing rules' self-checks in `.agents/rules/standing-skills/`, and the command and constraint reference in `.agents/rules/repository-reference.md`. The code map is `ARCHITECTURE.md`; the docs map is `docs/README.md`.

## Where the game is going (owner, Oct 10, 2026)

- **The new core (`src/core2`) is the engine.** Build onto it through modules and data rows. Never start a parallel engine, writer, scheduler or system. The old core (`src/simulation`) only feeds the opening until each piece is ported (`docs/design/core2-porting-plan.md`); nothing new goes into it, and new `src/core2` imports from it are refused.
- **Progress is the golden path with the world running.** The player's path: turn 18 → meet people → file for office where that place files (clerk, registrar or board of elections, from its records) → campaign → win or lose → propose an ordinance → negotiate → pass or fail → the town visibly changes → people bring it up → the next election uses the record. Around it the whole time: the national economy, state and federal governments acting through the same engines as local government, and other places at a coarser level. Report the furthest step a player reaches, never an audit percentage.
- **The Political Process is the baseline (owner, Oct 12).** The game does everything _The Political Process_ (Verlumino Studios) does, then goes deeper from the owner's decisions and the design record. `docs/roadmap/political-process-baseline.md` maps each of its systems to our specs.
- **Early access:** local and state offices playable (council, mayor, county, state legislature, governor), including the executive role. Federal is built in parallel on the same engines; playing as president is a goal that early access doesn't wait for. Courts come after early access.
- **The roadmap is `docs/ROADMAP.md`; the work is the pool (`docs/pool/`).** Owner ideas become pool items the same hour.

## Keep it simple (owner, Oct 11, 2026)

This section overrides anything heavier elsewhere in this file, in a skill or in a pool item.

- **Two-level population.** Full individual people exist only where they matter: the player, their household and circle, people they meet or click on, officials and other named people. Everyone else is the modeled wider population (counts by place, age, job and household, plus voter groups), filled in as a full person the moment the player meets or clicks them, seeded from the world so the same person comes back every time. A filled-in person must match what the records already say (if a business's books show 12 employees, the one you click is one of those 12, with that job and pay). Nobody gets a full past or memory until they're filled in.
- **Bookkeeping is a debug switch.** Read tracing, validation, copying and freezing run in tests and the bench, not in play. Save "why" reasons only for the player and the people they deal with.
- **One run, one number.** No repeat medians, receipt files, frozen copies or proof ceremonies unless a result is disputed.
- **Build only what the golden path needs.** Port what it actually uses; write it fresh when that's simpler. Don't carry old code over just because it exists.
- **Every day ends with something the owner can play.** Report what he can do now in plain words, not PR numbers.

## How the work is organized

- **The pool is the only backlog** (owner, Oct 15). One file per item in `docs/pool/items/`; `docs/pool/INDEX.md` is generated. Claim before building with `npm run pool -- claim <id> --branch <branch>`, which pushes the claim to main. Add an item for anything you find. Details and paste prompts: `docs/pool/README.md`; the worker loop: `session-start`.
- **Anyone takes items** (Claude, Codex, Cursor, Antigravity or another). An item's `area` says whose engine it touches. Don't edit files another open PR is changing; one writer per branch. A sent-back item's Notes name its branch, and claiming the item transfers that branch to you.
- **Nothing waits** (owner, Oct 12). If you need another area's piece, build against the smallest registered stopgap on your own branch and say so in the PR body. If a design is the owner's call, follow "Owner decisions are flagged, never waited on" below. The only stop is running out of usage; then set your item back to open with a one-line note and push.
- **Mergers merge** (owner, Oct 20). Merger sessions follow `merger` in their own share (PR number parity or mod 4, newest or oldest first) and pin each merge to the head they checked. Nobody merges their own PR. The CTO merges only its own docs, skill and pool PRs, and audits the mergers' work (`merge-audit`).
- **Lead sessions** (owner, Oct 20). A big cross-system job (wiring every law, the outcome web, personality) runs as one Opus lead with Sonnet helpers. It writes a checker and a matrix (`wiring-audit`), opens one PR per family, and never says "wired" without the matrix row.
- **Status lives in the work:** the pool item's Notes and the PR body. A lead session also keeps `docs/reports/<job>-<date>.md`. Per-session status files in `docs/coordination/` are history.

## Models, effort and helpers

- **The owner picks the model per job** (Oct 20). Opus for leads, merging judgment, audits and the Words line; Sonnet for building and fixing; Codex at medium by default, high only when the job says why. Effort is proportional to the task, and so is the helper count.
- **Mind the weekly usage.** Above about 75%, go lean: fewer helpers, no new sessions without the owner's word. Near or right after a reset, lean toward effectiveness.
- **Helpers.** A helper needs an independently useful bounded output and explicit path and tool ownership; no recursive delegation or duplicate full-repo review. Each works in its own files or worktree, gets a clear objective, its check and an output format, and is read-only unless its brief says otherwise; the lead reviews every diff before it becomes a PR. Preserve configured concurrency limits (Codex: two). Model effort is proportional to the actual task.

## How every session works

1. **Start** (`session-start`): read this file, the item and its Notes, and the last rulings in `docs/coordination/OWNER-DECISIONS.md`. Install, then run the golden-path suite (`node --import tsx tests/golden-path/runner.mjs`) before changing anything.
2. **Red main comes first** (owner, Oct 15). If the latest release run on main is red, claim `release-main-red`, fix it at the root on its own PR, then return to your item.
3. **Build** one item at a time to its done-when, committing each meaningful unit with its tests passing.
4. **Open the PR ready for review**, following `.github/PULL_REQUEST_TEMPLATE.md`. Line 1 is `Pool item: <id>`, then the gate line naming your changed-file checks and their results, then what changed for the player, what was removed, and any **OWNER DECISIONS NEEDED**. Set the item `in-pr`.
5. **Done means it works in play:** another engine reads what it wrote in a played world (`played-world-proof`), the guards pass, and the owner can play it.

## Placeholders

- Every shortcut (a number, text, behavior, a faked mechanic, assumed data, something that works in only one place) is a **registered stopgap**: an ID, a marker in the code, the reason, the author and date, and what replaces it, in `src/core2/data/stopgaps.json` (the director has its own). An unregistered placeholder is a defect.
- **Look before you register** (owner, Oct 15): read `docs/coordination/DECISION-REGISTER.md` and `docs/coordination/OWNER-DECISIONS.md` and search `docs/` for the subject. If it was decided, build the decision and cite it; if it's built, use it.
- Builders may leave registered stopgaps; finishers clear each one or keep it with a reason the CTO accepts.
- Every number lives in a parameter table, tagged SOURCED (with citation), ESTIMATED (with source and spread) or TUNABLE (with the spread it's checked against). Research turns stopgaps and tunables into sourced values (`researcher`).

## Standing owner rules

Detail and self-checks are in the matching `.agents/rules/standing-skills/<name>/SKILL.md`.

- **No dice.** No seeded roll or fixed percentage decides what a person, business, official or body does; their traits, principles, relationships, money, health, the law in force and the place's conditions decide. Real rates check totals; they never pick one actor's outcome. Seeded generation of who exists is allowed. See `no-dice`.
- **Sliding scales and causes.** Nothing flips at a threshold. World events happen from causes (a hazard record, a health record, a law, a price change), never a monthly chance.
- **One rule, all 56 places.** Never name a state, city or GEOID in logic, plans or items; place facts live in data. Tests and watched runs draw a random place from all 56 (50 states, D.C., Puerto Rico, Guam, USVI, American Samoa, Northern Marianas) and name the place and seed. See `one-rule-all-places`.
- **Estimate, never UNKNOWN.** A value a player can see starts from the real average with a per-world spread, marked as an estimate with its source. See `estimate-not-unknown`.
- **Wire to the world.** Every feature moves money, people or places, proven in a generated world, and applies to its whole module, not just the named example. See `wire-to-the-world`.
- **This is a game, not a spreadsheet (owner, Oct 14).** Research calibrates the simulation; it never adds a step to the player's life. A mechanic exists only when the golden path needs it, _The Political Process_ has it, or the owner asked for it by name. Finding a real-world step the game lacks is a question for the owner in the PR body, not a feature. Depth comes from how people, money and places react, told through the director and the English engine.
- **An effect is a read, not a record (owner, Oct 13).** A law, a measure, a health record, a drive or a view has an effect only when a different engine reads it at the moment it decides or pays: a dollar on the journal, a price, who is marked eligible and then served, a decision's recorded reasons, or a kept measure that views, budgets, news or a screen reads. A record nobody else reads is an unregistered placeholder. A module is finished when a one-year run of the played world (`buildBenchWorld`, every module installed, a seed the builder did not choose) shows another engine reading what it wrote, named by record id. A unit test that builds its own small world proves nothing about play.
- **Replace, never layer (owner, Oct 14).** A new look, engine, screen or rule replaces the old one in the same change: the old code, styles, data and markers are deleted, not left beside the new. The PR body counts what was removed.
- **One model, two tiers (owner, Oct 14).** The counted population is not a second simulation. A counted group is read by every engine with the same rule as a full person, times its count. A rule that applies only to full people is an unregistered placeholder.
- **The chain is the acceptance (owner, Oct 14).** A bill, a budget line or an executive act is finished only when one dollar or one rule is followed to a named person and back out: the record, the law in force changing, the payment or price that changed, the person it reached, the choice or view that moved, and the director's scene or journal line, by record id.
- **Look before you ask (owner, Oct 14).** Before any question goes to the owner, and before the CTO rules in his place, read the decision register and `OWNER-DECISIONS.md` and search `docs/`. Most of what looks open was decided; quote the decision instead of asking.
- **Ask why (owner, Oct 14).** Every proof answers why, by record. Nobody attributes a change to a law unless they learned of it (news received, a conversation, a notice, an ad), and the stance cites that source. See `ask-why`.
- **Owner decisions are flagged, never waited on (owner, Oct 14).** Build the simplest version that follows this file, register a stopgap of kind `owner-decision`, and write the question under **OWNER DECISIONS NEEDED** in the PR body and in `OWNER-DECISIONS.md`. The CTO brings the open list to the owner in one sitting.
- **No hand-written player text.** Words come from the English engine; screens show record data and control names. Authored bank pieces stay `shippable: false` until graded (`words-engine`).
- **Research before building.** Real data checks the simulation and never decides an outcome by itself. See `research-habit`.
- **Speed.** A town's game year must run in under two minutes (`npm run speed:year`). No change may make a year more than 20% slower than its base, measured on the same base and machine, one process at a time. Never scan the whole world or history every day; use indexes or act on the day something changed.
- **Saves don't matter** until early-access preparation, when a versioned save format is built.
- **American English everywhere**, enforced by `tests/american-english-sweep.test.ts`; `npm run spelling` lists what it would flag.

## Process

- **Local gate, not the full suite.** Typecheck, eslint and prettier on changed files, `release:check --mode pr`, `npm run zero-dice`, `npm run pool -- --check`, the tests for changed files, and `npm run test:skill-ops` when instruction files change (`npm run agent:test-cadence` lists the commands for your changed files). A failure that's also red on clean `main` doesn't block. Never force-push; never permanently delete. See `local-gate`.
- **Generated-world proof.** Claims about simulation-driven events, scenes, dialogue or law effects need the route in an ordinary generated world through existing producers and writers, naming the place, seed and record ids. Hand-inserted fixtures prove edge cases only.
- **A fix lands on the branch where the failure reproduces.** Diagnose from the log on every platform that shows the failure.
- **Owner reports** use `civic-reports`: what changed for the player first, then the numbers, in plain American English.

## Skills

Load a skill when its trigger fits; descriptions say when. Process: `session-start` (worker loop), `pr-fixer` (finish a sent-back PR), `merger`, `merge-audit`, `wiring-audit`, `researcher`, `played-world-proof`, `ask-why`, `trace-audit`, `cto`. Content: `words-engine`, `civic-prose`, `civic-reports`, `browser-visual-acceptance`, `asset-scene-admission`.

## Implementation boundaries

- Simulation code is pure TypeScript, independent of DOM and external APIs.
- Unknown facts are not zero or permission. Read-only screens spend no game time and create no facts.
- Preserve asset originals, hashes and source-to-derivative lineage. No proprietary material from other games. Version numbers and patch notes belong to the release machinery.

## Workspaces and storage

On 2026-09-19 more than 100 GB of project copies filled the owner's Mac. Never copy the repository there.

- **Cloud sessions set the override themselves** (owner, Oct 15): a session in a cloud environment runs every npm command with `OCD_STORAGE_OVERRIDE="cloud session, owner approved Oct 14"` and never asks the owner to confirm it; the storage rules protect the owner's Mac, not cloud containers.
- On the Mac: reuse your registered workspace (`npm run storage -- workspace --owner <owner>`), run heavy commands through `npm run storage -- run <operation> -- <command>`, never use `npm ci`, `git clone`, `git worktree add` or `cp -R` to make another copy, check before deleting (`npm run storage -- check --path <folder>`), and send world runs, full suites and package builds to the cloud.
- Full rules: `.agents/rules/storage-and-workspaces.md`.
