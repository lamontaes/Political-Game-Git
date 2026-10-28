---
id: laws-unemployment-share-basis-mt-co
title: "Two states' unemployment rows pay about half the benefit their law gives (fraction and basis quarters mismatched)"
area: laws
lead: laws
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: "Traits lead, Oct 28 (research-unemployment-claim-take-up)"
---

**What.** `unemploymentTerms` (src/core2/jobs-benefits.ts) turns a state's `weeklyBenefitFraction` and `weeklyBenefitBasisQuarters` from `src/core2/data/laws/starting-law.json` into the share of weekly pay the benefit replaces. Two rows pair a fraction with the wrong basis. Montana's text reads "1% BPW or 1.9% of wages in 2 HQs", but the row stores 0.01 with 2 quarters, so the benefit is 26% of pay instead of about 50%. Colorado's text reads "60% of 1/26 of 2 consecutive HQW", but the row stores 0.011538 with 2 quarters, so the benefit is 30% of pay instead of 60%. Every other state's row lands between 40% and 65% of pay. In a played year in Piltzville, Montana, 2 of 9 laid-off workers filed, against about 75% in other towns.

**Rules.** One rule, all 56 places: the fix is in the data rows, never a state named in logic. Wire to the world: a claim's weekly benefit is paid from the state's fund and reaches the worker's household, so the corrected share must show in a played claim by record id.

**Done when.** The Montana and Colorado `unemployment-insurance` rows in src/core2/data/laws/starting-law.json carry a fraction and basis that match their quoted text (or a weeklyBenefitText-driven reading), a test in src/core2 checks that every jurisdiction's row gives a share of pay between 0.4 and 0.7 or names why, and a played year of `buildBenchWorld` in a drawn Montana or Colorado place (seed named) shows a claim record id whose weekly benefit is about half the lost pay.

**Files.** src/core2/data/laws/starting-law.json, src/core2/jobs-benefits.ts

**Notes.** Found Oct 28 by the traits lead while fitting unemployment take-up (`research-unemployment-claim-take-up`): Piltzville, Montana (3057475, seed b3ab1b16e0f7) reads a 0.26 share. The take-up fit's citation names this item.
