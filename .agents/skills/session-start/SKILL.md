---
name: session-start
description: >
  Runs the pool worker loop for Our Civic Duty: opening checks, claiming the
  next pool item, building it to its done-when, checking the work against the
  merger's list before the PR, opening a ready PR and taking the next. Use
  first in every building session, cloud or local, Claude, Codex or any other
  agent.
---

# Session start: the pool worker loop

**Look first (`look-first`, owner Oct 27):** before building, fixing, filing or asking anything, run the look-first search (OWNER-DECISIONS, DECISION-REGISTER, prior-rulings, LAW, the sitting blocks, docs, the pool, Drive); a found ruling is built and cited, never asked again; a question without the reading line is sent back.

**SMART and look first (owner, Oct 26; `.agents/rules/smart-and-look-first.md`).** An item without a time box and a measurable done-when goes back to its writer, not built. Before any owner question or `owner-decision` stopgap, read `OWNER-DECISIONS.md` whole, `DECISION-REGISTER.md`, `docs/coordination/prior-rulings/` for your area, `docs/play-first/LAW.md`, and search `docs/` for the subject; end the question with the reading line. Research first is allowed and expected. Every stopgap you register has its id as a marker in the code it fakes.

Current as of 2026-10-24, 21:30 UTC (owner, Oct 24: play first; the lane owns `src/bench`; "simulate it, don't ask"; "sessions never message each other")

Copy this checklist and keep it current:

```
- [ ] Open: AGENTS.md, pool item, the channel's CTO section, rulings (LAW.md for play-first items), install, golden path
- [ ] Red main? claim release-main-red first
- [ ] Claim the top of Next up (or a sent-back item: use pr-fixer)
- [ ] Copy the item's done-when lines into a scratch list
- [ ] Build to the done-when, proven in a played world
- [ ] Self-check: every done-when line has evidence; break-it test; merge main
- [ ] Local gate on changed files
- [ ] Ready PR from the template, done-when table filled; item set in-pr
- [ ] Next item
```

## Open

1. Read `AGENTS.md`, `docs/pool/README.md`, the item file and its Notes, then the CTO section of the channel `docs/coordination/LEADS-2026-10-24.md` (`.agents/rules/how-we-talk.md`), then the newest rulings at the top of `docs/coordination/OWNER-DECISIONS.md`. An item with `milestone: play-first` or `lead: play-first` is the lane's: follow `play-first`, whose law is `docs/play-first/LAW.md`.
2. In a cloud environment, set `OCD_STORAGE_OVERRIDE="cloud session, owner approved Oct 14"` in every shell. Install with `npm install` (in a cloud container, `npm ci` is fine too). On the owner's Mac, follow "Workspaces and storage" in `AGENTS.md`.
3. Run `node --import tsx tests/golden-path/runner.mjs` before changing anything.
4. Read the latest release run on main: `gh api 'repos/lamontaes/Political-Game-Git/actions/workflows/release.yml/runs?branch=main&per_page=1'`. If its conclusion is `failure`, claim `release-main-red` and fix it at the root on its own PR first.

## Claim and build

1. Take the top of "Next up" in `docs/pool/INDEX.md`, or your own area's top item. Claim it: `npm run pool -- claim <id> --branch <branch>`. If it's already claimed, take the next. A claim older than 60 minutes with no pushed branch and no PR may be released and taken. Say so in the item's Notes.
2. An item whose Notes say "Sent back … (branch X)" is a fix, not a build: follow `pr-fixer`.
3. An L item: split it into S or M items with their own done-when before building, and mark the L item `blocked-on` them.
4. Copy every line of the item's **Done when** into a scratch list before writing code. Each line is a thing you will show, not a thing you will describe. Read every function, export and field you plan to use on current `origin/main` first; names change daily, and code written from memory of an older main is the most common unverified assumption.
5. Branch from `origin/main` and build to the done-when. Prove it in a played world (`played-world-proof`), in a place drawn from all 56, naming place, seed and record ids.
6. Register every shortcut as a stopgap. **Simulate it, don't ask** (owner, Oct 24): a mechanic real life has that the simulation needs is built from research in the background, calibrated not hardcoded; only a design call about the player's own experience is an owner question. For that, register an `owner-decision` stopgap and ask under **OWNER DECISIONS NEEDED**. Add a pool item for anything you find that isn't yours, with `lead:` set to the role that owns it, after searching for an existing one first (`grep -ril "<key words>" docs/pool/items`; add your evidence to a match's Notes instead of a twin); a `src/bench` change is the play-first lane's.

## Self-check before the PR

Mergers send back most PRs for the same few reasons, and every model makes them, Claude included: a done-when line with no proof, a test that passes without checking anything, a release note that says less than the change does, and a conflict with main. Check your own work against that list now. The merger runs the same list (merger skill, "Morning check").

1. **Every done-when line has evidence.** Next to each line on your scratch list, write the evidence: the test name, the command and its result, the place and full seed, and the record ids. If the item says one year, the run advances 365 days, not 120 or 200. If it says a drawn place, the place comes from `drawPlace` over all 56, and a pinned seed may sit beside it only as a named repro. If it names two further places, there are two. A line you cannot fill means the item is not done; go to step 6.
2. **Break it, then watch the test fail.** For each new or changed test, undo the key line of your change (or return early from the new code) and run the test. It must fail. Restore the change and run it again; it must pass. A test that passes both ways checks nothing. Assert the witnessed case exists (`expect(checked.length).toBeGreaterThan(0)`), and draw again with bounded retries until it does. These patterns pass on an empty world:
   - every assertion inside `if (found)` or `if (x.length)`;
   - `>= 0`, or a loop over a set that can be empty;
   - a `continue` that can skip every case;
   - a fixture you built by hand standing in for the generated world.
   - **A row you marked Not done or Not shown is not a finished PR.** Before opening it, run the row (screen drawn places first for one where the count is above zero, then name the place, seed and record id), or amend the item's Done-when to the slice you built and file a bounded item for the rest. A fixture is not the played chain, and a row whose evidence the body itself contradicts ("reach 0") fails the same way (Oct 27: #6216, #6326 and #6331, each sent back for one such row).
   - **A test that needs a witness world finds one by drawing, and says what it passed over.** Pinning one place and seed breaks when main changes the world (the household of minors alone vanished), and drawing one place breaks when that place lacks the case (a filing with no campaign event). Run the new test on 10 fresh draws before the PR: draw places, in a bounded loop, until one holds the case, name the places passed over, throw if none does, and keep a pinned place only as a named regression beside it (Oct 27: #6139 and #6322 sent back for it).
   - **A published number a new table adds opens differently in every world.** The guard `src/core2/realistic-not-real.test.ts` draws fresh worlds and fails when two open on the same value (a wage, a HUD rent), so a table that copies one published number passes in your draw and turns main red in someone else's. Run it on 10 fresh draws before the PR, give each statistic its per-world spread and source (`estimate-not-unknown`), and merge main first, since its known copies and `parameters.json` and `stopgaps.json` rows change under every PR (Oct 28: main's guards job red at 10:21, 10:49 and 11:06 UTC on three different statistics; #6597, #6598, #6599 and #6600 each conflicted in it).
3. **Never weaken a test to get green.** No skips, early returns, narrowed ranges, raised timeouts without a measured reason, or exemptions for the cases that fail. If an existing test fails, find out why.
4. **Claims match the diff.**
   - **The release declaration:** if any engine reads what you changed (a price, a payment, a choice, a count), the impact is `patch` or `minor`, not `none`. "No screen shows it" doesn't make it `none`.
   - **Check one fact:** at least one count, date or list in the title, body or release note against the data.
   - **Research values:** reopen the page. The quote must contain the number, and the URL must be the page you read. For an election, record the deciding round, which may be a runoff, not the first round.
5. **Rules the merger checks:**
   - Don't touch guard allowlists or skip lists to clear a red check.
   - A bank part carries no play flag of its own; it plays unless the owner's grades in the ledger reject it (owner, Oct 24); only the Words session and the play-first lane (with `Review: words`) edit `data/english/`, `src/english/` or `src/director/`; only the lane edits `src/bench`.
   - No state, city or GEOID in logic.
   - No record that nothing reads.
6. **If a line can't be met,** don't open the PR as done. Either keep building, or file what blocks you as its own pool item, set your item `blocked-on` it with one Notes line, and open the PR only for what it really finishes, under a separate item whose done-when matches.
7. **Merge main last.** Run `git merge origin/main` (plain merge), resolve conflicts keeping both sides' behavior, and rerun the checks on the merged result. Conflicts with main are the second most common send-back.

## Open the PR

1. Run the local gate on changed files (`local-gate`; `npm run agent:test-cadence` lists the commands).
2. Add a release declaration: `npm run release:declare -- <id>`. An `impact: none` file holds only `id` and `impact`. `patch` or `minor` also needs `section` and `title`.
3. Push with plain `git push -u origin <branch>`. Open the PR **ready for review** against main, following `.github/PULL_REQUEST_TEMPLATE.md`. Line 1 is exactly `Pool item: <id>`, with no backticks; the merge flips that item to done automatically. Fill the **Done when** table from your scratch list: one row per line of the item's done-when, each with its evidence.
   **For every new or changed test file, the gate line also says `fresh draws: N of 10 passed` with the seeds you ran, and the test's file name.** Nobody writes it, so the test that fails on a fresh draw reaches the merger (Oct 28: #6653, #6660 and #6664 each sent back for a new test that failed on fresh seeds, after the lessons in item 2 had landed; a line in the body is checkable where a line in the middle of the loop was not).
4. `npm run pool -- status <id> in-pr --pr <N>`. Never edit an item's status inside your feature PR.
5. Take the next item. When a merger sends your PR back, fix it before starting anything new.

## Rules

- Never force-push, rebase or amend a pushed branch. A merged PR carries no new work; open a new branch.
- Workers don't message other sessions or start schedules: the PR body and the item's Notes are a worker's voice; leads and the CTO talk through the three files in `.agents/rules/how-we-talk.md`. Lead sessions may run their own helpers (`AGENTS.md`, "Helpers").
- Treat a permission prompt as denied. Don't retry it; work around it or note it in the PR body.
- Out of usage or stopping: push what you have, set the item back to `open` with one Notes line saying where you stopped, and stop.

## The prompt

> Read AGENTS.md and .agents/skills/session-start/SKILL.md in lamontaes/Political-Game-Git. You are a pool worker. Run the loop in that skill: the opening checks, then claim the top open item of docs/pool/INDEX.md for your area with `node --import tsx scripts/pool/index.ts claim <id> --branch <area>/<short-name>`, build it to its Done when, run the self-check, open a ready PR with the item id on line 1, and take the next.
> Never force-push, rebase or amend a pushed branch; never merge your own PR; never dev mode to get past something. Out of usage: push what you have, set the item back to open with one Notes line, and stop.
> In a cloud environment, set OCD_STORAGE_OVERRIDE="cloud session, owner approved Oct 14" on every npm command and never ask the owner to confirm it.
