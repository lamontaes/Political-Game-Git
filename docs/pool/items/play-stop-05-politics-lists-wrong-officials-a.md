---
id: play-stop-05-politics-lists-wrong-officials-a
title: "Politics shows your own two senators, one representative and your legislators first, everyone else behind the filter"
area: gov
kind: bug
priority: 1
size: M
status: done
claimed-by:
pr: #6791
blocked-on:
source: added with npm run pool -- add
lead: play-first
milestone: play-first
claimed-at:
---

**What.** In Anson, Texas the v0.22.10 release listed three U.S. senators, the U.S. Speaker from New York as one of my representatives, and about 180 state legislators in one column. The owner ruled Oct 16 that every legislator stays, behind a division filter, and Oct 15 that the player's own representatives are the key people. This part shows the player's own federal and state members first and puts the rest behind the filter.

**Rules.** Serves LAW.md §1, Screens and menus; LAW.md §11, The world on screen makes sense. One rule, all 56 places: the player's districts are read from the place's records the same way everywhere. Estimate, never UNKNOWN: a district the data lacks starts from the real pattern, marked as an estimate.

**Done when.** In a drawn place, Politics → Government shows exactly the place's number of U.S. senators, one U.S. representative and one state legislator per chamber as the player's own, with every other member reachable behind the division filter.

**Time box.** 3 hours; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** Politics → Government shows your two U.S. senators, your one U.S. representative and your own state legislators first, with every other legislator behind the federal, state and local filter.

**Screenshot.** Before and after, from a drawn place, in the PR body.

**Files.** src/bench/government.ts, src/core2/opening-key-people.ts, src/bench/play.mjs

**Notes.** Playtest Oct 24 (docs/reports/playtest-2026-10-24.md); the owner's read of its screenshots (docs/coordination/OWNER-DECISIONS.md, Oct 24). Split from play-stop-05-politics-lists-wrong-officials (Oct 24, lane). LAW.md conflicts: the Oct 16 ruling keeps everyone behind a filter, so the parent's "one per chamber" means the player's own, not a cut list. Engine changes in opening-key-people are the laws lead's (`needs-from: laws`). Lead: play-first (acting CTO, Oct 24; docs/play-first/ORDER.md). Playtest Oct 26 sitting 1 (installed v0.34.0): Owner: "it obviously doesn't show any of my representatives." They were on page 2 under YOUR MEMBERS, labels hard left and names hard right with no face or party; page 1 was the local council. (#6127 is merged and in v0.34.0.)

Merger 3, October26: PR6127 completes bounded play-politics-own-members-ui-implementation with own native Blanchard Louisiana seedbcab8da5-a556-4a59-b171-23988a6edc1b, responsive own-member/leader pages, real pointer and keyboard filters, and four government cases. This original stays open for owner installed-build acceptance under the October25 ruling. Existing territory delegate ownership is separately gov-territory-delegate-not-own-representative.
