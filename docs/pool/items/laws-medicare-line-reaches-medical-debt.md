---
id: laws-medicare-line-reaches-medical-debt
title: "The federal Medicare line's money reaches what its members' households owe on their medical bills, and the law table can see it"
area: laws
kind: bug
priority: 1
size: S
status: in-pr
standard: 2
claimed-by: laws-and-effects (builder crew, Nov 17)
pr: #9844
after:
blocked-on:
lead: laws-effects
source: Laws and effects lane, crew line #9747 item 8a, Nov 17, 2026
model: opus
effort: medium
root: rc8-law-judged-by-paperwork
---

**What.** The law table grades the federal Medicare line partly: no researched outcome-web link starts from it, so its web cell reads "no researched outcome-web link starts from this law". The bills already price each Medicare member by the line in force, so a raise lowers their share of the care, but nothing names the outcome that moves or lets the checker find the bills that carry it. When the line is put back, every member's reach row stays open, so the undo never shows; the drug negotiation law's rows stay open after a repeal the same way. Seen: docs/reports/law-wiring-table.md, the "Spending: Medicare" row, whose repeal cell fails once the checker raises the federal line (#9773).

**Cause.** Found in code: `webLinksOf` (scripts/law-wiring/catalog.ts) looks for a link from `budget.medicare-added-pct`, and data/research/outcome-web/links.json has none. `billMembers` (src/core2/medical-bills.ts) already reads `federalBenefitLine(api, MEDICARE_LINE)` and writes `medicareLineMinor` on each Medicare member's bill; `BILL_CARRIED` (scripts/law-wiring/bill-records.ts) has no rule for it. `billMembers` calls `lawApplied` for each member a change reaches but never `lawNoLongerApplies`, so a row stays open after the line returns to its base or the drug law is repealed.

**Fix.** Add the researched link `medicare-line-to-medical-debt` from the line to `finance.medical-debt-in-collections`, carried by the bills (Goldsmith-Pinkham, Pinkovskiy and Wallace, New York Fed Staff Report 911), with its coverage row, and a `BILL_CARRIED` rule that counts a Medicare member whose bill a raised line lowered. `billMembers` keeps the members each change reached on this month's bills and ends that engine's rows for anyone it no longer reaches.

**Time box.** 2 hours for one Opus session at medium effort.

**Rules.** One model, two tiers: the bills price named and counted Medicare members by the same rule. An effect is a read: the bills read the line in force when they price each member.

**Done when.** A second session, in a drawn place, Town, State (seed printed), passes a Congress bill raising the Medicare line by a fifth in dev mode, runs past the next monthly bill, and reads on the bill card the Medicare members reached; a second bill putting the line back ends their rows at the next bill; `src/core2/medicare-line-medical-debt.test.ts` passes in that drawn place.

**Waits on.** Nothing.

**Files.** src/core2/medical-bills.ts, data/research/outcome-web/links.json, src/core2/data/outcome-web/coverage.json, scripts/law-wiring/bill-records.ts, src/core2/medicare-line-medical-debt.test.ts (new)
