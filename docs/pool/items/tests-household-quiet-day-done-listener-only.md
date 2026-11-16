---
id: tests-household-quiet-day-done-listener-only
title: "The household-quiet test expects a work day from either person; the quiet subject reads only the listener's"
area: words
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
model: sonnet
effort: medium
root: none
source: Desk thread, Nov 15, gating #9489 on the Train base 53e4b29fe8
---

**What.** src/director/household-quiet.test.ts fails on the clean Train base 53e4b29fe8 at Malden, Massachusetts (GOLDEN_PATH_SEED=08dd810e45459da4656e5acdb2a97a586ee46e2b): "2025-01-21 person_9471e4f98f648128: dayDone: expected false to be true". The housemate (the town's city administrator) has 510 planned minutes that day; the player has none. Guards: the "Long day?" line a housemate says at home only on a day the player worked.

**Cause.** Found in code: commit 1fc9138659 ("talk through the telling") changed `quietDay` in src/director/conversation.ts to read only the listener's own work day (`workDoneToday(core, listener.id, minuteOfDay)`), by the Words lead's telling rule; the test still expects `dayDone` when either the speaker or the player has hours (`working = hasHours(core, id) || hasHours(core, playerId)`). It passes only in draws where the two agree.

**Fix.** Make the test read what the rule says: `dayDone` when the listener (the player, in `subjectsBetween(core, id, playerId)`) has a shift done by the talk's minute, using the same minute the subject uses; keep the check that the cited job is the listener's. Do not loosen it to "either".

**Time box.** 1 hour, one Sonnet session.

**Rules.** One rule, all 56 places: the test must pass at every drawn place; pinned-tests: keep the draw, name the seed.

**Done when.** The test passes at Malden MA with the seed above and at two more drawn places, and fails when `quietDay` drops `dayDone`; a second session sees a housemate ask "Long day?" in the running game only on a day the player worked.

**Waits on.** Nothing.

**Files.** src/director/household-quiet.test.ts
