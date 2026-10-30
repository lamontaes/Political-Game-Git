---
id: gov-seated-governor-appointment-job-ends
title: "appointGovernor throws A job ends before its day's work after the player is seated as governor"
area: office
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: governing lead, Oct 30 (found in phase A runs)
lead: governing
---

**What.** After the player is seated as governor through seatWinner, appointGovernor can throw that a job ends before its day's work, apparently because the seated player's job record ends on the day they are appointed. The words session's swearing-in test steps around it and names it (New Pekin IN). A governor the player wins must be seated without stopping the day.

**Rules.** Wire to the world: the governor's seat, the job record and the appointment are one chain the offices and work engines both read, so the fix keeps one job record ending and one starting on the same day without a second path.

**Done when.** A played-world test seats a player as governor in a drawn place with its seed printed and runs appointGovernor and the next day's work without a throw, the old job ending and the office job starting by record id.

**Files.** src/core2/modules/offices.ts, src/core2/modules/executive.ts

**Notes.** TODO
