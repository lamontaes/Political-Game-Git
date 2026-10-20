---
id: laws-reach-b-housing-codes-land
title: "A gas-hookup ban changes new-construction cost and fuel choice; farmland protection zones parcels the builders read"
area: laws
kind: stopgap
priority: 3
size: M
status: done
claimed-by: claude/housing-codes-land
pr: #5457
blocked-on: the housing engine: land parcels with zoning and a building code that sets new-construction cost and fuel choice; neither exists
source: added with npm run pool -- add
claimed-at: 2026-10-20T03:11:56.662Z
---

**What.** SG-GOV-REACH-B-building-cost and -land-use. A gas-hookup ban and farmland protection are compliance records with no effect on construction. Give the construction engine a building code in force (all-electric adds a sourced cost per new home and sets its fuel) and land parcels with a protected use that new construction cannot take.

**Rules.** An effect is a read, not a record: another engine must read what the law writes, at the moment it decides or pays. One model, two tiers: counted households get the same rule times their count. Numbers are tagged SOURCED, ESTIMATED or TUNABLE in the parameter table.

**Done when.** In a one-year played world (`buildBenchWorld`, a drawn place from all 56, seed named in the PR body), another engine reads what the law wrote, named by record id, and the listed stopgap rows are resolved in `stopgaps.json` with a test in the file that owns the engine.

**Files.** src/core2/housing-construction.ts, src/core2/law-reach/group-b.ts, src/core2/data/stopgaps.json

Oct 20 (claude/housing-codes-land): most of this is built. `modules/housing.ts` reads the gas-hookup ban and farmland laws every month into the town's zoning (`allElectric`, `farmlandProtected`), and `housing-construction.ts` prices them into starts (all-electric cost change on single and multifamily; farmland development share), proven for a drawn place by `housing-laws.test.ts`. What is left is parcels and household fuel choice and energy bills; the two stopgap rows now say so.

**Notes.** Checked Oct 19 before building: this effect appears in none of docs/roadmap/political-process-baseline.md, the golden path, DECISION-REGISTER.md or OWNER-DECISIONS.md, and AGENTS.md ("This is a game, not a spreadsheet") makes a new mechanic of this kind a question for the owner, not a feature. OWNER QUESTION: should a gas-hookup ban change what a new home costs, and farmland protection limit where builders may build, or stay compliance records? Until he rules, leave this item unbuilt.

**Original notes.** Split from laws-stopgap-reach-group-b-missing-engine on Oct 19; the stopgap rows named above are its 13.
