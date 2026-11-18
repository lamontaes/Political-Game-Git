---
id: jobs-away-workers-never-lose-work
title: "The workers who live in town and work out of town never lose their jobs, so the town's jobless count only drains"
area: world
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: jobs
source: "Account lead F1, Nov 14, 2026, from the coordinator's one-model-two-tiers ask after the Metrics tab fix"
model: sonnet
effort: medium
root: rc10-screens-keep-own-facts
---

**What.** About a third of a small town's workers (196 of 524 at Tanapag) work out of town, and nothing ever ends their work: the monthly layoff pull reaches the town's own jobs and the counted people who found regional work by name, but not the household's away workers, which are only a share on the household record. So the same worker is let go at the state's pace if they work in town and never if they work out of town, and the town's jobless stock drains in the months after the opening. A player who opens a town with high unemployment watches it fall for no reason the world holds. Seen: the Metrics tab's jobless count month by month in a town that opens high.

**Cause.** Measured: three drawn places, a town of 1,500 for one year from the opening, jobless then in work, every month, with no layoffs applied to the away share: Tanapag, Northern Mariana Islands (seed 9e95b68a47a0d28082fc4d0185f47064) jobless 54, 34, 30, 41, 40, 45, 47, 31, 35, 43, 29, 29 against 548 in work to 535; Staples, Connecticut (seed probe-a) 25 down to 21; Maloata, American Samoa (seed probe-b) 65 down to 56. In src/core2/modules/jobs.ts, `reviewTurnover` pulls only `turnoverJobs` and the `regional` table, while `unplacedWorkers` (the household's away share, read in `awayByShare`) has no row for a layoff to end. Found in code: the engine knows the household's place, so the state's conditions are that place's; it does not know which employer holds an away worker.

**Fix.** Each month, shrink every household's away share by its share times the quarterly layoff pull moved by the place's state conditions (`layoffPerQuarter`, `regionalConditions`), take the pay off the place's pool (`loseAwayWork`), and make as many members jobless and looking as the lost shares add up to whole workers, by a running carry through the households. The existing regional finds hire them back by the one hiring rule.

**Time box.** 2 hours for one Sonnet session at medium effort. When it runs out, push what is found, set the state honestly with a one-line note, and stop.

**Rules.** No dice (`no-dice`): a share and a carry, never a roll. One model, two tiers: a counted group is read with the same rule as a full person, times its count. Nothing flips at a threshold.

**Done when.** A second session, not the builder, runs the pinned test src/core2/away-workers-turnover.test.ts at a drawn place nobody chose and at Tanapag, Northern Mariana Islands, Staples, Connecticut and Maloata, American Samoa (a year each, under a minute and a half), and sees that away workers let go are looking in December, the jobless stay between half and twice the opening count, and the labor force holds.

**Waits on.** Nothing.

**Files.** src/core2/modules/jobs.ts, src/core2/modules/residents.ts, src/core2/away-workers-turnover.test.ts
