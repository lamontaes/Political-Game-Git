---
id: laws-second-chamber-takes-the-bill-on-its-own-day
title: "A state bill that passes its first chamber is taken up by the second chamber on that chamber's own sitting, not the same instant"
area: laws
kind: wiring
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: laws-effects
model: opus
effort: medium
root: none
source: Brief V report 1 (/mnt/project-files/words-lead/bill-stages/report-1.md, section 5); Account lead approved Nov 14 2026 06:42Z
claimed-at:
---

**What.** A bill in a two-chamber legislature crosses both chambers inside one vote call on one day: its second chamber's committee, floor and roll fall on the same day as the first chamber's roll, often with the executive's signature too. Played in Ciales, Puerto Rico (probe seed `bill-stages-state`, draw 0): HB 10's House floor, Senate hearing, Senate floor and the governor's signature all fell on Mar 10, 2025. The other chamber has no day of its own, so no scene can happen there (no member to win over, no second chair, no second hearing). Seen: the bill card's stage line shows the bill waiting in the other chamber for its own hearing day, and the scenes of the other chamber get a day to play on.

**Cause.** Found in code: src/core2/modules/legislature.ts, `countVote` (line 5351), loops `for (const chamber of chambersOf(api, bill))` and runs `committeeStage`, `floorAmendments` and `chamberVote` for every chamber in the same call.

**Fix.** Stop `countVote` after the first chamber's roll. A bill that carries is marked as passed by that chamber (a field naming the chambers passed, read by `billEnding` and the bill screen) and booked on the second chamber's next sitting through the same path the first chamber uses (`scheduleVote`, `holdCommittee`, `committeeLeadDays` ahead, `floorAgendaOn` so `askBeforeTheRoll` sees it). On that day the second chamber runs its committee, amendments and roll through the same functions, and only then does the bill go to the desk. Nothing new is decided. Update every caller that expects `holdVote` to finish a state bill in one call: dev mode's hold-vote route (`src/bench/dev-mode.ts`), the bill stage view (`src/bench/bill-stage.ts`), the law-wiring tests and `world-legislating.ts` for other states. A session that ends before the second chamber's sitting ends the bill as `session-ended`, as now. Builds the ground #9005 (a second-chamber hold re-listed) needs.

**Time box.** 8 hours.

**Rules.** One engine per mechanic: the second chamber runs through the same functions, no second path. No dice. Speed (owner, Oct 29): it adds nothing to the daily step. Because it changes the unattended world, the PR shows year 1 and time per record at three pinned places, with and without, and how many bills become law per session before and after (Account lead, Nov 14 06:42Z).

**Done when.** In a drawn place in a state with two chambers, a second session plays the player's state bill through the first chamber's roll and sees it wait in the other chamber: the bill card names the other chamber and the day it is taken up, that chamber's committee and roll come on that later day by record id, and only then does it reach the governor's desk. The second session also checks that a bill that fails in the first chamber never reaches the second.

**Waits on.** Nothing.

**Files.** src/core2/modules/legislature.ts, src/core2/modules/world-legislating.ts, src/bench/dev-mode.ts, src/bench/bill-stage.ts, src/core2/second-chamber-own-day.test.ts (new)
