---
id: research-core-sourced-parameters
title: "Research: sourced parameters for closeness, emotion, free time, policy authority, recalls and renewal"
area: core
kind: research
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: "collapsed Oct 19, 2026 from core-stopgap-closeness-relationship-closeness-model, core-stopgap-emotion-estimated-behavior, core-stopgap-free-block-behavior-model-gap, core-stopgap-policy-authority-missing-mechanic, core-stopgap-recalls-assumed-data, core-stopgap-renewal-opening-prehistory-estimate"
---

**What.** Source the numbers behind closeness, emotion, free time, policy authority, recalls and renewal. Each row below is a registered stopgap whose replacement waits on sourced or estimated data, collapsed here from 6 pool item(s) on Oct 19, 2026 so one researcher takes the engine family at once. For each row, find a public source with a year and a unit, record the figure as a SOURCED or ESTIMATED parameter row with a citation and a spread, put the research file under data/research/core/ with a reader, and resolve the stopgap row. Where a row's replacement is a mechanic rather than a number, source what that mechanic will read and leave the mechanic to the area's builder (name the pool item in the PR).

- `SG-P15-closeness-model` in src/core2/data/closeness.json: Closeness is hours together over hours plus a sourced half-closeness point, fading by a tunable half-life; opening closeness uses the average GSS visit rate for the tie and a registered conversion of answer categories to visits, not each pair's history. Replacement: Closeness calibrated against a panel of measured tie strength and contact (for example, the Roberts and Dunbar network data or a US panel), with per-pair opening histories from the shared past.
- `SG-P8-emotion-model` in src/core2/emotion.ts: Simplified affine mood/stress appraisal and exponential recovery, rather than a clinically calibrated model. Replacement: A source-calibrated actor-specific affect model checked against documented adult trajectories.
- `SG-P15-free-block-plan` in src/core2/free-block.ts: A person's free hours are filled from one scoring pass per activation: at most one act per need each day, and every act after the activation's own pick must score above zero. Replacement: A complete daily time budget that reserves the ATUS time of activities the game does not model, needs that evolve on each planned day from their own causes, and plans saved with the world. (parameter rows: src/core2/data/parameters.json:unmodeledLeisureValuePerHour)
- `SG-GOV-policy-power-conditions` in src/core2/policy-authority.ts: Inherited game-profile powers cells are provisional estimates; a cell explicitly marked limited retains a disputed grant while its qualitative conditions are not yet all executable predicates. Replacement: Sourced per-place cells and structured conditions for each limited power, evaluated by the same authority reader before introduction or an executive order.
- `SG-GOV-recall-bars-national` in src/core2/modules/recalls.ts: One national bar on when a local recall may start (not in a term's first 180 days; not again in a term after one failed), not each state's own statute. Replacement: Each state's recall timing bars read into the municipal rule pack and resolved like its threshold and window.
- `SG-M1-opening-pregnancies` in src/core2/modules/renewal.ts: Opening still-pregnant plans use current opening money, housing, health and temperament as pre-opening proxies, with real recorded partnership and child dates. Replacement: OPUS-PEOPLE dated lived pregnancy/resource/medical history, or a finisher/CTO accepted reconstruction with validated first-year calibration.

**Rules.** Research before building: real data checks the simulation and never decides an outcome by itself; a sourced rate calibrates the band the proof reports against, never the chance one person acts. Estimate, never UNKNOWN: a value the source lacks for a place starts from the real average with a per-world spread, marked ESTIMATED with its source in data, never shown to the player. One rule, all 56 places: a figure that varies by place is a per-place table in data, never a state named in logic. Sliding scales and causes: if an engine reads the number as a cap, a cutoff or a chance, file a bug for the builder instead of sourcing it. Follow .agents/skills/researcher/SKILL.md.

**Done when.** Each listed row is SOURCED or ESTIMATED in its parameter table with a citation (publisher, year, URL) and a spread (low, high, unit, citation); each stopgap row above is resolved in src/core2/data/stopgaps.json with the source named; the research-data-reader guard (tests/guards/research-data-has-reader.test.ts) is green; the tripwire and calibration-guard tests pass; and a one-year played world (buildBenchWorld, a drawn place from all 56, seed named in the PR) reports each band and where the town landed.

**Files.** src/core2/data/closeness.json, src/core2/emotion.ts, src/core2/free-block.ts, src/core2/modules/recalls.ts, src/core2/modules/renewal.ts, src/core2/policy-authority.ts, src/core2/data/parameters.json, src/core2/data/stopgaps.json, data/research/core/

**Notes.** Folded from: core-stopgap-closeness-relationship-closeness-model, core-stopgap-emotion-estimated-behavior, core-stopgap-free-block-behavior-model-gap, core-stopgap-policy-authority-missing-mechanic, core-stopgap-recalls-assumed-data, core-stopgap-renewal-opening-prehistory-estimate. Rows that are not numbers (missing mechanics in law reach, for example) stay registered; this item sources what they will read.
