---
id: elections-world-candidate-event-every-turn
title: "A funded world candidate holds an evening event on nearly every campaign turn, so a State House race fills a town's evenings"
area: gov
kind: bug
priority: 1
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
model: opus
effort: medium
root: rc5-full-detail-every-day
lead: governing
source: written by the speed lead from the Nov 11 event counts (#7365); Fable B, Nov 11 09:20Z, "not intended ... file it for the elections lead with your measured count"
---

**What.** In South Hooksett, New Hampshire (key 3371220, seed s8333), the 2026 campaign held 1,202 evening events in town. 1,134 of them came from the four State Representative contests for one district (610), about 290 events each, and 42 from the State Senate race. A world candidate takes a campaign turn every `campaignTurnDays` (3) days, and nearly every turn of a funded candidate is an evening event. Each event weighs every adult who has heard of the candidate (463 people an event in year 2, 998 in year 4) and moves those who come, so world campaigns take about 40% of an election year (131 of 400 s in year 2, 282 of 721 s in year 4). Fable B, Nov 11 09:20Z: how often a candidate campaigns comes from their time, money and staff, checked against research, never a fixed pace. Seen: the game running; the town's evenings, the news and the race page show a few candidate events a season, not one every night, and an election year runs faster.

**Cause.** Measured: South Hooksett, New Hampshire (3371220), seed s8333, main 972d0800, a counter in `holdEvent` by contest (year 2: 1,202 events; four State Representative contests about 290 each). Found in code: src/core2/modules/campaigns.ts `rivalDay`. `eventScore` = `rivalActBaseScore` (0.25) + `rivalEventRichWeight` (3) × richness + traits + threat, where richness = cash / (cash + one venue's price). Once a campaign holds a few venues' worth of money, richness is near 1 and the event scores about 3.25, above calls (`callScore`, about 1 to 2) and doors (`doorScore`, about 1 to 2). The event is taken whenever it beats the best hourly act, so every funded turn is an event. `campaignTurnDays` (3, TUNABLE) is a fixed pace for every candidate.

**Fix.** Make an evening event a cost the campaign weighs against its time, money and staff, as a real one does: the richness term reads what the event costs against what the campaign must still spend by election day (not one venue's price), and an event's pull falls with how recently the campaign held one in the same town (the turnout a second rally in a week draws). Calibrate the share of turns that are events against research on down-ballot campaigns (state legislative candidates: a few public events a month, most time on doors and calls), recorded as an ESTIMATED parameter. A candidate's turn cadence (`campaignTurnDays`) comes from their hours (`rivalHoursWithJob` / `rivalHoursWithoutJob`), not one fixed number. No dice: the candidate's own traits, money and race still decide each turn.

**Time box.** 6 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No dice: each turn is still decided by the candidate's traits, money and the race, never a draw or a fixed rate. Research before building: the share of evenings a down-ballot candidate spends at events is sourced, and it checks totals only. Speed: a country's year runs under two minutes in every year; this is the largest single cost of an election year in a large town. Owner decisions are flagged, never waited on.

**Done when.** A second session plays South Hooksett, New Hampshire (key 3371220, seed s8333) and a place drawn from all 56 through an election year in the played world: world candidates' evening events per contest fall to the sourced range (counted with the event records by contest), winners and vote shares are reported against main, and year 2's time falls. The race page in the running game shows a candidate's events as a handful a month.

**Waits on.** Nothing.

**Files.** src/core2/modules/campaigns.ts, src/core2/data/campaigns/parameters.json
