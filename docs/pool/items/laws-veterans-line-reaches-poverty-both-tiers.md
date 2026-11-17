---
id: laws-veterans-line-reaches-poverty-both-tiers
title: "The federal veterans line moves veterans' household income where poverty is counted, named and counted"
area: laws
kind: bug
priority: 1
size: S
status: in-pr
standard: 2
claimed-by: laws-and-effects (builder crew, Nov 17)
pr:
after:
blocked-on:
lead: laws-effects
source: Laws and effects lane, crew line #9747 item 8a, Nov 17, 2026
model: opus
effort: medium
root: rc8-law-judged-by-paperwork
---

**What.** A raise in the federal veterans line pays veterans more, but the poverty count never sees it: a named veteran's benefit is an obligation the count does not read, and the counted veterans' benefits are paid as one sum to the residents' account, attributed to no household. The law table grades the line partly because no outcome-web link starts from it. Seen: Metrics, the town's poverty share; docs/reports/law-wiring-table.md, the "Spending: Veterans benefits and services" row.

**Cause.** Found in code: `payVeterans` (src/core2/law-reach/group-b-veterans.ts) pays named veterans by `reconcileObligations` and the counted share to the residents' account, and keeps no record by household; `householdPoverty` (src/core2/world-poverty.ts) reads the welfare line's per-household record (`assistanceIncomeByHousehold`) but nothing for veterans.

**Fix.** `payVeterans` keeps each household's month of benefits (a named veteran's household its benefit, a counted household its members' veteran share), as the welfare line does; the poverty count reads it for named households, and counted households' income reads it through the residents engine's public income reader. Add the researched link `veterans-line-to-poverty`, carried by the poverty engine, from the Census list of the incomes poverty is computed from.

**Time box.** 2 hours for one Opus session at medium effort.

**Rules.** One model, two tiers: a counted veteran's benefit follows the line by the same rule as a named veteran's. An effect is a read: the poverty engine reads the benefit the treasury paid.

**Done when.** A second session, in a drawn place, Town, State (seed printed), passes a Congress bill raising the veterans line by a fifth in dev mode, runs past the next monthly close, and reads on the bill card the named and counted veterans reached; `src/core2/veterans-line-poverty.test.ts` passes in that drawn place.

**Waits on.** Nothing.

**Files.** src/core2/law-reach/group-b-veterans.ts, src/core2/law-reach/group-b.ts, src/core2/world-poverty.ts, src/core2/modules/laws.ts, data/research/outcome-web/links.json, src/core2/data/outcome-web/coverage.json, src/core2/veterans-line-poverty.test.ts (new)
