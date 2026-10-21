---
id: release-red-legislature-project-request-bills-fail
title: "legislature.test project-request case fails on main: no state appropriations bill with a member's project passes in six towns"
area: gov
kind: bug
priority: 2
size: S
status: claimed
claimed-by: claude/legislature-project-request
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-21T05:51:23.941Z
---

**What.** On main fb7cd6374b, src/core2/legislature.test.ts 'a state member's project request becomes a line naming the city, and the grant lands in the city treasury' throws at line 433: no state bill with a request passed: 4630220 failed; 1937560 failed; 1854900 failed; 2118424 failed; 5117952 vetoed; 2868960 failed (seed 66df8c9ec5f556304a8459036ec170643195ca9f746c21fdd8cf01dcabe59b3c). It passes when the case runs alone, so a state the earlier cases leave behind, or the run seed, decides it. Find why every appropriations bill with included project lines fails its vote, from the members' recorded positions, and fix the cause rather than the draw.

**Rules.** Ask why: each failed bill's vote is explained by the members' recorded positions and the deals offered, by record id. No dice: the vote follows the members' reasons. Never loosen the test: the grant reaching the city treasury stays asserted.

**Done when.** src/core2/legislature.test.ts passes as a whole file on the seed above and on three fresh seeds, the project-request case finds an appropriations bill that passes in a drawn town, and the PR names why the earlier bills failed by bill id.

**Files.** src/core2/legislature.test.ts, src/core2/modules/legislature.ts

**Notes.** Found while running the legislature tests for gov-legislature-repasses-law-in-force (PR #5778); the same failure on clean main.
