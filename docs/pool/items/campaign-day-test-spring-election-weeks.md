---
id: campaign-day-test-spring-election-weeks
title: "campaign-day.test.ts fails by seed where the town's spring election ends the campaign before 20 weeks"
area: elections
kind: bug
priority: 2
size: S
status: merged
claimed-by: claude/pool-campaign-day-test-spring-election-weeks
pr: #8447
after:
blocked-on:
source: governing lead, Oct 30 (found in phase A runs)
lead: governing
standard: 2
model: sonnet
effort: low
root: none
checked: fable 2026-11-10
claimed-at: 2026-11-11T01:52:18.734Z
merged-at: 2026-11-12T06:21:30.675Z
---

**What.** The test that every week a candidate knocks reaches someone expects more than 20 weeks of knocking, but a town with a spring election closes its campaign first. It fails on main in about 2 of 200 draws: Highgate Center VT (5033175, run seed wk-104) gives 9 weeks and Hobart WI (5535150, run seed wk-142) gives 14. The rule is right and the test's fixed week count is wrong. Guards: every week a candidate knocks reaches someone on the Campaigns screen; the test's week count is wrong for a town with a spring election.

**Cause.** Measured: with run seed wk-104 (`GOLDEN_PATH_SEED=wk-104`; Highgate Center, Vermont, 5033175, 9 weeks) and run seed wk-142 (Hobart, Wisconsin, 5535150, 14 weeks) fail src/core2/campaign-day.test.ts, which expects more than 20 weeks of knocking; about 2 of 200 draws fail on main.

**Fix.** Make the test read each drawn place's own election date from its contest record and expect weeks of knocking up to that date. Print the place and the seed in any failure message.

**Time box.** 2 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One rule, all 56 places: the test reads each drawn place's own election date from its contest record instead of a fixed twenty weeks, so every place's calendar passes by the same rule.

**Done when.** A second session runs src/core2/campaign-day.test.ts with GOLDEN_PATH_SEED=wk-104, wk-142 and three fresh seeds it draws, sees it pass in each drawn place, and sees the place and seed printed when a failure is forced. The weeks of knocking checked are those up to each place's own election date.

**Waits on.** Nothing.

**Files.** src/core2/campaign-day.test.ts

**Notes.** TODO
