---
id: traits-meetings-take-part-refit-pooled
title: "The take-part weight on main (0.32) runs high in random towns: refit it on twenty drawn towns and pool two in the meetings test"
area: people
lead: laws-effects
kind: bug
priority: 1
size: S
status: done
claimed-by: claude/traits-meetings-take-part-refit
pr: #6254
blocked-on:
source: laws-and-effects lead, Oct 27 (follow-up to PR #6143, merged at 05:28 with the five-town weight)
claimed-at: 2026-10-27T06:53:24.180Z
---

**What.** PR #6143 merged with `traitWeightMeetingsTakePart` at 0.32, fitted on five towns, and a meetings trait test that holds one drawn town to half to double the study's 1.088 log odds. Over 20 towns drawn fresh through the test's own draw, 0.32 runs 0.31 to 2.52 and four towns fall outside the band, among them CI's Wyoming, Rhode Island at 2.320, so the test on main fails in about one random town in five. At 0.26 the 16 towns with 100 or more different residents weighed have a geometric mean of 1.077, and no single weight keeps every town inside the band, because one town's own spread nearly fills it.

**Rules.** No dice: the meeting's time takes the most driven and temperament scales the drive; nothing here rolls. Research before building: the weight is ESTIMATED from Mondak et al. 2010 and the twenty places, never decided by one town. Never weaken a test: the band stays half to double, and a flat weight still fails.

**Done when.** Over at least ten places drawn from all 56 with seeds the builder did not choose, every place's net odds of taking part are listed in the PR body and the places with 100 or more different residents weighed have a geometric mean within a factor of 1.5 of 2.97; the meetings trait test pools two drawn towns of 100 or more different residents and passes on CI's Wyoming seed and two fresh seeds, named with their places; and with the weight at 0 the test fails.

**Time box.** 1 hour, the laws-and-effects lead (the work is done on the follow-up branch).

**Files.** src/core2/data/parameters.json, src/core2/modules/meetings.traits.test.ts

**Notes.** Filed by the laws-and-effects lead, Oct 27. The measurements were made by the lead's helper on PR #6143's branch before it merged; the commits are carried to a fresh branch from main.
