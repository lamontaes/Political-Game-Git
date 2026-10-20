---
id: core-stopgap-life-contact-frequency-logic-gap
title: "Stopgaps in life (contact-frequency-logic-gap): 1 open"
area: core
kind: stopgap
priority: 3
status: open
claimed-by:
pr: #5281
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/modules/life.ts, kind contact-frequency-logic-gap"
claimed-at:
---

**What.** Replace or clear the 1 open contact-frequency-logic-gap stopgap row(s) in src/core2/modules/life.ts: SG-P8-school-acquaintance-contact-frequency. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/modules/life.ts

**Notes.** First row: Recognized historical school peers receive routine contact opportunities without a tie-type contact-frequency model or recorded present-day availability.

Sent back Oct 20 from PR #5281 (claude/pool-contact-measured): `src/core2/life-contact-frequency.test.ts` failed on drawn place Mount Vernon, Kentucky (seed `d9a933c1c96657eb7386428c2c7203a137d18d1a`): expected 158 to be less than 88.75. A non-household acquaintance had 158 contact days across 355 days (`others: 8,7,7,1,7,158,7,1,1,2,1,1,1,1,1`), violating `expect(n).toBeLessThan(DAYS / 4)`.

