---
id: director-moments-for-a-new-adult
title: "An 18-year-old played for eight months gets director moments"
area: director
kind: bug
priority: 3
status: open
claimed-by:
pr: #5644
blocked-on:
after: director-civic-producers-government
milestone:
source: 'docs/coordination/play.md "Needs from other sessions" (line 147); triage in play-needs-play-147'
claimed-at:
---

**What.** A play-test of an 18-year-old from October 12, 2026 got no director moments in eight months in a two-level town, and none in five months in a normal one. So no big moment ever stops a skip and the staged scenes never play. Find out whether the director measures only people in households, jobs or offices, or something on the merged stack is not reaching a new adult at home. Recheck on main first, since several producers have landed since.

**Rules.** Wire to the world: a moment comes from a record another engine wrote, by id. No dice: the director picks by what the records say. No hand-written player text. Speed: no daily whole-world scan.

**Done when.** In the played world (buildBenchWorld, every module installed) in a place drawn from all 56 with a seed the builder did not choose (name both in the PR body), the bench player of a new adult skips eight months and meets at least one director moment, with the record id that produced it named, and a test in src/director checks that a skip stops on it. The owner plays it: skips and is stopped by a scene.

**Files.** src/director/, src/bench/player.ts

**Notes.** Found while triaging play-needs-play-147.

Rechecked Oct 16 on main (claude/moments-new-adult), not changed. Six places drawn from seeds z1 to z6 (`buildBenchWorld`, two-level, the controlled 18- or 19-year-old, director in skipping mode, 245 days, the household watched as the bench watches it): moments that stop a skip (`stopsSkip` true) in Gildford Colony, Montana 13; Denver, North Carolina 21; Walhalla, North Dakota 166; Yigo, Guam 120; Cedar Grove Colony, South Dakota 31; Franklin, Virginia none (13 moments, all journal lines). The first stops are named by cause id, for example `cause.shared:2026-10-29:person_e3addf1b269f7737:person_e3ade11b269f7a9d:cause:us-policy-positions:justice-public-safety.civilian-oversight-of-police` in Gildford Colony. So "no moments" no longer reproduces. What remains: almost every stop is a moment with no scene type bound to it (outcome `journal-line` with `stopsSkip` true, since `scheduleMoment` in scheduling.ts sets `interrupt` from impact alone, not from having a binding), and only 1 of the 6 places staged a scene in the eight months (`scene-now` in Cedar Grove Colony). A stopped skip with no scene to play is the player's complaint now. Two fixes, the second the owner's: (1) make `interrupt` require a bound scene type, so skips stop only on scenes, or (2) keep stopping and bind a scene type for the labels that stop (`cause.shared` and `speech.heard` account for nearly all of them); the producers in director-civic-producers-* and words-scene-* are the second route. Scene counts for a year at the same seeds: Ennis, Montana 4 scenes (18 moments), Nason, Illinois 0 (2), Lynn Haven, Florida 9 (105), Lonepine, Montana 1 (5), Elverson, Pennsylvania 0 (1).

Checked Oct 16 (claude/director-moments-for-a-new-adult): "no moments" does not reproduce, so the bug as titled is gone. Route (1) above is not available: `src/director/director.test.ts` ("lets a death take over the screen, stop a skip, and log a moment no type stages") records the owner's rule that a big moment with no scene type still stops a skip, so requiring a bound scene would break a ruled behavior. Only route (2) is left, which is binding scene types to `cause.shared` and `speech.heard`, owned by the producers items. The item waits on them (`blocked-on`) and should be dropped by the CTO once those land and a played skip meets a scene.

Oct 20: The Oct 16 claim has no PR and is over two days old, so the claim is cleared.

Oct 20: Switched from blocked to the automatic after: gate on director-civic-producers-government, so it opens by itself the moment those items are done.

Sent back 2026-10-20 from PR #5644 (branch claude/political-game-pool-yucp92-ak): the new test redraws past places where the director never stops the skip (Point of Rocks, Wyoming), so it passes while the bug reproduces, and the moment's trace is not asserted to resolve; the test also sits under src/director, which only the Words session edits; finish on that branch, merge main into it first.

Sent back 2026-10-20 from PR #5644 (branch claude/political-game-pool-yucp92-ak): The unsafe test and Words-area edits are removed, which addresses the previous review. The remaining diff is a finding only: docs/pool/items/director-moments-for-a-new-adult.md explicitly says the Point of Rocks bug and unresolved trace remain. Its done-when still requires the director moments and trace to work in play. Merging this PR under that item would automatically mark unfinished work done. Keep that item open; either finish its named proof or track this completed finding-only delivery under a separate pool item and update the PR title/body to its actual docs-only scope.; finish on that branch, merge main into it first.
