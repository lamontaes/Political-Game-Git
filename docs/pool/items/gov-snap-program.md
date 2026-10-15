---
id: gov-snap-program
title: "A SNAP program pays eligible households their allotment each month"
area: gov
kind: feature
priority: 2
size: L
status: claimed
claimed-by: claude/gov-snap-program
pr:
blocked-on:
milestone:
source: "found while building laws-family-assistance-health; stopgap SG-GOV-REACH-B-assistance-benefits"
---

**What.** The starting law holds SNAP's maximum allotments by household size (`snap-maximum`, FY2026 and FY2027), but nothing pays them. Build a monthly program: a household with gross income under 130% of the poverty line (already in group B) and the asset rules the game can read gets the maximum for its size less 30% of its net income (earned-income deduction 20%, standard deduction by size, minimum benefit), paid from the federal fund outside the town, to the named household's payer or to the place's counted households together. Take-up follows need: the FY2022 national participation rate was 88% of eligible people, higher for households with the least income. Count each payment in the welfare line the way `registerLinePayments` does.

**Rules.** No dice (take-up from need and traits, as `decisionLean` does for unemployment claims); one model, two tiers; numbers in the parameter table with sources (USDA FNS FY2026 COLA memo: standard deduction $209 for sizes 1 to 3, minimum benefit $24).

**Done when.** In a one-year run of a drawn place, a named low-income household is paid an allotment on the journal each month; the work requirement (already read where the welfare line pays, PR for `laws-family-assistance-health`) cuts it after three months; a named person's income change moves the amount.

**Files.** a new `src/core2/modules/` engine for programs, `src/core2/law-reach/group-b-money.ts`, `src/core2/data/`.

**Notes.** Unemployment insurance (`src/core2/jobs-benefits.ts`) is the pattern: terms read from the law in force, a payer outside the town, a claim row per case.
