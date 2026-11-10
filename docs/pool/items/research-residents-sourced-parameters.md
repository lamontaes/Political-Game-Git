---
id: research-residents-sourced-parameters
title: "Research: sourced parameters for residents' cadence, district placement and employment"
area: people
kind: research
priority: 3
size: M
status: open
claimed-by:
pr: #5690
blocked-on: researcher: per-place or calibration sourcing, each row cited; first row's replacement: Valid county B23001 civilian employed/resident-age observations, suppression/MOE handling and territorial equivalents. (parameter
source: "collapsed Oct 19, 2026 from people-stopgap-resident-employment-missing-local-observation, people-stopgap-residents-aggregate-cadence, people-stopgap-residents-assumed-data"
claimed-at:
standard: 2
model: sonnet
effort: medium
root: none
lead: researcher
after:
---

**What.** Source the numbers behind residents' employment. Each row below is a registered stopgap whose replacement waits on sourced or estimated data. For each row, find a public source with a year and a unit, record the figure as a SOURCED or ESTIMATED parameter row with a citation and a spread, put the research file under data/research/people/ with a reader, and resolve the stopgap row. Where a row's replacement is a mechanic rather than a number, source what that mechanic will read and leave the mechanic to the area's builder, naming the pool item in the PR. Only the employment-proxy row remains here. The cadence and district-placement rows moved to research-residents-cadence-sourced and research-residents-district-placement-sourced and are left out of the list below, and research-residents-employment-island-areas holds the island areas' own employment-by-age tables. The earlier pull request delivered only the county observations (src/core2/data/resident-employment-counties.json). The employment proxy uses national CPS age ratios where county ACS cells are missing or suppressed.

- `SG-P8-resident-employment-proxy` in src/core2/data/resident-employment.json: Uses national pre-opening CPS age ratios and a tunable local scale when actual county ACS cells are unavailable. Replacement: Valid county B23001 civilian employed/resident-age observations, suppression/MOE handling and territorial equivalents. (parameter rows: src/core2/data/parameters.json:openingMissingCountyEmploymentScale)

**Cause.** Design: each stopgap row named below is still open in its family file under src/core2/data/stopgaps/ and waits on sourced data. The rule is AGENTS.md "Placeholders" (every shortcut registered, every number tagged SOURCED, ESTIMATED or TUNABLE), and the research is in docs/research/pool-feeder-oct20/research-residents-sourced-parameters.md.

**Fix.** Source territorial and suppressed-cell equivalents for ACS B23001 and replace openingMissingCountyEmploymentScale, or keep it ESTIMATED with its spread.

**Time box.** 4 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note and stop.

**Rules.** Research before building: real data checks the simulation and never decides an outcome by itself; a sourced rate calibrates the band the proof reports against, never the chance one person acts. Estimate, never UNKNOWN: a value the source lacks for a place starts from the real average with a per-world spread, marked ESTIMATED with its source in data, never shown to the player. One rule, all 56 places: a figure that varies by place is a per-place table in data, never a state named in logic. Sliding scales and causes: if an engine reads the number as a cap, a cutoff or a chance, file a bug for the builder instead of sourcing it. Follow .agents/skills/researcher/SKILL.md.

**Done when.** A second session reads the parameter tables for the territorial and suppressed-cell equivalents for B23001 and finds each SOURCED or ESTIMATED with a citation (publisher, year, URL) and a spread (low, high, unit, citation). In a one-year played world (buildBenchWorld, a drawn place from all 56, seed named in the PR) it sees the engine read each new value by record id, with where the town landed reported next to the real figure; the real figure is reported only and is not a pass mark. Each stopgap row this item takes is resolved in its family file under src/core2/data/stopgaps/ with the source named, or stays open with its replacement naming the research file, the estimate's source and spread, and the item that would close it. tests/guards/research-data-has-reader.test.ts and the tripwire and calibration-guard tests pass.

**Waits on.** Nothing.

**Files.** src/core2/data/resident-employment.json, src/core2/modules/residents.ts, src/core2/residents.ts, src/core2/data/parameters.json, src/core2/data/stopgaps/p8.json, data/research/people/

**Notes.** Folded from: people-stopgap-resident-employment-missing-local-observation, people-stopgap-residents-aggregate-cadence, people-stopgap-residents-assumed-data. Rows that are not numbers (missing mechanics in law reach, for example) stay registered; this item sources what they will read.

Sent back 2026-10-20 from PR #5690 (branch claude/residents-county-employment): prettier fails on src/core2/data/resident-employment-counties.json (format it or add it to .prettierignore if generated); finish on that branch, merge main into it first.

**Remaining rows (repaired Oct 20).** PR #5690 delivered only the county-employment part (the employment-by-county observations and the file `src/core2/data/resident-employment-counties.json`); `SG-P8-resident-employment-proxy`, `SG-CORE-residents-cadence` and `SG-CORE-district-placement` are all still open in `src/core2/data/stopgaps.json`. The rest is tracked as: `research-residents-employment-island-areas` (the island areas' own employment-by-age tables), `research-residents-cadence-sourced` (spending and pay timing, absence and turnover) and `research-residents-district-placement-sourced` (district mixes; open PR #5698). Each carries the original requirements: a cited SOURCED or ESTIMATED row with a spread, a research file with a reader, the stopgap row resolved, and a played-world band report.

Sent back 2026-10-23 from PR #5698 (branch claude/district-placement): Current main conflicts in src/core2/modules/residents.ts; preserve both counted-resident readers and district placement, then rerun the drawn split-town proof; finish on that branch, merge main into it first.

Sent back 2026-10-23 from PR #5698 (branch claude/district-placement): Conflict repaired, but PR body lacks the required Done-when evidence table and names only opening placement rather than the specified one-year band report; supply applicable evidence or a completed bounded placement item while keeping wider research open; finish on that branch, merge main into it first.

Deferred Oct 25: nothing on screen reads it yet.
