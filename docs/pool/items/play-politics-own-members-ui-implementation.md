---
id: play-politics-own-members-ui-implementation
title: "List own members first and leaders by their posts on the bench"
area: play
kind: bug
priority: 2
size: S
status: done
claimed-by:
pr: #6127
blocked-on:
source: added with npm run pool -- add
---

**What.** Politics mixes chamber leaders from elsewhere into the player own members and shows the full state legislature in its initial list. Separate the player own members from leaders named by their post and chamber. Keep every other member reachable through the State and Federal filters; the original installed-build acceptance remains separate under the October25 ruling.

**Rules.** Wire to the world: read actual town seats, key-person reasons and government office records for member identity and leaders. One rule, all56 places: respect district seats and at-large chambers from their records, with no place-specific UI branches. Browser visual acceptance: use real pointer and keyboard and inspect native responsive captures.

**Done when.** In an ordinary drawn bench game, own senators, representative and state legislators appear before leaders named by post, chamber and home state. State and federal filters reach another state actual members by pointer and keyboard, and the own-member and leader groups fit at1440x900 and1024x768. Own government tests and changed-file checks pass except explicitly reproduced main baselines; native screenshots name the place and seed.

**Files.** src/bench/government.ts, src/bench/handler.ts, src/bench/play.mjs, src/bench/play.css, src/bench/government-own-members.test.ts

**Notes.** Bounded implementation for PR6127. Original play-stop-05-politics-lists-wrong-officials-a remains open for installed-build acceptance. Merger3 own Blanchard Louisiana seedbcab8da5-a556-4a59-b171-23988a6edc1b: Alabama State140 and Federal9 members; native bothsizes and pointer/keyboard pass. Existing gov-territory-delegate-not-own-representative remains separate.
