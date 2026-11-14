---
id: core-recall-test-world-lacks-world-legislating
title: "The recall test's hand-built world leaves out the lawmaking calendar, so a council meeting throws when it closes"
area: core
kind: bug
priority: 2
size: S
status: in-pr
standard: 2
claimed-by: Account lead T40 (claude-opus-5-5)
pr: 9071
after:
blocked-on:
lead: governing
model: sonnet
effort: low
root: none
source: "Account lead T40, Nov 13, 2026: red on the train (draft PR #9052, head eb349e5d) after the #9051 fold"
checked:
claimed-at: 2026-11-13
---

**What.** On the train, `src/core2/recalls.test.ts` case "an ordinance can start a recall where the law allows one" fails with "Module has no registered state." thrown from `filingsOwed` (src/core2/modules/world-legislating.ts), reached through office-day's `closeMeeting` and `earlierMeetingsVote`. The case stops before it reaches the recall it was written to check, so the train carries a red that hides whether recalls still start from an ordinance. Seen: the test run only; no player screen shows it, because no played world can reach it.

**Cause.** Found in code: #9051 (commit 61a9f19a, folded as 1b0c7ec714) added `filingsOwed`, which reads world-legislating's `nextMeetings` table, and office-day calls it when a meeting closes or adjourns. This is office-day's first read of world-legislating's state. The recall test builds its world by hand and installs office-day without world-legislating. The played world (`src/bench/world.ts`) opens world-legislating before office-day, and a body with no meeting row reads as no filing owed, so play is not affected. Measured: seed t40seed1 green on main fa34439d and on the train just before the #9051 fold, red at the fold and at the train head.

**Fix.** The test opens world-legislating before office-day, as the game does. No engine change: core2 modules have no way to declare what they depend on, and office-day's open asserts no other module, so none is invented.

**Time box.** 1 hour for one Sonnet session at low effort.

**Rules.** One rule, all 56 places: the test keeps drawing its state and town from all 56 by seed, and the fix changes only which engines its world installs, never which place it picks or what it expects.

**Done when.** The recalls test file passes on the train head on three fresh seeds, each case under a minute, the ordinance case naming its drawn place, seed and recall record id in its report. A second session starts a life on main in a drawn place whose state allows recalls, passes an ordinance as a council member, and sees the meeting close and the council's next meeting set with no error in the running game.

**Waits on.** Nothing.

**Files.** src/core2/recalls.test.ts

**Notes.** Branch claude/project-thread-6xw3oo (Account lead T40).
