---
id: research-legislature-sourced-parameters
title: "Research: sourced parameters for the legislature and executive proposals"
area: gov
kind: research
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: "collapsed Oct 19, 2026 from gov-stopgap-executive-proposal-assumed-data, gov-stopgap-legislature-assumed-data, gov-stopgap-legislature-estimated-rule"
claimed-at:
---

**What.** Apply the estimated rows in docs/research/pool-feeder-oct20/research-legislature-sourced-parameters.md to the legislature data and resolve the three stopgap rows listed below. Add the per-place executive-proposal mode, the per-place enacting clause and numbering pattern, and the per-chamber committee appointer and size to the data files, tag each ESTIMATED with its source and spread, and have proposalRight, the bill-numbering code and committee seating read them. No row has a measured source: the Oct 19 file records them as low confidence, so keep each as a registered ESTIMATE and add charter-level research to the pool rather than guessing further.

- `SG-GOV-local-executive-proposal` in src/core2/data/legislature/executive-proposal.json: One national rule for how a mayor or county executive brings a bill of their own: through a member who carries it at their request. Replacement: Per-city and per-county charter research on who may introduce legislation, read by proposalRight.
- `SG-GOV-local-bill-numbering` in src/core2/modules/legislature.ts: Every town's and county's body numbers its ordinances the same way, by the year and order of introduction ("2026-12"), and opens them with the same 'Be it ordained by' clause, not each place's own style. Replacement: Each place's ordinance numbering and enacting clause read from its code of ordinances into the municipal rule pack, the way its recall rules are.
- `SG-GOV-committee-structure` in src/core2/modules/legislature.ts: Committee seats go to each party's most senior members by the chamber's party ratio; real committees are appointed by the presiding officer or a committee on committees. Replacement: Leadership appoints committee members (leadership races and chamber leadership research, #3788's chamber-leadership.json).

**Rules.** Research before building: the sourced figures calibrate the bands the proof reports against and never decide what one person, business or official does. Estimate, never UNKNOWN: any value a source lacks for a place starts from the real national average with a stated spread and is tagged ESTIMATED, never shown to the player. One rule, all 56 places: a figure that varies by place is a per-place table in data keyed by place code, and no state, city or GEOID is named in logic. No dice: a real rate may check a town's total after a year, but it must never pick one actor's outcome; if an engine would read a number as a chance, file a bug instead of wiring it.

**Done when.** Each row is tagged SOURCED or ESTIMATED in its parameter table with a citation and spread, the stopgap rows are resolved (or kept with a stated reason) in src/core2/data/stopgaps.json, the research-data-reader guard and the tripwire test pass, and a one-year played world (buildBenchWorld, a drawn place from all 56, seed named in the PR) reports each band and where the town landed.

**Files.** src/core2/data/legislature/executive-proposal.json, src/core2/data/legislature/enacting-clauses.json, src/core2/data/legislature/committees.json, src/core2/modules/legislature.ts, src/core2/data/parameters.json, src/core2/data/stopgaps.json, docs/research/pool-feeder-oct20/research-legislature-sourced-parameters.md

**Notes.** Folded from: gov-stopgap-executive-proposal-assumed-data, gov-stopgap-legislature-assumed-data, gov-stopgap-legislature-estimated-rule. Rows that are not numbers (missing mechanics in law reach, for example) stay registered; this item sources what they will read. Oct 20 (pool feeder): research done in docs/research/pool-feeder-oct20/research-legislature-sourced-parameters.md (3 rows: 0 sourced, 3 estimated, 0 mechanic).
