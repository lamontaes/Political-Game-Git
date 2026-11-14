---
id: gov-office-act-intervals-grounded
title: "Ground how often a small-town mayor holds office hours, meets department heads and gives an address"
area: gov
lead: laws
kind: research
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
model: opus
effort: medium
root: none
source: "Account lead builder, Nov 14 (mayor-acts PR, coordinator's request)"
checked:
---

**What.** The office acts a played mayor takes on free days come due on intervals that are unverified estimates: office hours 30 days, a meeting with a department head 45 days, an interview 91 days (`officeHoursIntervalDays`, `meetHeadIntervalDays`, `interviewIntervalDays` in `LOCAL_PARAMETERS`, src/core2/office-day-acts.ts), and the address in its season (`stateOfCityLastMonth`). None has a fetched source. Seen: a mayor's Journal over a year at a drawn place shows these acts at a believable rhythm.

**Cause.** Found in code: `LOCAL_PARAMETERS` in src/core2/office-day-acts.ts marks each of these rows "Unverified estimate (builder, Nov 14, 2026)"; they stand only on the played-year check at Edmore ND and Odessa WA.

**Fix.** Find published schedules or surveys of how often small-town mayors and councils hold office hours, meet department heads, sit for press interviews and give a yearly address (municipal association guides, city charters, surveys of local officials), quote them, and replace each row with a SOURCED or ESTIMATED value with its spread. The values calibrate how often the act comes due; they never pick an outcome.

**Time box.** 2 hours for one Opus session.

**Rules.** researcher: pages actually fetched and quoted; no dice; one value per row, no new row.

**Done when.** Each of the four rows carries a quoted source and spread, the pinned test src/bench/mayor-acts.test.ts still passes, and a second session plays a mayor at a drawn place (name and seed in the PR) for a season and sees office hours, meetings and an interview at a believable rhythm in the Journal.

**Waits on.** The mayor-acts PR merged.

**Files.** src/core2/office-day-acts.ts, src/bench/mayor-acts.test.ts

**Notes.** Filed with the mayor-acts PR.
