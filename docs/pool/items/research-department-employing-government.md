---
id: research-department-employing-government
title: "Research: which government employs each kind of town department, from the Census of Governments employment file"
area: world
kind: research
priority: 3
size: M
status: open
standard: 2
claimed-by:
pr:
blocked-on:
after:
lead: researcher
model: sonnet
effort: medium
root: none
source: stand-in triage T4 (Nov 10, 2026), docs/stopgaps/triage-2026-11-10/world.md
claimed-at:
---

**What.** A town's police, fire, public works and health departments and local government offices are all paid by the town's own government, a state office by its state and a post office by the nation. In real life a county health department, a fire district or a state field office pays its own staff, so the wrong government pays them.

**Cause.** Found in code: src/core2/population.ts line 1174 and src/core2/opening-department-pay.ts line 101 (stopgap SG-WORLD-department-government); `departmentLinkSource` marks the link ESTIMATED because the opening's data does not say which unit employs a department.

**Fix.** Read the Census Bureau's Census of Governments employment file by function and government type, quote it from a fetched page, and build a table of the share of each function's staff that each government type employs (county, municipality, township, special district, state), tagged SOURCED with its citation. Record it in data/research/world/ and say what a later build step must read to pay each department from the right government.

**Time box.** 5 hours for one Sonnet session.

**Rules.** Research calibrates the simulation, never decides an outcome. One rule, all 56 places: the table is data and names no state or place.

**Done when.** A second session (not the builder) finds the table with its publisher, year, unit, URL and a spread, checks three functions against the fetched page, plays a one-year world (`buildBenchWorld`) in a drawn place (seed named in the PR body) and sees which government's treasury pays its fire department today, and reads the stopgap row's replacement pointing at the table.

**Waits on.** Nothing.

**Files.** src/core2/opening-department-pay.ts, src/core2/population.ts, src/core2/data/stopgaps/world.json
