---
id: world-federal-case-stream-part-1-federal-offense-case-data
title: "Sourced federal offense, charge and sentencing data as rows"
area: world
kind: research
priority: 3
size: M
status: dropped
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: laws-effects
model: sonnet
effort: medium
root: rc1-world-outside-town
source: split from world-federal-case-stream in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
---

**What.** The justice engine has state sentence ranges for ordinary cases and nothing for federal cases. Before any engine work, add the data: federal arrests and charges by offense, federal sentencing ranges and the mandatory minimums that bind federal drug and firearm offenses, sized from the U.S. Sentencing Commission, each row with its citation and spread. The Bureau of Prisons offense file already in the repository (data/research/justice/bop-federal-offenses-2026.json) is the starting point for the custody side.

**Cause.** Design: the one-engine-per-mechanic rule in AGENTS.md (Oct 27) and docs/design/country-tier.md; src/core2/modules/justice.ts holds no federal data.

**Fix.** Add a Sentencing Commission file (data/research/justice/ussc-federal-sentencing.json, new) and a loader beside the existing justice data, every row tagged SOURCED or ESTIMATED with citation and spread.

**Time box.** 6 hours for one session of the Sonnet model. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Research before building: real data fills the table and decides no outcome by itself. Every number lives in a parameter table tagged SOURCED, ESTIMATED or TUNABLE. One engine: the data is rows the one justice engine reads, with the level as data.

**Done when.** A second session (not the builder) opens the data in a drawn place's world (place named), picks three offenses and sees each with a citation, a spread and its sentencing range and mandatory minimum where one applies; a test in src/core2 fails when a row lacks its source or spread.

**Waits on.** Nothing.

**Files.** data/research/justice/ussc-federal-sentencing.json (new), data/research/justice/bop-federal-offenses-2026.json, src/core2/modules/justice.ts

**Notes (Fable's check, Nov 10, proposed for the CTO).** Proposed: drop as replaced. The federal courts were built on Nov 8 as results and counts in src/core2/modules/federal-courts.ts, from the Sentencing Commission file data/research/justice/ussc-federal-sentencing-fy2025.json and the Bureau of Prisons table, and that engine already reads the reduce-mandatory-minimums law in force. What is left (a federal case, defendant and sentence built when someone opens one, the door that opens it, and the proof against the Bureau's table) is justice-federal-case-stream with its two parts, justice-federal-case-stream-part-1-case-on-open and justice-federal-case-stream-part-2-door-and-proof. This item's plan (a new data file, then cases kept for everyone through justice.ts) is the design the country tier replaced.

**Notes (CTO, Nov 10).** Dropped on Fable's full check (`docs/pool/redo-2026-11-10/checked.md`): Replaced by work on main and by justice-federal-case-stream.
