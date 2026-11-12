---
id: core-country-tier-town-joins-its-state-part-5-delete-the-fixed-layoff-pace
title: "The town joins its state, part 5: the fixed layoff pace is deleted once firms let people go for reasons on their books"
area: core
kind: stopgap
priority: 1
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: jobs
model: opus
effort: medium
root: design-country-tier
source: split from core-country-tier-town-joins-its-state by Fable, Nov 10, 2026 (owner, Nov 10: every assignment works without Fable)
checked: fable 2026-11-10
---

**What.** Town workers are let go at a fixed national pace because, until parts 2 and 3, no firm's sales ever fell on their own. This part proves the pace is no longer needed and deletes it, or says exactly why it cannot be deleted yet. It builds nothing new: it is a proof in three drawn places, then a deletion. Feeds: core-country-tier-town-joins-its-state (the fixed layoff pace is what the player sees as people let go with no cause on their employer's books).

**Cause.** Found in code: `reviewTurnover` (src/core2/modules/jobs.ts line 2295, called at line 2119) lets workers go at a fixed pace (stopgap SG-LABOR-turnover-fixed-rate, src/core2/data/stopgaps/labor.json line 129). The stopgap's own text records what was measured on Nov 8 and 9 with the pace switched off: four small towns had no layoffs in most months.

**Fix.** With parts 2 and 3 on main, run scripts/world-proofs/jobs-24-months.ts in three drawn places with the pace switched off (a switch in a scratch copy, never committed). The employer's own review (`reviewEmployers`, jobs.ts line 1324) already cuts hours first and lets people go when sales fall short. If people are let go and hired in most months and each separation traces to the employer's sales, delete `reviewTurnover`, its `turnover` table, its parameters and the stopgap row in one pull request. If not, delete nothing: write the three month-by-month tables into this item's Notes, say which months had no separations and what the employers' sales did, and set the item back to open.

**Time box.** 8 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note and stop.

**Rules.** No dice and causes, not chance: a worker is let go because the employer lost sales for a reason on its books. Replace, never layer: the pace goes in the same change that proves it unneeded. Skill labor-market-proof: 24 months, inflow and outflow, month by month. Ranges are not targets (owner, Nov 8): a level outside the real range is fine when causes support it; the pull request says the level and the causes.

**Done when.** A second session, on main in a drawn place with a seed nobody chose, runs 24 months with scripts/world-proofs/jobs-24-months.ts: people are let go and hired in most months, Trace on each of three separations opens the employer's sales record that fell, and the count out of work stays between zero and the number of adults. A search of src/core2 finds no `reviewTurnover` and no layoff rate applied by the month. The same holds in two more drawn places, each named with its seed.

**Waits on.** core-country-tier-town-joins-its-state-part-2-outside-buyers-follow-the-sector, core-country-tier-town-joins-its-state-part-3-a-sellers-share-follows-its-books.

**Files.** src/core2/modules/jobs.ts, src/core2/data/stopgaps/labor.json, scripts/world-proofs/jobs-24-months.ts
