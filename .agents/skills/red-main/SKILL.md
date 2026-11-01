---
name: red-main
description: >
  How to take a red on Our Civic Duty's main from report to fix: read the
  newest run of every workflow, name the failing test with its drawn place and
  seed, find which engine and session owns it, reproduce it locally, bisect or
  trace to the root, and ship one fix per branch. Use for the standing
  red-main owner, for any session handed a red by another session, and for a
  test that fails by seed. Not for a PR a merger sent back (pr-fixer).
---

# Red main

Red main comes first (owner, Oct 15). One red, one branch, one ready PR whose line 1 is `Touches pool item: release-main-red-standing`. Fix at the root; never skip, disable, quarantine or allowlist a test, and never widen a bound without saying why in the PR body.

## 1. Read the verdicts first

Read the newest run of Release, Deterministic validation, M0 guards and Every place nightly on main (GitHub MCP `actions_list`, branch main, event schedule). A push run on main is canceled by the next push, so the scheduled runs are the verdicts. A report that is "red on main" may already be green: check the newest run before building (Oct 29: two reds on the list were fixed by earlier merges).

## 2. Name the red by test, place and seed

A red is not named until you have the failing test, the drawn place, the seed and the exact assertion. A failure that flips by seed is a defect (one rule, all 56 places): find the seed-dependent branch, not a lucky seed. Pass the seed with `GOLDEN_PATH_SEED=<seed>` (and `GOLDEN_PATH_PLACE_KEY` where the test reads it). A test's printed seed may be the place seed, not the run seed (mark-gap prints `place.seed`): reproduce from it directly (`buildBenchWorld(<place seed>, ...)` or `/api/build?seed=<place seed>`), because passing it as `GOLDEN_PATH_SEED` draws another place and passes (Oct 29, Port Vincent, Louisiana). Golden-path specs run through `src/bench/m0-check.ts` or `npx vitest run <files>`; the command is in `docs/roadmap/features.json`.

## 3. Find the owner, then message before touching

`docs/coordination/CREW.md` lists the running sessions and their areas. A red in an engine a running session owns goes to that session with the test, place and seed before you touch it; after an hour of silence it is yours. Elections, history, offices and the nightly have no running owner. Questions for the owner go to the CTO.

## 4. Reproduce, then go to the cause

- Reproduce on clean main first. If it does not reproduce, say so with the seeds you tried; do not fix a guess.
- Clean main means main's head fetched just now, not the commit the red was reported on. Before fixing, search merged PRs and the engine owner's channel block for the test's name: the owner may already have fixed it. On Nov 1 a fix for `scene.test.ts` at birth-n1 and bb-fresh was built on the test from before Words' merged fix (#6989), so merging it would have undone that fix (#7027, closed).
- Run world tests one process at a time. Eleven long vitest files in one call killed two workers (`Worker exited unexpectedly`, memory) and left those two without a verdict; run each long file alone, with a timeout longer than 30 minutes for the director's full-year tests (`circumstance.test.ts` outran 28 minutes), and say "no verdict" for one that times out rather than "passes".
- `pkill -f <pattern>` can kill your own shell when the pattern is in your command line; wait for a run to end with `until ! pgrep -f "runne[r]"` instead.
- Use `NODE_OPTIONS=--max-old-space-size=8192` for world runs; `tsc` over the whole project may run out of heap, so typecheck by running the changed tests.
- Stack of a thrown error: `vitest run` output cut to the lines starting with `❯`. When two writers collide on one key, record the stack of each scheduling in a temporary Map and print the first when the second arrives; remove it before the commit (Oct 29, `Duplicate institutional calendar key`: two review chains for one couple).
- Call the failing step directly before reading the engine: in the empty-talk red (Oct 30) the greeting worded fine when called alone, which pointed past the wording to the owner's rule that clears a talk with nothing on record.
- When a test's premise changed with a ruling (the six-offices rule moved the player's first race to the next even year), fix the premise and quote the ruling; when the ruling exposed a gap the test is right about (no beat for a year after an early filing), leave it red and message the owner of the gap.
- A test red on one seed, with two values a hair apart, often reads one side after the act and the other before it. Find which value each side reads, and when. On Nov 1 `campaigns.test.ts` recomputed a volunteer's shift share after the walk, when a retelling had already warmed them. The engine had weighed them before the walk, so the test was wrong and the tolerance stayed at 9 decimals.
- A test that expects every record to become a scene must allow for the director's own reasons for keeping one off the stage: the season cap (`seasonCap`) and an evening's sitting that took the ask in. It names the reason, takes the next case, and still fails on an unexplained miss (Nov 1, `ask-before-the-roll.test.ts` in Springfield, Oregon).
- Bisect with the failing test as the oracle when the cause is not in the stack: `git bisect` on the known good and bad merge commits, one run per step.
- A fix that fails somewhere new has found the next assumption, not a reason to stop: read what the new failure assumes. If three assumptions in a row each need an exception (Oct 29: a dead parent as a person broke household, place, tier and opening-income checks), the design is wrong; step back to the tier that never reaches those loops (a husk).
- Read the assertion before the report. A message quoting "748 people, 0 beds" was the passing print of another test in the same file (Nov 1, housing): the real failure was a fixture that failed every time. First ask whether the red is by draw or fixed: a fixed-seed fixture that fails every time means a rule or data under it changed (since Oct 28 a world's shelter rate is the published rate times a per-seed offset), so size the fixture from the rate the world reads.
- A decision that looks wrong may be the engine's own rule. Read the recorded position's terms before calling it a fault (Nov 1, committee markup: a member who traded for a section voted no because `consistency` was -1 from three questions they had just voted the other way on). Fix the test's premise and quote the rule, or ask the owner for a design change; do not bend the engine to a test's guess.
- A test that needs a rare premise (a worker who loses a counted job, a place with a shelter bed, a household with someone left at home) must draw among places where the premise holds, or redraw and say why (words-engine, test-pick lesson). Check how many drawn places hold it before touching an engine. In the speech red (Nov 1) the first sixty adults filled whole households, so nobody was left at home to retell it: the engine was right.
- Prove a suspect merge is not the cause by running the same seed on main before it and after it (Merger 1 cleared #6935 this way, Nov 1). If both fail the same way, the cause is older: do not send it to the suspect's author.
- Read what the nightly's check reads, not only the symptom. The Seats check reads each seat's roster, so a refill that seats the new holder on a fresh seat leaves the dead one's seat empty (PR #6972 needed a second push for this). `all-places --world-seeds <s>` draws its own place; to reproduce the nightly's places use `--only <states> --seed <the run's seed>`.
- Before changing an engine for a calibration red, measure the candidate over every state's data and over a sweep of draws, on main and on the branch (mean and largest error against the source); ship only if the mean does not get worse. Centering turnout on the voter's own state fixed Mississippi and broke a Minnesota draw (Nov 1): the same fix was wrong alone and right beside the state-habit term it needed.

## 5. Ship

- Run the failing test before and after on the named place and seed, plus two fresh seeds, and the other tests of the changed module. For a change to the opening population run the golden-path suite (`node --import tsx tests/golden-path/runner.mjs`, about 20 minutes, in the background) and tell a runner timeout from a failed assertion.
- Add a release declaration in `docs/release/changes/` (`impact: none` needs a one-line reason body) and run `release:check --mode pr`, prettier, and `pool --check` for any pool item you add.
- PR body: the red as reported, the place and seed, the cause, before and after, what the fix does not cover, and the owner you told. A stale assertion is fixed in the test only when the code's rule is a recorded ruling; quote it.
- `npm run pool -- add` commits and pushes the item to main itself, so a branch has no file to commit afterward; check `git ls-tree origin/main docs/pool/items/` before looking for it.
- When a fix uncovers a different failure behind the first, ship the first, and file the second as a pool item with its numbers (search `docs/pool/items` for a twin first) or message its owner.
- A before number from main's files: put them in the tree and restore your branch's in the same command (`cp`/`git checkout origin/main -- <files>; run; git checkout HEAD -- <files>`), never commit in between, and run `git status` after. A probe copy of a test goes in `.git/info/exclude` and is deleted before the commit; build its injected lines with a script, not a heredoc with newlines inside a JavaScript string (a split string killed a 5-minute probe).
- A verdict run with `timeout N` that expires prints "Terminated" and gives no verdict: run it in the background and wait with an `until ! pgrep -f "runne[r]"` monitor (see `heavy-runs`). Never `git worktree add` a full checkout (2.2 GB, helper-checkout); edit skill and docs files on a branch of the main checkout when no run is using it.

## 6. Keep the record

Every two hours write a block at the top of `## Red main` in `docs/coordination/LEADS-2026-10-24.md` (commit to main: `leads: red main status <time>`): each red, its cause, its PR, main's newest verdicts. A probe that fails is checked for a timing artifact before it becomes a bug (Oct 29: a check read the clerk's status before the clerk's morning run).
