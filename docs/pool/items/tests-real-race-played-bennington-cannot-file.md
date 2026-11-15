---
id: tests-real-race-played-bennington-cannot-file
title: "The real-race proof test is red at its pinned place: the player at Bennington, Kansas can file for no council race on Mar 3, 2026"
area: elections
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
root: none
lead: governing
model: sonnet
effort: medium
source: Views thread, Nov 15 (gate of #9434 on the train at ff9703d7)
---

**What.** `src/core2/campaign-real-race-played.test.ts` fails on the train at ff9703d7 and on #9434's head the same way: "pinned place did not show all four clauses: Bennington, Kansas (2006075), place seed d3e80a0a852ebb1850f1420f52bfa167ccf63d7cd1446c0457af35a5162a3507: on 2026-03-03 the player person_ff2b4c8e04947e2d could file for no council race (0 contests offered)". The test proves the player files, campaigns and is counted in a real race, so the golden path's filing step is unproven while it is red. Seen: a pinned test, red on the clean train.

**Cause.** Needs cause. Looked at: the test's own message only. The pinned place has no council contest open for filing on its filing day. That is either a change on the train to when the town's council is elected (see `elections-town-council-on-state-municipal-cycle`) or to what the filing office offers. Neither is checked yet.

**Fix.** None until the cause is found.

**Time box.** 2 hours.

**Rules.** Never loosen a test to get green: the four clauses stay (pinned-tests). Ask why, by record: name the contest the town held and its filing window before changing the date.

**Done when.** A second session runs `src/core2/campaign-real-race-played.test.ts` on main and sees all four clauses at its pinned place, and in a drawn place (place and seed named) plays to a filing day and files for a council race.

**Waits on.** Nothing.

**Files.** src/core2/campaign-real-race-played.test.ts

**Notes.**

- Nov 15 (views thread): a likely fix, once the cause is named: if the town's council is no longer on the 2026 ballot by its state's municipal cycle, re-pin the test to the town's real filing day, with the old premise stated and the lead's yes. The clauses are never loosened.
