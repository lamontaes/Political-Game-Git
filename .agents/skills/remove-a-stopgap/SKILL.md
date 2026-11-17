---
name: remove-a-stopgap
description: >
  Replaces and unregisters a stopgap row: read the register and the code first,
  look for open PRs and existing engines to build on, add no new stopgap, and
  mark a row resolved only when the replacement is real and the marker is gone;
  also removing duplicate and dead code with no behavior change. Use when a job
  is to clear a stopgap, a PR says it resolves one, you read a resolved row, or
  you remove or merge duplicate code. Not for registering one (session-start) or
  sourcing a number (researcher).
---

# Remove a stopgap

A row lives in a family file under `src/core2/data/stopgaps/` (the director's in `src/director/data/stopgaps.json`) and a `stopgap("SG-...")` marker or `stopgapId:` comment in code. An unregistered id throws, and a release is refused while a row is open.

## Order of work

1. **Read what the row fakes** and the code at its marker. Check whether it still does (rows go stale).
2. **Look for something to build on** before writing anything: `look-first`, open PRs that touch the same files (`mcp__github__list_pull_requests`, the train branch), the engine that already owns the mechanic (AGENTS.md rule 0: every system is already built; wire through it).
3. **Build the replacement through that engine.** No new stopgap, no new tracking system. If something cannot be done, say what is missing in the PR; do not swap one stand-in for another.
4. **Unregister only when the replacement is real:** delete the marker and set the row `resolved` with the replacement named. Count what was removed in the PR body.
5. **Prove it in a played world** (`played-world-proof`): another engine reads the new record, named by id.

## Traps

- "Resolved" does not mean removed. About 378 rows were closed Nov 10 as "dropped: too in depth" while the estimate still runs, and 176 of them still have a live marker. Reading a resolved row, check the code.
- A stand-in row with no player effect and no data is dropped without asking. One a player can see stays until replaced.
- A design call about the player's own experience is an `owner-decision` row plus a decision card, never a wait.

- A "no record exists" stopgap is often cleared by one field on a record the engine already keeps, plus a rule that reads the records already there (Nov 15: a public work's finish day came from the award's payments and its winning crew, with one `lastPaidOn` field on the award and one TUNABLE labor-share row, no new table). Look for that before building a module.
- Probe two or three named places in a played year first (a test that appends to a file, since vitest hides console output) to see whether the new rule ever binds; say so in the PR when it rarely does.
- A before-and-after timing script that swaps `src` between two heads must copy its own test file in before both sides, must not use `git stash -u` (it hides your own edits), and should be started with `setsid nohup` and left alone: changing the session's working directory kills a plain background job.

## No new stopgaps (owner's rule, Nov 14)

This overrides any older note, item or skill line that says a builder may leave or register a new stopgap. Build the real thing through the engine that exists, or say in the PR what is missing and stop.

## Lessons from clearing SG-GOV-officer-stipend-hours (Nov 15)

- A row marked `resolved` or `dropped` can still have its marker in the code and a dropped pool item beside it: search the code for the id, delete row and marker together, and revive the dropped item with the cause in its Notes instead of filing a twin.
- A replacement that moves pay from a rate to hours must keep the job's `wageDailyMinor` as the week's pay over `daysPerWeek` (a calendar-day figure); other engines read it as the budget line's room, and a wrong figure makes the next post's line read zero and drops that post.
- A new constant in `parameters.json` needs a `role` (`coefficient`, `level`, `opening` or `law`) or `tests/guards/no-steering.test.ts` fails, and a TUNABLE row needs a spread; never invent a citation for a number the game chose.
- Prove it with a test at the named place that fails on the base: swap the base file in, see the red, swap back.

## Weights and the owner's source rule (S3, Nov 15)

A row that is a weight or a pull (corruption's offer, take and tell weights, SG-P15-corruption-weights) turns from TUNABLE to ESTIMATED only with real evidence on the row: `estimatedFrom` names what it was fitted or checked against (a figure and where it sits in the repository, the calibration test and what it asserts) and says in plain words what raises and what lowers the chance, and `spread` is `{ low, high, unit, citation }` with where the range came from. Owner, Nov 14: sources establish relationships and effects, never exact figures, so no file or figure is requested; but a row whose size nothing in the repository checks stays TUNABLE and keeps a narrowed stopgap row naming only it (the Account lead's rule on #9413). Delete a stopgap row only when no row names it; grep for the id (data, code, tests) before pushing.

## More in this folder

Read each file here when its moment comes:

- `references/slim-down.md`: for any removal of duplicate or dead code.
