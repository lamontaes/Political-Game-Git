---
id: world-counted-households-transfer-income-part-2-disability-and-survivor-benefits
title: "No one in the game draws disability, SSI or survivor benefits, so households with no earner have no income at all (part 2 of 2)"
area: world
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after: world-counted-households-transfer-income
blocked-on:
lead: money
model: opus
effort: high
root: design-one-model-two-tiers
source: split from world-counted-households-transfer-income by the cause finder, Nov 11, 2026
claimed-at:
---

**What.** Households whose members cannot work, or whose earner died, live on Social Security disability (SSDI), Supplemental Security Income (SSI) or survivor benefits in real life. The game pays only Social Security retirement, so such a household has no income, falls behind on rent and is evicted. In a Puerto Rico town about 40 percent of renter households would have no income once unplaced workers are whole people (world-counted-renter-income-puerto-rico-third). Pay these benefits to full and counted households by one rule, through the engine that already pays retirement. Seen: a renter household's card and the town's evictions and homeless count, where households with no earner are evicted.

**Cause.** Found in code: the only Social Security benefit the game pays is retirement: opening awards (src/core2/data/opening-income.json, kind `retirement`) and claims in play (src/core2/modules/retirement-claims.ts, stand-in SG-CORE-retirement-claims-in-play). data/research/money/public-programs-2026.json holds the 2026 federal figures for Social Security, SSI and the rest, and no code reads it (opus-5234, PR #8704). `householdIncome` in src/core2/modules/residents.ts counts wages, retirement awards and unplaced workers' pay, and nothing else exists to count.

**Fix.** Extend the retirement-award engine instead of starting a new one. (1) At the opening, give an award to each adult the records mark as unable to work or widowed, by the same route that sizes retirement awards: SSDI from covered work (the PIA formula and bend points in public-programs-2026.json), SSI where covered work is short (the federal benefit rate there, plus a state supplement where the file has one), and survivor benefits for a widowed spouse or a child from the dead worker's record. Size who is disabled from the condition records the health engine already keeps (src/core2/condition-pack.ts) and the census disability share. Do not draw it, and register an ESTIMATED parameter with its source. (2) In play, start the same awards when a worker's health record makes them unable to work, or when a household's earner dies (src/core2/modules/health.ts writes both events), as retirement claims start. (3) Counted members receive them by the same rule into their household's income, times its weight. (4) Puerto Rico and the territories have no SSI. Use what the file holds for each, and register a stopgap where it holds nothing. Add a test that names a drawn place and seed and shows a household with no earner receive an award by contract id.

**Time box.** 8 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One model, two tiers: a counted household receives a benefit by the same rule as a full household, times its count. Wire to the world: each payment is a journal record from the place's Social Security payer. Estimate, never UNKNOWN: amounts come from public-programs-2026.json with their sources. No dice: who qualifies follows their health and work records, not a roll. Real shares such as the ACS no-income share are reported, never a target (owner, Nov 8).

**Done when.** A second session (not the builder) plays Puerto Rico place 7237336 (seed 63ef211a72f7f8d3519652d91152eaf5cda51a871ae2bed4e9221c537c7bd2f8) and a drawn state place (seed named), and sees households with no earner receive disability or survivor awards by contract and transfer record ids, pay rent from them and not be evicted on that account. The share of counted renter households with no income on day one is reported beside the ACS share.

**Waits on.** world-counted-households-transfer-income (part 1, the read of assistance already paid).

**Files.** src/core2/modules/retirement-claims.ts, src/core2/data/opening-income.json, src/core2/modules/residents.ts, src/core2/modules/health.ts, src/core2/condition-pack.ts, data/research/money/public-programs-2026.json, src/core2/data/parameters.json

**Notes.** Nov 11 (cause finder for Fable B): split from world-counted-households-transfer-income on opus-5234's finding (PR #8704) that the full tier lacks these benefits too, so this is new work for both tiers, built on the retirement award route.
