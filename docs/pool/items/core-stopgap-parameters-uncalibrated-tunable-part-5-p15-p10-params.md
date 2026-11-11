---
id: core-stopgap-parameters-uncalibrated-tunable-part-5-p15-p10-params
title: "Narrow the P15 and P10 uncalibrated parameter rows to the ones still unsourced"
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

**What.** Source or calibrate the values behind these open stopgap rows: SG-P15-params-uncalibrated (kin and temperament generation coefficients, parameters.json line 1442) and SG-P10-params-uncalibrated (drive, perception, response and event-severity coefficients, line 4733). For each, find the real figure or the check it must reproduce in total, tag the value SOURCED, ESTIMATED or TUNABLE with its spread in src/core2/data/parameters.json, and resolve the row naming the engine that reads it. This is part 5 of core-stopgap-parameters-uncalibrated-tunable.

**Cause.** Found in code: the rows SG-P15-params-uncalibrated (kin and temperament generation coefficients, parameters.json line 1442) and SG-P10-params-uncalibrated (drive, perception, response and event-severity coefficients, line 4733) are open in the stopgap family files under src/core2/data/stopgaps/ with their values in src/core2/data/parameters.json, read by the people generation and drives engines; each is a prototype value with no source.

**Fix.** For each row: name the source or the total check, set the tag and spread in parameters.json, change the engine to read the tagged value if it does not, and resolve the row. Where no source exists, tag ESTIMATED from the nearest sourced figure with its spread and say so.

**Time box.** 4 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Never close a row by deleting it. Research before building: real data checks the simulation and never decides one actor's outcome. No dice. Every number lives in a parameter table, tagged SOURCED (with citation), ESTIMATED (with source and spread) or TUNABLE (with the spread it is checked against). Wire to the world: the engine that reads the parameter is shown reading it in a played year.

**Done when.** A second session, not the builder, plays a one-year buildBenchWorld in a drawn place (place and seed named) and opens the engine that reads each parameter: the value shows its tag and spread, the engine reads it by record id, and the rows (SG-P15-params-uncalibrated (kin and temperament generation coefficients, parameters.json line 1442) and SG-P10-params-uncalibrated (drive, perception, response and event-severity coefficients, line 4733)) are resolved in their family file.

**Waits on.** Nothing.

**Files.** src/core2/data/parameters.json, src/core2/data/stopgaps/p15.json, src/core2/data/stopgaps/p10.json

Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). It would have sourced two groups of generation and response coefficients; the numbers stay estimates, and no player sees them.
