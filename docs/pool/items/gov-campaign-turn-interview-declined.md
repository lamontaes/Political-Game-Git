---
id: gov-campaign-turn-interview-declined
title: "campaign-turn.test.ts fails on main: a reporter's interview is declined where the test expects an invitation (Admire, Kansas)"
area: gov
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: found in #4741, Oct 16
---

**What.** `src/core2/campaign-turn.test.ts` ("reporters ask from the race's record and ask differently once answered") fails in Admire, Kansas with `GOLDEN_PATH_SEED=7ef82335fab5c9617afa085974f1b9a941d05ce8d8bacf52f9d3c872ffdd0fd9` (place seed `c1a0af02e76e96bbc90a4e89715fdd9c8b1091bdf7a80543c480f9f624830a70`): an interview is 'declined' where the test expects 'invited'. Find the record that makes the speaker decline and decide whether the test or the engine is wrong.

**Rules.** No dice: an interview is invited or declined for reasons in the records (the speaker, the outlet, the race), never a roll. One rule for all 56 places.

**Done when.** The test passes in Admire, Kansas with that seed and in a handful of other drawn places, and the PR body names the record that decided the interview by id.

**Files.** src/core2/campaign-turn.test.ts, src/core2/modules/press.ts, src/core2/modules/campaigns.ts

**Notes.** Fails the same way on main without the ad-outlet change in #4741.
