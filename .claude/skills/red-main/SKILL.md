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
- Run world tests one process at a time. Eleven long vitest files in one call killed two workers (`Worker exited unexpectedly`, memory) and left those two without a verdict; run each long file alone, with a timeout longer than 30 minutes for the director's full-year tests (`circumstance.test.ts` outran 28 minutes), and say "no verdict" for one that times out rather than "passes".
- `pkill -f <pattern>` can kill your own shell when the pattern is in your command line; wait for a run to end with `until ! pgrep -f "runne[r]"` instead.
- Use `NODE_OPTIONS=--max-old-space-size=8192` for world runs; `tsc` over the whole project may run out of heap, so typecheck by running the changed tests.
- Stack of a thrown error: `vitest run` output cut to the lines starting with `❯`. When two writers collide on one key, record the stack of each scheduling in a temporary Map and print the first when the second arrives; remove it before the commit (Oct 29, `Duplicate institutional calendar key`: two review chains for one couple).
- Bisect with the failing test as the oracle when the cause is not in the stack: `git bisect` on the known good and bad merge commits, one run per step.
- A fix that fails somewhere new has found the next assumption, not a reason to stop: read what the new failure assumes. If three assumptions in a row each need an exception (Oct 29: a dead parent as a person broke household, place, tier and opening-income checks), the design is wrong; step back to the tier that never reaches those loops (a husk).

## 5. Ship

- Run the failing test before and after on the named place and seed, plus two fresh seeds, and the other tests of the changed module. For a change to the opening population run the golden-path suite (`node --import tsx tests/golden-path/runner.mjs`, about 20 minutes, in the background) and tell a runner timeout from a failed assertion.
- Add a release declaration in `docs/release/changes/` (`impact: none` needs a one-line reason body) and run `release:check --mode pr`, prettier, and `pool --check` for any pool item you add.
- PR body: the red as reported, the place and seed, the cause, before and after, what the fix does not cover, and the owner you told. A stale assertion is fixed in the test only when the code's rule is a recorded ruling; quote it.
- `npm run pool -- add` commits and pushes the item to main itself, so a branch has no file to commit afterward; check `git ls-tree origin/main docs/pool/items/` before looking for it.
- When a fix uncovers a different failure behind the first, ship the first, and file the second as a pool item with its numbers (search `docs/pool/items` for a twin first) or message its owner.

## 6. Keep the record

Every two hours write a block at the top of `## Red main` in `docs/coordination/LEADS-2026-10-24.md` (commit to main: `leads: red main status <time>`): each red, its cause, its PR, main's newest verdicts. A probe that fails is checked for a timing artifact before it becomes a bug (Oct 29: a check read the clerk's status before the clerk's morning run).
