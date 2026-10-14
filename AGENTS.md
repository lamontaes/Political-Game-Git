# Our Civic Duty — repository guide

A political and government RPG with a full life simulation underneath. Every Claude and Codex session follows this file. Keep it short: rules that must never be skipped are automatic checks, and detailed how-tos live in `.agents/skills/`, `.agents/rules/standing-skills/` and `.agents/rules/`.

## Where the game is going (owner, Oct 10, 2026)

- **The new core (`src/core2`) is the engine.** Build onto it through modules and data rows. Never start a parallel engine, writer, scheduler or system. The old core runs only until each piece is ported (`docs/design/core2-porting-plan.md`); add no new features to it.
- **Progress is the golden path with the world running.** The player's path: turn 18 → meet people → file for office where that place files (clerk, registrar or board of elections, from its records) → campaign → win or lose → propose an ordinance → negotiate → pass or fail → the town visibly changes → people bring it up → the next election uses the record. Around it the whole time: the national economy, state and federal governments acting through the same engines as local government, and other places at a coarser level. Report the furthest step a player reaches, never an audit percentage.
- **The Political Process is the baseline (owner, Oct 12).** The game does everything _The Political Process_ (Verlumino Studios) does, then goes deeper from the owner's decisions and the design record. `docs/roadmap/political-process-baseline.md` maps each of its systems to our specs.
- **Early access:** local and state offices playable (council, mayor, county, state legislature, governor), including the executive role. Federal is built in parallel on the same engines; playing as president is a goal that early access doesn't wait for. Courts come after early access.
- **The roadmap is `docs/ROADMAP.md`.** Work is tracked on the GitHub Project. Owner ideas go into its "Next" list and get scheduled at the weekly reschedule; work in progress finishes unless the owner says stop.

## Keep it simple (owner, Oct 11, 2026)

This section overrides anything heavier elsewhere in this file, in `docs/packages/` or in a work order.

- **Two-level population.** Full individual people exist only where they matter: the player, their household and circle, people they meet or click on, officials and other named people. Everyone else is the modeled wider population (counts by place, age, job and household, plus voter groups), filled in as a full person the moment the player meets or clicks them, seeded from the world so the same person comes back every time. A filled-in person must match what the records already say (if a business's books show 12 employees, the one you click is one of those 12, with that job and pay). Nobody gets a full past or memory until they're filled in.
- **Bookkeeping is a debug switch.** Read tracing, validation, copying and freezing run in tests and the bench, not in play. Save "why" reasons only for the player and the people they deal with.
- **One run, one number.** No repeat medians, receipt files, frozen copies or proof ceremonies unless a result is disputed.
- **Build only what the golden path needs.** Port what it actually uses; write it fresh when that's simpler. Don't carry old code over just because it exists.
- **Every day ends with something the owner can play.** Report what he can do now in plain words, not PR numbers.
- **Short work orders:** what to build, the rules it must follow, and how the owner will play it to know it works.

## The team (owner, Oct 11, 2026)

Long-lived Opus cloud sessions ("pillars") each own one area. **The pillars run on the owner's current account only (owner, Oct 14, 2026):** the CTO opens each pillar as a cloud session on this account and assigns work to it there; the old account's sessions are cut off and get nothing. Each works down its checklist in `docs/coordination/` and then keeps going into its area's next roadmap items, stopping only when it's out of usage (see "No stopping" below). A checklist is an order of work, not a ceiling.

| Session     | Owns                                                                                                                       | Model        |
| ----------- | -------------------------------------------------------------------------------------------------------------------------- | ------------ |
| OPUS-CORE   | The core, `src/core2`: state, clock, choices, ledger, population, speed, money; everything not listed below                | Opus, high   |
| OPUS-GOV    | `src/rules` and the government engines: laws, budgets, programs, offices, elections and campaigns, legislatures, executive | Opus, medium |
| OPUS-PEOPLE | The people engines (people, health, drives, views, renewal), the story director (`src/director`) and the English engine    | Opus, high   |
| OPUS-PLAY   | The bench, `src/bench`; the game screens on the new core; the evening build; store screenshots                             | Opus, medium |
| OPUS-WORLD  | The economy engines: macro, regional, jobs, housing, credit, business                                                      | Opus, medium |
| FIXER       | Nothing of its own: bugs the CTO assigns, one per PR                                                                       | Sonnet, high |

- An engine is `src/core2/modules/<name>.ts` with its helpers `src/core2/<name>-*.ts` and data `src/core2/data/<name>/`; it belongs to the pillar that owns that engine.
- Each session writes only in its own area, on its own branch. Changes to the core go through OPUS-CORE: ask on its PR, and it answers within the day.
- Each session keeps one status file, `docs/coordination/<session>.md`, and is its only writer: its checklist, what it needs from others, and what the owner can play now. Only the CTO writes `docs/coordination/BOARD.md`. Cloud sessions can't reliably message each other, so the CTO relays.
- Codex and any other session build under the pillar that owns the area.
- **No stopping (owner, Oct 12, 2026).** The pillars build the whole game, not just tonight's list. When your checklist is done, keep going through your area's specs in every later milestone (`docs/roadmap/later-specs-draft.md`, M2 to M7), then take open work from `docs/coordination/BOARD.md`. Nothing waits on another session: if you need something from one, build against the smallest stand-in on your own branch, register it as a stopgap (a marker in the code and a row in `src/core2/data/stopgaps.json` naming what it fakes and what replaces it; see "Placeholders"), note it under "Needs from other sessions", and keep going. Nothing waits on the owner: where a design is his call and he hasn't ruled, build the simplest version that follows this file, write the question in your status file, and keep going; he reviews by playing. The only stop is running out of usage.

## Who does what

- **Codex and the Claude engineering account build** (owner, Oct 11), on draft PRs, from a package spec in `docs/packages/`. Codex takes broad and data-heavy work (research, ports, data, tests). The Claude engineering account takes the critical path and work where mistakes cost most (core speed, money, people modeling, and work orders the CTO assigns to it).
- **Checks stay light (owner, Oct 11).** Builders test their own work. Three checks are automatic and the only ones that block: the golden-path suite, the speed guard, and every dollar balancing. The owner plays the evening build, and that's the real check. Checker sessions play alongside and file bugs to the fixer; they never hold a builder up.
- **The CTO merges.** Nobody merges their own PR. The owner approves designs and package text before anything is sent to a session; the pillars' work under "No stopping" is the exception, and he reviews it by playing.
- **One writer per area.** Stack branches on the core; never push to another session's branch. Claim a task on the GitHub Project before starting it (pillars claim in their status file).
- **Helpers.** A helper needs an independently useful bounded output and explicit path/tool ownership; no recursive delegation or duplicate full-repo review. Preserve configured concurrency limits. Model effort is proportional to the actual task (see `model-effort`).

## Models, effort and helpers (owner, Oct 10: mind the usage)

Every package names its model and effort with a one-line reason. Balance usage against effectiveness: normally lean toward saving usage (about 60–65% thrift, 35–40% raw power); near or right after a usage reset, about even, or tilted toward effectiveness. Not the cheapest possible, and nothing runs at the top level just because it's available.

- **Codex builds at medium** by default (OpenAI's recommended default for coding). **High** only when the package says why: core architecture, money conservation, or rules every port depends on. **Extra-high only after high has failed** at a named task.
- **The Claude engineering account builds with Sonnet at high** by default, and **Opus at high** for judgment-heavy design.
- **Checkers run on Sonnet at high** when needed: playing the evening build and investigating a disputed result. **Opus at high** only for a judgment-heavy dispute. **Max** only after high has failed at a named task. Medium is fine for small, clear fixes.
- **Helpers: the 3-2-1 rule (owner, Oct 14, 2026).** Every session may run sub-agents up to one of these: three Haiku, two Sonnet, or one Opus. Only for work that runs in parallel or for research and reading, never to pass the session's own job along. Each gets a clear objective, an output format, allowed paths and tools, and is read-only unless the package says otherwise. Codex keeps its repository setting of two. **Audits are the exception (owner, Oct 14):** a trace audit runs as its own Opus session with up to ten Haiku agents, one bounded path each; one Sonnet agent verifies every Haiku claim against the code; Opus plans, assigns and writes the report.
- **Pillars may build with sub-agents (owner, Oct 12, 2026, 10:30 a.m.).** Each pillar session may run its own Sonnet or Opus sub-agents that write code, choosing what fits: a Sonnet sub-agent fixing bugs while an Opus one builds the next roadmap step, two Opus sub-agents splitting a big build to finish it faster, or Sonnet only when the work doesn't need Opus. The rules:
  - each sub-agent works on its own files or in its own worktree, inside the pillar's own area, so two never edit the same file;
  - the pillar gives each a clear task, its allowed paths and its check (a test in a random place), then reviews and merges the result into its branch;
  - sub-agents follow every rule here (no hand-written player text, registered stopgaps, the guards) and never edit another session's area;
  - the pillar's status file says which sub-agents ran, on what model, and what they finished.
  - onto main, and for every fixer PR into a pillar branch, only the CTO merges, and reports each merge in the owner's chat. The CTO's look before merging is a quick check that the work is real and breaks none of these rules (owner, Oct 12, 10:35 a.m.), not a line-by-line review; the automatic checks and the owner's playtests carry the rest.
- **One package per session**, then a fresh session. The pillars are the exception: they're long-lived, automatic compaction carries their context, and their status file carries their state. Stop and report instead of escalating when something keeps failing.
- **Track what each choice costs.** Every hand-off records the model and effort, how long it took, usage if visible, and how many times the finisher sent it back (and why). The CTO keeps `docs/roadmap/model-log.md` and adjusts defaults from it: a cheaper, faster setup that needs a few more send-backs is fine (owner, Oct 10).

## How every session works

1. **Start:** read the package (or your status file), the roadmap's progress file and the git log; run the golden-path suite (`node --import tsx tests/golden-path/runner.mjs`) and, once the bench is on your branch, open it; confirm the game still works before changing anything.
2. **Contract:** before building, write what you will build and how it will be checked (the golden-path test, in a random place) in the PR body, then **start right away**. Don't wait for approval unless you're changing the package's scope, its owned paths or a test; the CTO reviews contracts at check-ins and sends one back if needed.
3. **One feature at a time.** Commit after each meaningful unit, with tests passing.
4. **Finish:** update the progress file, including what failed and why; leave the branch mergeable. The next feature gets a fresh session; pillars continue in theirs.
5. **Done means it works in play:** its own tests and the automatic guards pass, and it's in the evening build for the owner to play.

## Placeholders

- Every shortcut (a number, text, behavior, a faked mechanic, assumed data, something that works in only one place) is a **registered stopgap**: an ID, a marker in the code, the reason, the author and date, and what replaces it. An unregistered placeholder is a defect.
- Builders may leave registered stopgaps; finishers clear each one or keep it with a reason the CTO accepts. The release build refuses to build while any stopgap is open, and the tripwire tests fail on an unregistered one.
- Every number lives in the parameter table, tagged SOURCED (with citation), ESTIMATED (with source and spread) or TUNABLE (with the spread it's checked against).

## Standing owner rules

Detail and self-checks are in the matching `.agents/rules/standing-skills/<name>/SKILL.md`.

- **No dice.** No seeded roll or fixed percentage decides what a person, business, official or body does; their traits, principles, relationships, money, health, the law in force and the place's conditions decide. Real rates check totals; they never pick one actor's outcome. Seeded generation of who exists is allowed. See `no-dice`.
- **Sliding scales and causes.** Nothing flips at a threshold. World events happen from causes (a hazard record, a health record, a law, a price change), never a monthly chance.
- **One rule, all 56 places.** Never name a state, city or GEOID in logic, plans or packages; place facts live in data. Tests and watched runs draw a random place from all 56 (50 states, D.C., Puerto Rico, Guam, USVI, American Samoa, Northern Marianas) and name the place and seed. See `one-rule-all-places`.
- **Estimate, never UNKNOWN.** A value a player can see starts from the real average with a per-world spread, marked as an estimate with its source. See `estimate-not-unknown`.
- **Wire to the world.** Every feature moves money, people or places, proven in a generated world, and applies to its whole module, not just the named example. See `wire-to-the-world`.
- **This is a game, not a spreadsheet (owner, Oct 14, 2026).** Research calibrates the simulation; it never adds a step to the player's life. No one builds a mechanic because real life has it: a filing fee, a tax return, a petition, a form. A mechanic exists only when the golden path needs it, _The Political Process_ has it (`docs/roadmap/political-process-baseline.md`), or the owner asked for it by name. Finding a real-world step the game lacks is a question for the owner in the PR body, not a feature. Depth comes from how people, money and places react, told as a story through the director and the English engine, not from more paperwork for the player.
- **An effect is a read, not a record (owner, Oct 13, 2026).** A law, a measure, a health record, a drive or a view has an effect only when a different engine reads it at the moment it decides or pays: a dollar on the journal, a price, who is marked eligible and then served, a decision's recorded reasons, or a kept measure that views, budgets, news or a screen reads. A record written on a person, a table nobody else reads, or a handler whose mechanic is "none" or "records" is an unregistered placeholder, not a feature. A module is finished when a one-year run of the played world (`buildBenchWorld`, every module installed, a seed the builder did not choose) shows another engine reading what it wrote, named by record id. A unit test that builds its own small world proves nothing about play.
- **Replace, never layer (owner, Oct 14, 2026).** A new look, engine, screen or rule replaces the old one in the same change: the old code, styles, data and markers are deleted, not left under or beside the new. A change that adds the new and keeps the old is not done. The PR body counts what was removed.
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
