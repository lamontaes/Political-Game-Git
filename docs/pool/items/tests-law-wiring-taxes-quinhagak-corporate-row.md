---
id: tests-law-wiring-taxes-quinhagak-corporate-row
title: "Tax wiring test has no corporate-income-tax applied row in Quinhagak, Alaska"
area: laws
kind: bug
priority: 2
size: S
status: done
claimed-by: claude/quinhagak-corp
pr: #6372
blocked-on:
source: Merger 3 paired clean-main check on PR #6207, October 27
claimed-at: 2026-10-27T17:59:34.951Z
---

**What.** The changed tax-law test on PR #6207 failed in Quinhagak, Alaska (0264600), on GOLDEN_PATH_SEED=29d2c0825b8a100ebbbc50b0836f8dae4fafd192 because corporate-income-tax had no applied record after play. The exact seed and original test fail identically on clean main fd775f578926bb314445fc76e021b7412d2fd982, while the separate arrears case passes in St. George, West Virginia. This is a baseline acceptance gap, separate from Greenville's pension-law reapplication repair. Trace the missing corporate-tax subject or reader through the ordinary generated world and preserve the positive tax/payment assertions.

**Rules.** No dice: establish taxable profits, the governing law and its actual reader from generated-world records rather than inventing a payment or choosing an outcome. One rule, all 56 places: retain the named regression beside a fresh drawn-place case and report every legitimate redraw. Do not skip a failed assertion, accept an empty set, or loosen the requirement for a positive applied row. Time box: 3 hours, Sonnet, no helpers.

**Done when.** GOLDEN_PATH_SEED=29d2c0825b8a100ebbbc50b0836f8dae4fafd192 passes src/core2/law-wiring-taxes.test.ts in the ordinary generated world, with the corporate-income-tax law, reached organization, applied record id and journal posting named. A fresh drawn place also passes, with place and seed reported. Explain any legitimate no-subject redraw from its opening records, and retain the positive payment and repeal assertions.

**Files.** src/core2/law-wiring-taxes.test.ts, src/core2/modules/employer-taxes.ts, src/core2/law-reach

**Notes.** Own branch run: 1 PASS, 1 FAIL, 58.67s; matched clean main: 1 PASS, 1 FAIL, 57.78s. Both report the same missing corporate-income-tax applied record. Not a regression attributed to PR #6207.
