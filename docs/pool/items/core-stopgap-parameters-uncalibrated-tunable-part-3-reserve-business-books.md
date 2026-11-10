---
id: core-stopgap-parameters-uncalibrated-tunable-part-3-reserve-business-books
title: "Source the organization reserve months and the business books dynamics"
area: core
kind: stopgap
priority: 3
size: M
status: dropped
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: researcher
model: opus
effort: medium
root: none
source: split from core-stopgap-parameters-uncalibrated-tunable in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
---

**What.** Source or calibrate the values behind these open stopgap rows: SG-P8-param-organizationReserveMonths and SG-P8-business-books-dynamics. For each, find the real figure or the check it must reproduce in total, tag the value SOURCED, ESTIMATED or TUNABLE with its spread in src/core2/data/parameters.json, and resolve the row naming the engine that reads it. This is part 3 of core-stopgap-parameters-uncalibrated-tunable.

**Cause.** Found in code: the rows SG-P8-param-organizationReserveMonths and SG-P8-business-books-dynamics are open in the stopgap family files under src/core2/data/stopgaps/ with their values in src/core2/data/parameters.json (named as the row id minus its SG-P8-param- prefix, for example `needWeight` for SG-P8-param-needWeight), read by the business engine in src/core2/modules/business.ts; each is a prototype value with no source.

**Fix.** For each row: name the source or the total check, set the tag and spread in parameters.json, change the engine to read the tagged value if it does not, and resolve the row. Where no source exists, tag ESTIMATED from the nearest sourced figure with its spread and say so.

**Time box.** 3 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Never close a row by deleting it. Research before building: real data checks the simulation and never decides one actor's outcome. No dice. Every number lives in a parameter table, tagged SOURCED (with citation), ESTIMATED (with source and spread) or TUNABLE (with the spread it is checked against). Wire to the world: the engine that reads the parameter is shown reading it in a played year.

**Done when.** A second session, not the builder, plays a one-year buildBenchWorld in a drawn place (place and seed named) and opens the engine that reads each parameter: the value shows its tag and spread, the engine reads it by record id, and the rows (SG-P8-param-organizationReserveMonths and SG-P8-business-books-dynamics) are resolved in their family file.

**Waits on.** Nothing.

**Files.** src/core2/data/parameters.json, src/core2/data/stopgaps/p8.json, src/core2/modules/business.ts

Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). It would have sourced two business parameters; the numbers stay estimates, and no player sees them.
