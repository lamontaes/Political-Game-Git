---
id: laws-social-security-line-reaches-poverty-both-tiers
title: "The federal Social Security line moves who is poor, in both tiers"
area: laws
kind: bug
priority: 1
size: M
status: in-pr
standard: 2
claimed-by: laws-and-effects (builder crew, Nov 17)
pr: #9825
after:
blocked-on:
lead: laws-effects
source: Laws and effects lane, crew line #9747 item 8a, Nov 17, 2026
model: opus
effort: medium
root: rc8-law-judged-by-paperwork
---

**What.** A raise in the federal Social Security line pays named retirees more, but the counted retirees' own income, which the poverty count reads, never moves. Social Security claimed during play is not counted as income at all. The law table grades the line partly because no outcome-web link starts from it. Seen: Metrics, the town's poverty share, and dev mode's bill card for a Social Security bill.

**Cause.** Found in code: `rerateCountedRetirement` (src/core2/modules/residents.ts) rescales the pooled retirement flows but not each counted household's own award rows, so `retirementMinorYear`, read by `householdIncome` and the poverty count (src/core2/world-poverty.ts), keeps its opening value. `householdPoverty` counts named households' opening awards (income contracts) but not a claim made in play (an obligation in src/core2/modules/retirement-claims.ts). `applySocialSecurityLevel` (src/core2/budgets-treasury.ts) skips a counted claimant's award.

**Fix.** `rerateCountedRetirement` moves each counted household's award rows by the same ratio as its flow; `householdPoverty` adds each open claim's award to its claimant's household, named or counted; `applySocialSecurityLevel` rerates a counted claimant's award as a named one's. Add the researched link `social-security-line-to-poverty`, carried by the poverty engine, from the Census list of the incomes poverty is computed from.

**Time box.** 3 hours for one Opus session at medium effort.

**Rules.** One model, two tiers: a counted retiree's award follows the line by the same rule as a named retiree's. An effect is a read: the poverty engine reads the award the line set.

**Done when.** A second session, in a drawn place, Town, State (seed printed), passes a Congress bill raising the Social Security line by a tenth in dev mode, runs past the next monthly close, and reads on the bill card the named and counted retirees reached; `src/core2/social-security-line-poverty.test.ts` passes in that drawn place.

**Waits on.** Nothing.

**Files.** src/core2/modules/residents.ts, src/core2/world-poverty.ts, src/core2/budgets-treasury.ts, data/research/outcome-web/links.json, src/core2/social-security-line-poverty.test.ts (new)
