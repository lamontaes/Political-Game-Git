# Pool reconcile and the fill-in crash family (CTO, Oct 16, evening)

For any cloud session with `npm run pool` (the Codex merger or the next builder). Set `OCD_STORAGE_OVERRIDE="cloud session, owner approved Oct 14"` on every npm command. One PR per order; the CTO merges; never merge your own.

## Order 1: pool reconcile (do this first)

Claim it as pool item `pool-reconcile-merged-2026-10-16`. Create the item with `npm run pool -- add`: area docs, kind cleanup, priority 1, size S. P1 fields have length rules, so fill them in full:

- **What** (at least 3 sentences, 40 words): About 54 items in `docs/pool/items/` still read open, claimed or in-pr while the PR they name has merged. The merger's done step did not land for them. A builder reading the index today would redo finished work, and blocked items whose blocker is already merged sit frozen behind it.
- **Rules** (a standing rule, at least 6 words): "The pool is the only backlog: an item that stays open after its PR merged makes a builder redo finished work."
- **Done when** (at least 25 words): "`npm run pool -- --check` passes on main; no item with status open, claimed or in-pr names a PR that is merged; no item is blocked-on an item that is done; the index's Next up names no merged PR."
- **Files:** `docs/pool/items/`.

Steps:

1. For every item file whose `pr:` is a merged PR (`gh api repos/lamontaes/Political-Game-Git/pulls/N` and read `merged: true`), set it done: `npm run pool -- status <id> done --pr N --by cto`. As of 19:00Z that is about 54 items. It includes the top of Next up (gov-empty-seat-filled-by-press-staff #4663, gov-outside-revenue-fees-wiring #4629, world-census-weight-headcount #4603, director-appointment-scene-appointer #4738) and the P1 crash items #4725, #4739 and #4730.
2. For every blocked item whose blocked-on is now done (core-census-uncap-opening, core-town-size-census, gov-outside-revenue-fees, core-moves-pinned-and-income-stopgaps and the rest you find), set it open.
3. Regenerate the index with `npm run pool` and confirm `npm run pool -- --check` passes.
4. Find why the done step lagged. Read PR #4782 (merger ready endpoint 404) and PR #4750. If the merger's `done` call is what fails, say so in this item's Notes, in plain words, with the line that fails.

Set `owner-stress-mood-scale` done: the ruling of Oct 16 and the item `people-stress-baseline-per-person` answer it.

## Order 2: one owner for the crash family

Five items are one root cause chased in pieces; eight PRs were closed "does not reproduce" today. The items: core-year-crash-press-staff-absent-person (#4781), core-fill-in-returning-household-absent-member (#4762), core-year-crash-press-fill-in-job-held (#4768), jobs-layoff-counted-staff-fillin (#4767) and jobs-demoted-hire-crash (#4754).

Create pool item `core-fill-in-crash-family`: area core, kind bug, priority 1, size M, same P1 length rules.

- **What:** A press staffer filled in from the counts can be hired, laid off, or returned to the counts in ways that leave the counts short or name a person who is absent. Each item above hit one face of it. The fix lives in the fill-in / return-to-counts seam, not in any one caller.
- **Rules:** "One model, two tiers: a counted person filled in is a consistent member of their group, and returning them to the counts must leave the counts whole."
- **Done when:** "a played year in a drawn place with every module installed (`buildBenchWorld`, a seed the builder did not choose) runs through a press staffer's hire, layoff and return to the counts without 'Absent person' or a relocation while filled in, named by record id; the three tests from the merged items pass together."
- **Files:** the fill-in and return-to-counts code in `src/core2/`, and the tests the merged items added.

Set the four existing open items to `blocked-on: core-fill-in-crash-family`. Whoever claims the family item reads the five PRs first, then fixes the root in the seam. One PR, not five.

## Order 3: the gate

Order 3, merge order (owner, Oct 16): first PR #4796 (the release gate finishes again), then PR #4782 (the merger's ready call), then PR #4459 (Words: scenes with a purpose, engine part one) ahead of every smaller PR: #4626 (batch 15) and the in-play item wait behind it, and it gains conflicts every hour it sits. Its author has merged main in twice and resolved the send-back; recheck at its current head, merge main in once more if needed, run the changed-file checks, and merge on green. Two director tests fail on it as they fail on main (#4593, #4589); that does not block. Then the rest, small first.

Written by the acting CTO; merged through a helper PR (#4800).
