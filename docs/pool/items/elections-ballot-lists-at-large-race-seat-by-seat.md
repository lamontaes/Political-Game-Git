---
id: elections-ballot-lists-at-large-race-seat-by-seat
title: "The ballot lists an at-large race seat by seat, two candidates running alone, while the returns count all four in one race"
area: elections
kind: bug
priority: 1
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: play-first
model: opus
effort: medium
root: none
source: Playtester P1, Nov 13
claimed-at:
---

**What.** Curtisville, Pennsylvania (bench seed 24b09c77-0589-433f-9b6b-0c77e53b4ff7, main 5e68cde1). The player filed for the West Deer Township Board of Supervisors and voted on November 4, 2025. The ballot paper shows three races: "FOR SUPERVISOR: HARPER LIN / ALAN WEBB / LEAVE BLANK", "FOR SUPERVISOR: ERIC SANTOS / LEAVE BLANK", "FOR SUPERVISOR: ELENA OCHOA / LEAVE BLANK". The returns the next morning count one race: "Alan Webb 201 votes / Harper Lin 96 / Elena Ochoa 77 / Eric Santos 43", and the paper says Alan Webb won with 48.2% of 417 votes. So the voter is told they choose among three one-seat races, and the count treats them as one three-seat race. Seen: the ballot paper at the polling place, which matches the race the returns count.

**Cause.** Found in code: src/director/polling-place.ts, `contestsOn` and the visit builder (about lines 76 to 170), make one `PollingContest` per contest record, and `markBallot` takes one candidate per contest. src/core2/modules/elections.ts `atLargeGroup` (about line 875) pools a body's at-large seats on one day into one race for the count and the returns. The ballot never reads `atLargeGroup`. Each seat's contest lists only the filers who filed for that seat, so a filer alone on a seat shows as an unopposed race.

**Fix.** Build the ballot's races from `atLargeGroup`. An at-large group is one race, "vote for up to N" (N the group's seats), listing every candidate of the group. `markBallot` takes up to N marks for it and casts them through the voting engine the way the count reads a pooled race. A district or single seat stays one race, as now. The words for "vote for up to N" come from the Words session as a control. Follow #8550 (play-at-large-race-one-row), which makes the Campaigns list one row per at-large race, so the two screens agree.

**Time box.** 3 hours for one Opus session.

**Rules.** One rule, all 56 places: the ballot reads the same at-large grouping the count reads, with no place or body named in code. One engine per mechanic: the ballot and the returns are views of the same race record, never two versions of it.

**Done when.** A second session, on main, starts new lives in a drawn place each until one has an at-large council, board or trustee election, plays a new life to election day, and takes a screenshot of the ballot. The at-large seats are one race listing every candidate with "vote for up to" its seat count, and the returns that night count the same candidates as that one race.

**Waits on.** The Words session's control for "vote for up to N".

**Files.** src/director/polling-place.ts, src/bench/polling.ts, src/bench/ui/ballot-paper.mjs, src/core2/modules/elections.ts
