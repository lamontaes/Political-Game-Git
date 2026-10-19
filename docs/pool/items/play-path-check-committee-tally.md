---
id: play-path-check-committee-tally
title: "path-check prints a bill killed in committee as failed (0-0): it counts only floor votes"
area: play
kind: bug
priority: 3
size: S
status: in-pr
claimed-by:
pr: #4944
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** The last line of `src/bench/path-check.ts` prints a bill's tally from the floor votes only (`after?.votes`), so a bill a committee killed prints as "failed (0–0)" and reads as if every member abstained (it misled the Oct 17 sweep; see the closed gov-bill-fails-when-every-member-abstains). Where the bill went to a committee, print the committee's yes and no and name that it died there (`committeeRecords(api, billId)` in `src/core2/modules/legislature.ts` has `yes`, `no` and `reported`). The seat view in `src/bench/legislature.ts` should carry the committee record too, so the play screen can show it.

**Rules.** An effect is a read, not a record: read the committee record where it exists. No hand-written player text: the line is a developer log. Replace, never layer: one tally line, not two.

**Done when.** The path-check line for a drawn place and seed where the committee kills the bill (seed sw6e30e80c) shows the committee's vote and "died in committee", and for a bill that reaches the floor shows the floor tally; a test beside src/bench/path-check-step-11.test.ts or in src/bench states both.

**Files.** src/bench/path-check.ts, src/bench/legislature.ts

**Notes.** Found while closing gov-bill-fails-when-every-member-abstains (Carolina, Puerto Rico, seed sw6e30e80c: the committee of 11 voted 2 to 9 against).

Sent back 2026-10-18 from PR #4944 (branch claude/path-check-committee-tally): Merging current main (d2f5eb170c) conflicts in docs/pool/items/play-path-check-committee-tally.md, docs/release/changes/play-path-check-committee-tally.md. Resolve these conflicts on this branch and push before local validation can run.; finish on that branch, merge main into it first.
