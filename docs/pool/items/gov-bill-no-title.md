---
id: gov-bill-no-title
title: "A passed local bill with no title (Pine Ridge, South Carolina, 2027-2)"
area: gov
kind: bug
priority: 1
status: done
claimed-by: claude/gov-bill-no-title
pr: #4492
blocked-on: "gov-record-defects-finish"
milestone:
after: gov-record-defects-finish
source: "batch 11 record defects"
claimed-at: 2026-10-15T22:29:39.995Z
---

**What.** A local bill passed with no title and no provisions on record: Pine Ridge, South Carolina, bill 2027-2 in batch 11 (seed in docs/grading/words-batch-11.md, which is on the batch-11 branch, not on main as of 2026-10-15), and Westerly, Rhode Island, bill 2027-3 in an earlier batch. `billTitle(bill)` in `legislature.ts` builds a title from the bill's `provisions`, so a bill with an empty list has nothing for the English engine to word, and the player sees a law that cannot be named in Law here, the news or the journal. Introduction must refuse a bill with no provision (recording the refusal and its reason) and every introduced bill must carry a designation and at least one subject. The player would notice that every law in the town has a name and says what it does.

**Rules.** One rule, all 56 places: the introduction check reads the body's bill form from data, so no place or body type is named in code; An effect is a read, not a record: the check is a read the legislature makes when a member or the player introduces a bill, and a refused bill leaves a recorded reason another engine can read; Ask why: a refused or amended bill keeps the record of who tried and why it was refused; No hand-written player text: the title is worded by the English engine from the `billTitle` parts; no placeholder such as 'Untitled' is written by hand; Wire to the world: it applies to every body that introduces bills (council, county, state, Congress), not only the town board.

**Done when.** Verification once #4343 (carried by gov-record-defects-finish) has merged. In a one-year run of the played world (`buildBenchWorld`, every module installed) in a place drawn from all 56 with a seed the builder did not choose (name both in the PR body), with world legislating on: list every row of the bills table at the end of the year; each has a non-empty `provisions` list and a `billTitle` with at least one subject, and replaying the Pine Ridge seed from the batch-11 page introduces no nameless bill. Add the assertion to `src/core2/legislature.test.ts`. The owner plays it: opens Law here after the council passes an ordinance and every law has a name.

**Files.** src/core2/modules/legislature.ts, src/core2/legislature-bill-form.ts, src/core2/legislature.test.ts

**Notes.** Seed in docs/grading/words-batch-11.md.
