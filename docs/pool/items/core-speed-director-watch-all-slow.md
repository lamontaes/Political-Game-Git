---
id: core-speed-director-watch-all-slow
title: "With every person watched, the director runs about 100 times slower than before"
area: core
kind: bug
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** src/director/stories-from-engines.test.ts times out at its 30-minute limit on main (Coventry, Vermont, seed 0fc1c044eef41a1c22a597a9d1846533367bca84). With all 1,720 people watched, the first 30 days took about 8 seconds on #5336's branch before it merged main (about 50 seconds for a year) and 834 seconds on plain origin/main with the same script. Something main added since makes watching everyone scan far more per day.

**Rules.** Speed: a town's game year must run in under two minutes, and no change may make a year more than 20 percent slower than its base; never scan the whole world or history every day; use indexes or act on the day something changed. Measure one process at a time on the same machine.

**Done when.** On main, the Coventry, Vermont seed above runs its first 30 days with every person watched in under 15 seconds, measured before and after on the same machine; the slow function is named by profile in the PR body; stories-from-engines.test.ts passes within its limit.

**Files.** src/director/, src/core2/

**Notes.** TODO

Oct 21 (claude, PR #5808, partial): measured with the harness of stories-from-engines.test.ts (`drawPlace(seed 0fc1c044eef41a1c22a597a9d1846533367bca84, "stories-from-engines")`: Coventry, Vermont, place 5016075, world seed 8eb40fcbb6caf9682c867b888f418cc06e2a0ab8731d669ae6f3b13c0e3f5a1e, two-level, 1,720 non-husk people watched), the first 30 days took 1,244,657 ms on main and about 29,400 ms after the change (five-day slices: 2.2, 5.7, 2.9, 6.7, 3.2, 8.7 s). The cause was in `src/director/ledger.ts`: a broad event gives a moment over a hundred counterparts, and for each stored moment the director recomputed every counterpart's importance (12.5 million `importanceOf` calls in one five-day slice, each scanning all of a person's moments). Left: under 15 s. The profile after the change is flat: `onEvent` 5.1 s (broad events visit every watched book), garbage collector 4.9 s, `measureDay` 3.2 s, `onAfterDay` 1.2 s. A shortcut that visits only the people a narrow event names or tells (books kept in opening order) gave no measurable gain (31.8 s) and was not kept. The next cut is likely in how a broad event reaches a place's people (an index of watched people by place and household instead of a scan per event) and in what `measureDay` does for people with nothing new today.
