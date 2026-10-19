---
id: core-census-weight-money
title: "Counted money flows are scaled by the household weight"
area: core
kind: feature
priority: 1
size: M
status: done
claimed-by: claude/core-census-weight-money
pr: #4467
blocked-on: core-census-weight-model
milestone:
source: "split of core-town-size-census (L): owner ruling core-od-town-size, OWNER-DECISIONS.md"
claimed-at: 2026-10-15T21:50:47.447Z
---

**What.** Every dated flow a counted household makes (pay, benefits, rent, purchases, retirement income, taxes) moves through the one journal times its weight, so a town of millions has its real payroll, rent and tax receipts.

**Rules.** One model, two tiers (a counted group is read by every engine with the same rule as a full person, times its count); no dice; one rule, all 56 places; an effect is a read; speed (a year under two minutes, no more than 20% slower than base); replace, never layer.

**Done when.** In a one-year run of a drawn place above 10,000, the town's counted payroll, rent and withholding equal the per-household amounts times the weights, every dollar balances, and a town at or below 10,000 gives identical cash to base. Named by journal record id.

**Files.** src/core2/counted-money.ts, src/core2/modules/residents.ts, src/core2/residents.ts

**Notes.** Found by the session that claimed core-town-size-census: the cap is `Math.min(target, real)` in `buildPopulation` (`src/core2/population.ts`, about line 507) with `targetPopulation` = 10,000 in `src/core2/data/parameters.json`. A town is generated one household and one person record at a time (about 12 s and 1.4 GB for 10,000), and counted groups keep one index per household (`src/core2/counted-groups.ts`), so a city of millions cannot open by raising the target. The design the ruling points at: each counted household record carries a weight (how many real households it stands for) and every reader multiplies by it.

Session handed off Oct 15, 2026: branch pool/core-census-weight-money has one WIP commit (df32a77: counted-money.ts flows times the household weight, residents.ts, counted-weight-money.test.ts), no PR; remainder: finish the money readers (credit-deposits, housing-foreclosure arrears, housing-homeless rent list, departure and arrival cash shares), run the weight 1 versus 3 played-year proof, open the PR.
