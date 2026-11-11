---
id: gov-stopgap-justice-law-missing-data
title: "Stopgaps in justice-law (missing-data): 1 open"
area: gov
kind: stopgap
priority: 3
status: in-pr
claimed-by: claude/pool-gov-stopgap-justice-law-missing-data
pr: #8560
blocked-on:
milestone:
standard: 2
lead: governing
model: sonnet
effort: medium
root: rc9-place-facts-one-default
source: "src/core2/data/stopgaps.json, src/core2/justice-law.ts, kind missing-data"
claimed-at: 2026-11-11T04:08:19.581Z
after:
size: S
checked: fable 2026-11-10
---

**What.** Replace or clear the one open missing-data stopgap row in src/core2/justice-law.ts: SG-GOV-justice-prosecutor-stand-in. The fake is replaced by the mechanic, or the feature that needs it is deleted. The row is never closed by deleting it alone.

**Cause.** Found in code: src/core2/justice-law.ts lines 102-103 register SG-GOV-justice-prosecutor-stand-in for a state prosecutor's office where the offices data names neither a covering county prosecutor nor an elected attorney general.

**Fix.** Seat the real prosecuting office for places with no county prosecutor or elected attorney general (an appointed attorney general or the data's equivalent), read from the offices data, and show a justice case consuming it in a one-year run by record id.

**Time box.** 4 hours for one Sonnet session. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** No dice. Registered stopgaps: never close a row by deleting it. Replace, never layer. Numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE). An effect is a read, not a record: the seated office counts only when the justice engine reads it.

**Done when.** A second session finds SG-GOV-justice-prosecutor-stand-in resolved in src/core2/data/stopgaps/gov.json and, in a one-year played-world run in a drawn place (seed named) with no county prosecutor or elected attorney general, a justice case prosecuted by the seated office, by record id.

**Waits on.** Nothing.

**Files.** src/core2/justice-law.ts, src/core2/data/stopgaps/gov.json

**Notes.** First row: A state prosecutor's office where the offices data has neither a county prosecutor covering the town nor an elected attorney general.

Sent back 2026-10-21 from PR #5317 (branch claude/pool-appointed-ag): The opening-only appointed-AG test and PR body lack the required one-year played-world justice-case consumption proof, by record id.; finish on that branch, merge main into it first.
