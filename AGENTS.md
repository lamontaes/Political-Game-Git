# Our Civic Duty — repository guide

A political and government RPG with a full life simulation underneath. Every agent (Claude, Codex, Cursor, Antigravity or another) follows this file. It holds only what every session needs; procedures live in skills (`.agents/skills/`, mirrored in `.claude/skills/`), the standing rules' self-checks in `.agents/rules/standing-skills/`, and the command and constraint reference in `.agents/rules/repository-reference.md`. The code map is `ARCHITECTURE.md`; the docs map is `docs/README.md`.

## Where the game is going (owner, Oct 10, 2026)

- **The new core (`src/core2`) is the engine.** Build onto it through modules and data rows. Never start a parallel engine, writer, scheduler or system. **One engine per mechanic (owner, Oct 27): there is one election engine, one body engine, one executive engine, one budget engine, one scene engine, one screen renderer per menu type; the level, office, body, place and law are data rows the one engine reads. A second engine or a per-level code path is a duplicate to delete. The simulation is the one layer that knows anything; every screen, scene, journal entry, news story and speech is a view of the same records (owner, Oct 28: "It's just different ways of displaying the same information... That's how literally every single game works"). A view that computes or stores its own version of a fact is a duplicate.** The old core (`src/simulation`) was deleted on Oct 28 (#6659); the `old-imports` guard refuses any attempt to bring it or its folder back.
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

- **Every assignment is SMART and every question comes after reading (owner, Oct 26; `.agents/rules/smart-and-look-first.md`).** Specific, measurable, attainable, realistic, time-bound, or it goes back to its writer. Nobody asks the owner or registers an `owner-decision` without the reading line that names `OWNER-DECISIONS.md`, `DECISION-REGISTER.md`, `prior-rulings/`, `LAW.md` and the `docs/` search. Research is allowed and expected. Review means a different session, any model or program. The crew of Oct 26 (owner and a local Opus on the lane, Words, one laws-and-effects lead, five or six Sonnet mergers, one or two fixers, Sonnet pool workers) is in that file.
- **Play first** (owner, Oct 24): "Only the bare minimum needs to be put in the game right now. I still can't play the game." The owner being able to play is the one measure; every report leads with it.
- **The pool is the backlog** (owner, Oct 15). One file per item in `docs/pool/items/`; `docs/pool/INDEX.md` is generated. Every item carries `lead:` (the role that owns it); lane items carry `milestone: play-first`. Claim before building with `npm run pool -- claim <id> --branch <branch>`, which pushes the claim to main; a merge into main whose PR body line 1 is `Pool item: <id>` flips the item to done on its own. Add an item for anything you find, after searching `docs/pool/items` for an existing one (add evidence to a match instead of a twin). Details and paste prompts: `docs/pool/README.md`; the worker loop: `session-start`.
- **How we talk** (owner, Oct 29, on the second account: "you're also your CTO and coordinator... you can message all the sessions, et cetera, and they can message you with questions for me"; `.agents/rules/how-we-talk.md`). Sessions message the CTO (questions for the owner, blockers, decisions) and the CTO messages them; and where two sessions' work meets, they message each other directly (owner, Oct 29: "be sure that the sessions communicate with each other... to make sure that systems aren't duplicated"). Who is running, what each owns and who must talk to whom is `docs/coordination/CREW.md`; before building anything in another session's area, ask that session whether it exists. A message never replaces the record. The Oct 28 ban was about the first account, where every message stopped on a permission prompt. Everything that must last goes through GitHub (the three files below, PR bodies and PR comments, pool Notes lines) or the owner's Drive. Three files on main carry everything: the channel `docs/coordination/LEADS-2026-10-24.md` (one section per role, newest at top, edit only yours, commit to main), `docs/coordination/MERGE-FIRST.md` (the CTO's merge order) and `docs/play-first/PROGRESS.md` (the lane's handoff log). A need from another role is a `Needs from others:` line and a pool item with `lead:` set. Every role reads the channel's CTO section at the start of each pass.
- **The play-first lane owns `src/bench`** (owner, Oct 24; `docs/play-first/`, skill `play-first`): many agents in turn, SMART and time-boxed, pushing constantly. It may edit `src/director`, `src/english` and `data/english` for lane items with the Words session's review (`Review: words`). Its law is `docs/play-first/LAW.md`.
- **Leads own matrices** (owner, Oct 20; `lead-session`, `wiring-audit`): laws, traits, speed, m0-m2 and effects, each an Opus lead with at most two Sonnet helpers, never "wired" without the row. **Each finished unit ships on its own (owner, Oct 27):** while the owner is awake and testing, one law, link, decision, scene or screen is one PR, merged the hour it is green; family batches are for overnight or when he says so; no merge holds except a red main. Words (`words-engine`) owns the director and English files and grades by scenes.
- **Mergers merge** (owner, Oct 20, count reset Oct 26; `merger`): five or six Sonnet mergers by PR number mod the count plus one or two fixers, `MERGE-FIRST.md` first, each merge pinned to the head they checked. Nobody merges their own PR.
- **The CTO rules and audits** (`cto`): records every ruling in `docs/coordination/OWNER-DECISIONS.md`, the only rulings log; rules what a standing rule answers; audits the mergers (`merge-audit`); merges only its own docs, skill and pool PRs.
- **Simulate it, don't ask (owner, Oct 24).** A mechanic real life has that the simulation needs is built from research as a background simulation, calibrated not hardcoded, with no question to the owner. Only design calls about the player's own experience reach him.
- **Nothing waits** (owner, Oct 12). Build against the smallest registered stopgap and say so in the PR body. The only stop is running out of usage; then set your item back to open with a one-line note and push. Anyone takes items, on any model; one writer per branch; a sent-back item's Notes name its branch and claiming it transfers that branch to you.

## Models, effort and helpers

- **The owner picks the model per job** (Oct 20; crew reshaped Oct 26). Opus for the one lead, the Words line, the CTO and the owner's local session; Sonnet for mergers, fixers, building and pool work; Codex at medium by default, high only when the job says why. Effort is proportional to the task, and so is the helper count.
- **Mind the weekly usage.** Above about 75%, go lean: fewer helpers, no new sessions without the owner's word. Near or right after a reset, lean toward effectiveness.
- **Helpers never copy the whole repository (owner, Oct 29: "they shouldn't. They should immediately delete what they don't need, or even more helpfully, only clone what they do need"; "This needs to be a project rule").** A full copy is about 3.3 GB, and six filled a cloud session's disk on Oct 29. A helper or sub-agent works in a sparse copy without the repository's image files (every folder stays, so typecheck, tests and guards run; images are two thirds of a copy), shares the main checkout's git objects instead of downloading them again, and links `node_modules` instead of installing it. A session that finds a full helper copy narrows it at once. Skill `helper-checkout`.
- **Helpers.** A helper needs an independently useful bounded output and explicit path and tool ownership; no recursive delegation or duplicate full-repo review. Each works in its own files or worktree, gets a clear objective, its check and an output format, and is read-only unless its brief says otherwise; the lead reviews every diff before it becomes a PR. Preserve configured concurrency limits (Codex: two). Model effort is proportional to the actual task.

## How every session works

0. **Three rules before anything (owner, Oct 27 night).** Every system is already built: find the engine that does it and wire through it; a new mechanic is a last resort and is itself a stopgap naming the engine you could not find. Every cut corner is a registered stopgap in `src/core2/data/stopgaps.json` (the director's own file for director ones), never a typed number, never a new tracking system. If you do not understand the ask, say so in your channel block or PR body and stop; do not guess and build.
1. **Start** (`session-start`): read this file, the item and its Notes, and the last rulings in `docs/coordination/OWNER-DECISIONS.md`. Install, then run the golden-path suite (`node --import tsx tests/golden-path/runner.mjs`) before changing anything.
2. **Red main comes first** (owner, Oct 15). If the latest release run on main is red, claim `release-main-red`, fix it at the root on its own PR, then return to your item.
3. **Build** one item at a time to its done-when, committing each meaningful unit with its tests passing.
4. **Open the PR ready for review**, following `.github/PULL_REQUEST_TEMPLATE.md`. Line 1 is `Pool item: <id>`, then the gate line naming your changed-file checks and their results, then what changed for the player, the **Done when** table (each line of the item's done-when with its evidence), what was removed, and any **OWNER DECISIONS NEEDED**. Before opening it, run the self-check in `session-start`: a done-when line without evidence means the item isn't done. Set the item `in-pr`.
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
- **This is a game, not a spreadsheet (owner, Oct 14).** Research calibrates the simulation; it never adds a step to the player's life. A mechanic exists only when the golden path needs it, _The Political Process_ has it, or the owner asked for it by name. A real-world step the player would have to take is a question for the owner in the PR body, not a feature; a real-world mechanic the background simulation lacks is built from research, not asked (Oct 24). Depth comes from how people, money and places react, told through the director and the English engine.
- **An effect is a read, not a record (owner, Oct 13).** A law, a measure, a health record, a drive or a view has an effect only when a different engine reads it at the moment it decides or pays: a dollar on the journal, a price, who is marked eligible and then served, a decision's recorded reasons, or a kept measure that views, budgets, news or a screen reads. A record nobody else reads is an unregistered placeholder. A module is finished when a one-year run of the played world (`buildBenchWorld`, every module installed, a seed the builder did not choose) shows another engine reading what it wrote, named by record id. A unit test that builds its own small world proves nothing about play.
- **Replace, never layer (owner, Oct 14).** A new look, engine, screen or rule replaces the old one in the same change: the old code, styles, data and markers are deleted, not left beside the new. The PR body counts what was removed.
- **One model, two tiers (owner, Oct 14).** The counted population is not a second simulation. A counted group is read by every engine with the same rule as a full person, times its count. A rule that applies only to full people is an unregistered placeholder.
- **The chain is the acceptance (owner, Oct 14).** A bill, a budget line or an executive act is finished only when one dollar or one rule is followed to a named person and back out: the record, the law in force changing, the payment or price that changed, the person it reached, the choice or view that moved, and the director's scene or journal line, by record id.
- **Look before you ask (owner, Oct 14; every session, every time, Oct 27: "I'm sick of seeing stuff fixed or asked that I've already done").** Before building, fixing, filing or asking, every session runs the `look-first` skill's search: `OWNER-DECISIONS.md`, the decision register, `prior-rulings/`, `LAW.md`, the sitting blocks, `docs/`, the pool and the owner's Drive. Most of what looks open was decided; quote the decision instead of asking, and end the question with the reading line (`.agents/rules/smart-and-look-first.md`); a question without it is sent back.
- **Ask why (owner, Oct 14).** Every proof answers why, by record. Nobody attributes a change to a law unless they learned of it (news received, a conversation, a notice, an ad), and the stance cites that source. See `ask-why`.
- **Owner decisions are flagged, never waited on (owner, Oct 14).** Build the simplest version that follows this file, register a stopgap of kind `owner-decision`, and write the question under **OWNER DECISIONS NEEDED** in the PR body and in `OWNER-DECISIONS.md`. The CTO brings the open list to the owner in one sitting.
- **No hand-written player text in code.** Words come from the English engine's banks (`scene-standard`); screens show record data only through worded labels and control names, never raw kinds, ids, ISO dates or unrounded numbers (`player-screen-text`). Every bank piece plays unless the owner's grades reject it; a grade run sets every bank at once, and nothing waits on his grading (owner, Oct 24; `words-engine`).
- **Research before building.** Real data checks the simulation and never decides an outcome by itself. See `research-habit`.
- **Speed.** A town's game year must run in under two minutes (`npm run speed:year`). No change may make a year more than 20% slower than its base, measured on the same base and machine, one process at a time. Never scan the whole world or history every day; use indexes or act on the day something changed.
- **Saves don't matter** until early-access preparation, when a versioned save format is built.
- **American English everywhere**, enforced by `tests/guards/english/`; `npm run spelling` lists what it would flag.

## Process

- **Local gate, not the full suite.** Typecheck, eslint and prettier on changed files, `release:check --mode pr`, `npm run zero-dice`, `npm run pool -- --check`, the tests for changed files, and `npm run test:skill-ops` when instruction files change (`npm run agent:test-cadence` lists the commands for your changed files). A failure that's also red on clean `main` doesn't block. Never force-push; never permanently delete. See `local-gate`.
- **Generated-world proof.** Claims about simulation-driven events, scenes, dialogue or law effects need the route in an ordinary generated world through existing producers and writers, naming the place, seed and record ids. Hand-inserted fixtures prove edge cases only.
- **A fix lands on the branch where the failure reproduces.** Diagnose from the log on every platform that shows the failure.
- **Owner reports** use `civic-reports`: what changed for the player first, then the numbers, in plain American English.

## Skills

**Every session grows the skills (owner, Oct 29: "Make sure every session knows that it can proactively create skills and update the skills that they use if they find stuff, or they can ask... I want skills to be made").** When you find something a skill should have told you (a trap you fell into, a fix that worked, a method you used twice, a check that caught a defect), add the line to that skill, or create a new skill when none covers it, in the same pass. A skill can be about how the crew works (owner, Oct 29: keeping helpers' cloned workspaces down to what they need, so sessions have disk space to work with) or about anything in the game. A new skill is `.agents/skills/<name>/SKILL.md` with frontmatter `name` (the folder name) and a `description` of 41 to 1,024 characters that says when to use it and when not; mirror it byte for byte to `.claude/skills/<name>/`, add one line for it to the list below, in alphabetical order, run `npm run test:skill-ops` and prettier, and add a release declaration with `impact: none`. Ship it inside your work PR, or as its own `skills:` PR, which the CTO merges at once without waiting on CI (owner, Oct 29: "You shouldn't need to wait for checks to pass on new skills"), after running the skill test locally for the mirror and the list. A skill line records a ruling, a standing rule or a method that worked; it never makes new policy. When you are unsure whether something is a skill line or a question for the owner, ask the CTO.

Load a skill when its trigger fits; descriptions say when. Every session, first: `look-first`. One skill per line, in alphabetical order, so two sessions adding skills never edit the same line:

- `ask-why`: every proof answers why, by record
- `asset-scene-admission`: admitting art into the game
- `civic-prose`: writing bank pieces in the owner's style
- `civic-reports`: reports and PR bodies for the owner
- `cto`: the CTO role
- `helper-checkout`: helpers work in sparse copies of the repository
- `lead-session`: running a lead line
- `look-first`: the search before building, fixing, filing or asking
- `merge-audit`: auditing merged PRs
- `merger`: merging and validating PRs
- `play-first`: one item of the play-first lane; the screenshot and browser check
- `people-pack`: drawing people from the pack, on mannequin plates
- `played-world-proof`: proving a feature in a played year
- `player-screen-text`: checking every string a player sees
- `pr-fixer`: finishing sent-back PRs
- `red-main`: taking a red on main from report to fix
- `researcher`: turning a stopgap into a sourced number
- `room-spots`: rooms and where people stand or sit in them
- `scene-producers`: a scene's cause wired to an engine's record
- `scene-standard`: the standard every scene meets
- `scenes-from-life`: new scenes from real lives
- `screen-to-mock`: screens follow the mocks and the shared controls
- `session-start`: the pool worker loop
- `skill-lessons`: the skills learn from each day
- `trace-audit`: the 56-place trace audit
- `wiring-audit`: auditing a family of mechanics end to end
- `words-engine`: the English engine and the director

## Implementation boundaries

- Simulation code is pure TypeScript, independent of DOM and external APIs.
- Unknown facts are not zero or permission. Read-only screens spend no game time and create no facts.
- Preserve asset originals, hashes and source-to-derivative lineage. No proprietary material from other games. Version numbers and patch notes belong to the release machinery.

## Workspaces and storage

On 2026-09-19 more than 100 GB of project copies filled the owner's Mac. Never copy the repository there.

- **Cloud sessions set the override themselves** (owner, Oct 15): a session in a cloud environment runs every npm command with `OCD_STORAGE_OVERRIDE="cloud session, owner approved Oct 14"` and never asks the owner to confirm it; the storage rules protect the owner's Mac, not cloud containers.
- On the Mac: reuse your registered workspace (`npm run storage -- workspace --owner <owner>`), run heavy commands through `npm run storage -- run <operation> -- <command>`, never use `npm ci`, `git clone`, `git worktree add` or `cp -R` to make another copy, check before deleting (`npm run storage -- check --path <folder>`), and send world runs, full suites and package builds to the cloud.
- Full rules: `.agents/rules/storage-and-workspaces.md`.
