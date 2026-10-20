---
id: world-water-violations-producer
title: "A water-system engine writes drinking-water violations from the system's own condition, so the sized water link has a cause that moves"
area: world
kind: wiring
priority: 2
size: M
status: blocked
claimed-by:
pr:
blocked-on: spec: the item text is an empty shell; a water-system condition model needs a design
source: added with npm run pool -- add
claimed-at:
---

**What.** The outcome web has a researched link from `env.drinking-water-violations` to `health.low-birthweight` (`water-violations-to-infant-health` in `src/core2/data/outcome-web/coverage.json`, Currie and others 2013; the measure starts at the national 2.5 from America's Health Rankings, drawn from EPA's Safe Drinking Water Information System), but nothing in the game writes that measure: no engine reads a water system's condition and no module produces a violation. Build one small water-system engine under `src/core2/modules/` that holds each town's system condition (age and the budget the water line spends on repairs) and writes violations from that condition, so the measure moves from a cause and the link has something to read.

**Rules.** An effect is a read, not a record (AGENTS.md): the violations the engine writes must be read by the outcome web and reach birth outcomes through the existing link, not sit in a table. No dice: a violation follows the system's condition and spending, never a monthly chance. Estimate, never UNKNOWN: the starting level is the sourced national 2.5 with a per-state spread, marked ESTIMATED with its source. One rule, all 56 places: no state or town is named in logic.

**Done when.** In a one-year run of the played world (`buildBenchWorld`, every module installed, a place drawn from all 56 with its seed named), cutting the town's water-line spending raises the system's violations, and the births module then reads the changed measure through `water-violations-to-infant-health`, shown by record id from the budget line to the violation to the measured birth outcome. A test in `src/core2/` covers it and the stopgap for the starting level is registered.

**Files.** src/core2/modules/ (a new water-system module), src/core2/data/outcome-web/coverage.json, src/core2/modules/outcome-web.ts

**Notes.** Oct 20 (claude): claimed and read, not built. The measure `env.drinking-water-violations` appears only in `coverage.json`, so the engine, its data and the registration of the measure are all new work; check `docs/research/cloud-b-outcomes-2024/water-search-draft.json` for the researched numbers before choosing parameters.
