---
id: gov-stopgap-central-bank-appointments-faked-mechanic
title: "Stopgaps in central-bank-appointments (faked-mechanic): 1 open"
area: gov
kind: stopgap
priority: 2
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/central-bank-appointments.ts, kind faked-mechanic"
---

**What.** Replace or clear the 1 open faked-mechanic stopgap row(s) in src/core2/central-bank-appointments.ts: SG-WORLD-board-appointments. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/central-bank-appointments.ts

**Notes.** First row: A seat's new member is the seeded candidate whose lived inflation sits closest to the board's middle, chosen without the president or the Senate.
