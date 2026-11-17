---
id: director-circumstance-test-hangs-on-meeting-hold
title: "The circumstance test hangs forever on a sitting member's meeting stop"
area: director
kind: bug
priority: 1
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
model: sonnet
effort: medium
root: none
source: Story board builder, Nov 17, running src/director/circumstance.test.ts for #9841; the same hang on main 5e809f49 and on #9819's head ab4abcbe
lead: governing
claimed-at:
---

**What.** `src/director/circumstance.test.ts` never ends when its drawn sitting member's body meets: the player clock returns the same meeting stop on the same day forever, so the test runs past its 20-minute limit (a synchronous test cannot be stopped by it) and CI's unit job with it. No year after the member's plays, so nobody can read whether every family of scenes from circumstance still fires. Seen: a played council or board member's year plays past their first sitting, with its scenes from circumstance.

**Cause.** Found in code: `holdPlayerIfDue` in src/core2/modules/office-day.ts (line 891 on main 5e809f49) registers the seated member's meeting stop with `hold: true` (line 947), which holds the clock until the meeting releases it. The test's play loop (`playYear`, src/director/circumstance.test.ts line 279) only resumes each stop and never lets the meeting go, so every resume returns the same stop. The bench's own play loop releases it with `leaveHoldsToCharacter` (src/bench/office.ts line 366), as `src/bench/meeting-attend.test.ts` and `src/bench/office-stop-switch.test.ts` do. Measured: GOLDEN_PATH_SEED b4923dc0b02a69e1cea8, draw 0; the resident year at Malo, Washington (5342310) played in 28 s, then the sitting member at St. Davids, Pennsylvania (4267264), world seed c2de3e419232edec2581684ac09cd0b87c920619093b9e6c6ae789543b5f1063, got the stop `core2-office-day-v1:meeting:office:gus2025:205302:board:2025-02-04` on 2025-02-04 over 600,000 times; the same on main 5e809f49 and on ab4abcbe (a copy of the test that throws after 20,000 packets: "stuck at St. Davids, Pennsylvania ... as a sitting member on 2025-02-04").

**Fix.** In `playYear`'s loop, on a stop, call `leaveHoldsToCharacter(core, personId)` from src/bench/office.ts before resuming, as the bench does, so the character sits the meeting and the hold is released; keep every assertion as it is. If the test means the player to attend, take up the agenda through the bench's meeting route instead; either way the loop must not resume a held stop unchanged.

**Time box.** 2 hours for one Sonnet session. When it runs out, push what passes and say so. Seen: the circumstance test's member year plays to its end.

**Rules.** Fix the cause, not the check: no raised limit, no skip, no pinned seed. One rule, all 56 places: no place is named in logic.

**Done when.** A second session runs `src/director/circumstance.test.ts` alone on main, at GOLDEN_PATH_SEED b4923dc0b02a69e1cea8 and at a seed it draws (the drawn place and seed named), and sees it end inside its 20-minute limit with the member's year played past its first sitting.

**Waits on.** Nothing.

**Files.** src/director/circumstance.test.ts, src/core2/modules/office-day.ts, src/bench/office.ts

**Notes.** Nov 17. Blocks #9841's `circumstance.test.ts` run (director-board-picks-a-few); found while running it there.
