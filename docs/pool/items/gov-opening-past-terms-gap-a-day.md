---
id: gov-opening-past-terms-gap-a-day
title: "An officeholder's past terms at the opening leave a one-day gap before the next term"
area: office
kind: bug
priority: 2
size: S
status: claimed
claimed-by: claude/past-terms-gap
pr:
blocked-on:
after:
source: added by EFFECT-WEB-WIRING
claimed-at: 2026-10-24T19:32:18.491Z
---

**What.** Golden-path spec M2-01 (`src/core2/offices.test.ts`, "holders at the opening have careers of real length") fails on main in Red Rock, Arizona, with seed 76d6558c17b583ec14bfc933608c53c6522e93054eab97dcb5bee8d8525164e0 and place key 0459760. At line 211 a past term ends on 2011-01-03 while the next one starts on 2011-01-02, so the opening's record of a holder's career has a one-day overlap or gap. Find where the opening writes past terms and make each end exactly where the next begins, for every place.

**Rules.** One rule, all 56 places; never narrow the test or pick a seed that passes.

**Done when.** The offices test passes on that seed and on three fresh seeds in a drawn place each, and the golden-path runner on the fix branch shows M2-01 passed.

**Files.** src/core2/offices.test.ts, the opening's office-history writer.

October 24, 2026 (claude, claude/past-terms-gap): does not reproduce; no code change. Measured: src/core2/offices.test.ts passes, all 6 tests, with GOLDEN_PATH_SEED=76d6558c17b583ec14bfc933608c53c6522e93054eab97dcb5bee8d8525164e0 and GOLDEN_PATH_PLACE_KEY=0459760 (Red Rock, Arizona) on main at 2026-10-24 (a59e54a8d8), and also at a035fded89, the commit that filed this item. It passes on three fresh seeds (75427323332448016dfe9797cd4eb6a552c384938af358af253535799c3f44a4, a94aaef2fd25d9c49d0556bac867ee6f21b70a53c85538e00c4eda5fb0dd1d91, e7b97cbcb23698f0489f95f185bbe48ad6e363cde6406048b4ea3b1401ac805e). The golden-path runner, limited to M2-01, shows it passed in Oakvale, West Virginia (seed bce2bc7657df3e95c2dc98794023f2ddd943d276cabd550c9c309746b917fb46). The commit the failure was seen on is not named in this item, so which change removed it was not traced.
