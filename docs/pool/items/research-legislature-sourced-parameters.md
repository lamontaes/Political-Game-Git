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
---

**What.** Source the numbers behind the legislature and executive proposals. Each row below is a registered stopgap whose replacement waits on sourced or estimated data, collapsed here from 3 pool item(s) on Oct 19, 2026 so one researcher takes the engine family at once. For each row, find a public source with a year and a unit, record the figure as a SOURCED or ESTIMATED parameter row with a citation and a spread, put the research file under data/research/gov/ with a reader, and resolve the stopgap row. Where a row's replacement is a mechanic rather than a number, source what that mechanic will read and leave the mechanic to the area's builder (name the pool item in the PR).

- `SG-GOV-local-executive-proposal` in src/core2/data/legislature/executive-proposal.json: One national rule for how a mayor or county executive brings a bill of their own: through a member who carries it at their request. Replacement: Per-city and per-county charter research on who may introduce legislation, read by proposalRight.
- `SG-GOV-local-bill-numbering` in src/core2/modules/legislature.ts: Every town's and county's body numbers its ordinances the same way, by the year and order of introduction ("2026-12"), and opens them with the same 'Be it ordained by' clause, not each place's own style. Replacement: Each place's ordinance numbering and enacting clause read from its code of ordinances into the municipal rule pack, the way its recall rules are.
- `SG-GOV-committee-structure` in src/core2/modules/legislature.ts: Committee seats go to each party's most senior members by the chamber's party ratio; real committees are appointed by the presiding officer or a committee on committees. Replacement: Leadership appoints committee members (leadership races and chamber leadership research, #3788's chamber-leadership.json).

**Rules.** Research before building: real data checks the simulation and never decides an outcome by itself; a sourced rate calibrates the band the proof reports against, never the chance one person acts. Estimate, never UNKNOWN: a value the source lacks for a place starts from the real average with a per-world spread, marked ESTIMATED with its source in data, never shown to the player. One rule, all 56 places: a figure that varies by place is a per-place table in data, never a state named in logic. Sliding scales and causes: if an engine reads the number as a cap, a cutoff or a chance, file a bug for the builder instead of sourcing it. Follow .agents/skills/researcher/SKILL.md.

**Done when.** Each listed row is SOURCED or ESTIMATED in its parameter table with a citation (publisher, year, URL) and a spread (low, high, unit, citation); each stopgap row above is resolved in src/core2/data/stopgaps.json with the source named; the research-data-reader guard (tests/guards/research-data-has-reader.test.ts) is green; the tripwire and calibration-guard tests pass; and a one-year played world (buildBenchWorld, a drawn place from all 56, seed named in the PR) reports each band and where the town landed.

**Files.** src/core2/data/legislature/executive-proposal.json, src/core2/modules/legislature.ts, src/core2/data/parameters.json, src/core2/data/stopgaps.json, data/research/gov/

**Notes.** Folded from: gov-stopgap-executive-proposal-assumed-data, gov-stopgap-legislature-assumed-data, gov-stopgap-legislature-estimated-rule. Rows that are not numbers (missing mechanics in law reach, for example) stay registered; this item sources what they will read.
