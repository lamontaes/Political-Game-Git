---
id: laws-income-security-line-reaches-poverty-both-tiers
title: "The federal income security line moves SSI households' income where poverty is counted, named and counted"
area: laws
kind: bug
priority: 1
size: S
status: in-pr
standard: 2
claimed-by: laws-and-effects (builder crew, Nov 17)
pr: #9877
after: laws-veterans-line-reaches-poverty-both-tiers
blocked-on:
lead: laws-effects
source: Laws and effects lane, crew line #9747 item 8a, Nov 17, 2026
model: opus
effort: medium
root: rc8-law-judged-by-paperwork
---

**What.** A raise in the federal income security line pays SSI recipients more, but the poverty count never sees it: a named recipient's SSI is an obligation the count does not read, and counted recipients' SSI is paid as one sum to the residents' account, attributed to no household. The law table grades the line partly because no outcome-web link starts from it. Seen: Metrics, the town's poverty share; docs/reports/law-wiring-table.md, the "Spending: Income security programs" row.

**Cause.** Found in code: `paySsi` (src/core2/law-reach/group-b-money.ts) pays named heads by `reconcileObligations` and the counted share to the residents' account, keeping no record by household; `householdPoverty` (src/core2/world-poverty.ts) reads no SSI.

**Fix.** `paySsi` keeps each household's month of SSI, named and counted, and the poverty count reads it for both tiers. The means test SSI runs on never reads it, so a benefit does not cut the next month's. Add the researched link `income-security-line-to-poverty`, carried by the poverty engine, from the Census list of the incomes poverty is computed from.

**Time box.** 2 hours for one Opus session at medium effort.

**Rules.** One model, two tiers: a counted household's SSI follows the line by the same rule as a named one's. An effect is a read: the poverty engine reads the benefit the treasury paid.

**Done when.** A second session, in a drawn place, Town, State (seed printed), passes a Congress bill raising the income security line by a fifth in dev mode, runs past the next monthly close, and reads on the bill card the named and counted SSI households reached; `src/core2/income-security-line-poverty.test.ts` passes in that drawn place.

**Waits on.** laws-veterans-line-reaches-poverty-both-tiers (#9874), which this branch is stacked on.

**Files.** src/core2/law-reach/group-b-money.ts, src/core2/world-poverty.ts, src/core2/modules/laws.ts, data/research/outcome-web/links.json, src/core2/data/outcome-web/coverage.json, src/core2/income-security-line-poverty.test.ts (new)
