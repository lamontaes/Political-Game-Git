---
id: gov-opening-past-terms-gap-a-day
title: "An officeholder's past terms at the opening leave a one-day gap before the next term"
area: office
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
after:
source: added by EFFECT-WEB-WIRING
---

**What.** Golden-path spec M2-01 (`src/core2/offices.test.ts`, "holders at the opening have careers of real length") fails on main in Red Rock, Arizona, with seed 76d6558c17b583ec14bfc933608c53c6522e93054eab97dcb5bee8d8525164e0 and place key 0459760. At line 211 a past term ends on 2011-01-03 while the next one starts on 2011-01-02, so the opening's record of a holder's career has a one-day overlap or gap. Find where the opening writes past terms and make each end exactly where the next begins, for every place.

**Rules.** One rule, all 56 places; never narrow the test or pick a seed that passes.

**Done when.** M2-01 passes on that seed and on fresh random seeds, and the golden-path runner shows M2-01 passed.

**Files.** src/core2/offices.test.ts, the opening's office-history writer.
