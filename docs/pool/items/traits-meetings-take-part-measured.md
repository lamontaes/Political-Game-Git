---
id: traits-meetings-take-part-measured
title: "Who takes part at a meeting is measured by thirds of temperament and weighs it at the study's size"
area: people
kind: wiring
priority: 2
size: S
status: done
claimed-by: claude/traits-wire-civic-rest
pr: #6143
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-27T04:07:53.589Z
---

**What.** meetings.take-part scales a resident's drive to stand up at public comment or fill a town hall's room, so the audit reported only a size and could not count who took part by thirds of lean (gap row 'size, not a choice'). Report each resident weighed for a room as taking part or not, with and without temperament, and refit the weight in played years against Mondak et al. 2010's extraversion odds (2.97 between thirds).

**Rules.** No dice: the meeting's time takes the most driven, and temperament scales the drive. Play is unchanged apart from the weight.

**Done when.** Over at least ten places drawn from all 56 with seeds the builder did not choose, each played over its election window, every place's net odds of taking part between the thirds of lean are listed in the PR body, and the places with 100 or more different residents weighed have a geometric mean within a factor of 1.5 of 2.97; the meetings trait test reads the same outcomes from its window, pooled over two drawn towns, within half to double the study's log odds; and the meetings.take-part gap row is removed.

**Files.** src/core2/modules/meetings.ts, src/core2/modules/meetings.traits.test.ts, src/core2/trait-test-kit.ts, src/core2/data/parameters.json

**Notes.** Done-when revised Oct 27 by the laws-and-effects lead from 20 places drawn fresh on PR #6143's branch: no weight puts every single town within a factor of 1.5 of 2.97 (11 or more of the 20 miss it at any weight), because one town's own spread nearly fills the band, and the study's odds come from a national sample. The geometric mean over the 16 places with 100 or more residents weighed is 1.077 log odds at a weight of 0.26, against the study's 1.088. The town-to-town spread is `traits-meetings-take-part-spread-across-towns`.

Sent back 2026-10-26 from PR #6143 (branch claude/traits-wire-civic-rest): Main integration conflicts in trait-decision-gaps.json, trait-effect-sizes.json, trait-calibrate.ts, trait-wiring-matrix.ts, modules/press.ts, trait-pairs.ts add/add and american-english.test.ts; resolve code/data on this branch before review. Merge aborted, no own runtime pass claimed.; finish on that branch, merge main into it first.

Sent back 2026-10-27 from PR #6143 (branch claude/traits-wire-civic-rest): Main conflicts repaired; own isolated inherited parties.traits test FAIL on GOLDEN_PATH_SEED m3-tr1, Embden ND3824020: 35 joiners mean0.312404 vs5 nonjoiners mean0.443042, assertion151. Parent5657 still open with same failure; repair parent then merge here, preserving positive drawn-world comparison and rerun meeting proof. Own run102.26s one pass one fail, no complete gate claimed; finish on that branch, merge main into it first. PR #6143 merged at 05:28, with the 0.32 weight and a one-town test, before this done-when was revised; the refit and the pooled test are `traits-meetings-take-part-refit-pooled`.
