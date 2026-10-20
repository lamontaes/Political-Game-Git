---
id: research-core-sourced-parameters
title: "Research: sourced parameters for closeness, emotion, free time, policy authority, recalls and renewal"
area: core
kind: research
priority: 2
size: M
status: blocked
claimed-by:
pr:
blocked-on:
source: "collapsed Oct 19, 2026 from core-stopgap-closeness-relationship-closeness-model, core-stopgap-emotion-estimated-behavior, core-stopgap-free-block-behavior-model-gap, core-stopgap-policy-authority-missing-mechanic, core-stopgap-recalls-assumed-data, core-stopgap-renewal-opening-prehistory-estimate"
---

**What.** Apply the sourced rows in docs/research/pool-feeder-oct20/research-core-sourced-parameters.md to the parameter table(s) and data files for sourced parameters for closeness, emotion, free time, policy authority, recalls and renewal. Each row already carries a value, a low and high spread, a tag (SOURCED or ESTIMATED) and a citation, so the builder enters them, adds a reader for each research file, and resolves these stopgap rows in src/core2/data/stopgaps.json: SG-P15-closeness-model, SG-P8-emotion-model, SG-P15-free-block-plan, SG-GOV-policy-power-conditions, SG-GOV-recall-bars-national, SG-M1-opening-pregnancies. Rows tagged mechanic name a change the area's builder makes to read the sourced inputs; build the simplest version and register what remains.

Rows:

- `SG-P15-closeness-model` in src/core2/data/closeness.json: Closeness is hours together over hours plus a sourced half-closeness point, fading by a tunable half-life; opening closeness uses the average GSS visit rate for the tie and a registered conversion of answer categories to visits, not each pair's history. Replacement: Closeness calibrated against a panel of measured tie strength and contact (for example, the ...
- `SG-P8-emotion-model` in src/core2/emotion.ts: Simplified affine mood/stress appraisal and exponential recovery, rather than a clinically calibrated model. Replacement: A source-calibrated actor-specific affect model checked against documented adult trajectories.
- `SG-P15-free-block-plan` in src/core2/free-block.ts: A person's free hours are filled from one scoring pass per activation: at most one act per need each day, and every act after the activation's own pick must score above zero. Replacement: A complete daily time budget that reserves the ATUS time of activities the game does not model, needs that evolve on each planned day from their own causes, and plans saved with...
- `SG-GOV-policy-power-conditions` in src/core2/policy-authority.ts: Inherited game-profile powers cells are provisional estimates; a cell explicitly marked limited retains a disputed grant while its qualitative conditions are not yet all executable predicates. Replacement: Sourced per-place cells and structured conditions for each limited power, evaluated by the same authority reader before introduction or an execut...
- `SG-GOV-recall-bars-national` in src/core2/modules/recalls.ts: One national bar on when a local recall may start (not in a term's first 180 days; not again in a term after one failed), not each state's own statute. Replacement: Each state's recall timing bars read into the municipal rule pack and resolved like its threshold and window.
- `SG-M1-opening-pregnancies` in src/core2/modules/renewal.ts: Opening still-pregnant plans use current opening money, housing, health and temperament as pre-opening proxies, with real recorded partnership and child dates. Replacement: OPUS-PEOPLE dated lived pregnancy/resource/medical history, or a finisher/CTO accepted reconstruction with validated first-year calibration.

**Rules.** Research before building: the sourced figures calibrate the totals the proof reports and never decide what one person does. Estimate, never UNKNOWN: any value without a measure keeps its ESTIMATED tag, source and spread. One rule, all 56 places: place values live in data keyed by place code, never named in logic, and the proof draws a random place. No dice: no seeded roll or fixed percentage picks an actor's outcome; causes and records do.

**Done when.** Each row is SOURCED or ESTIMATED in its parameter table with a citation and a spread, the stopgap rows above are resolved in src/core2/data/stopgaps.json (or kept with a reason), the research-data reader guard and the tripwire test pass, and a one-year played world (buildBenchWorld, a place drawn from all 56, seed named) reports each band and where the town landed against it.

**Files.** src/core2/data/closeness.json, src/core2/emotion.ts, src/core2/free-block.ts, src/core2/modules/recalls.ts, src/core2/modules/renewal.ts, src/core2/policy-authority.ts, src/core2/data/parameters.json, src/core2/data/stopgaps.json, data/research/core/

**Notes.** Folded from: core-stopgap-closeness-relationship-closeness-model, core-stopgap-emotion-estimated-behavior, core-stopgap-free-block-behavior-model-gap, core-stopgap-policy-authority-missing-mechanic, core-stopgap-recalls-assumed-data, core-stopgap-renewal-opening-prehistory-estimate. Rows that are not numbers (missing mechanics in law reach, for example) stay registered; this item sources what they will read.

Oct 20 (pool feeder): research done in docs/research/pool-feeder-oct20/research-core-sourced-parameters.md (6 rows: 1 sourced, 3 estimated, 2 mechanic).
