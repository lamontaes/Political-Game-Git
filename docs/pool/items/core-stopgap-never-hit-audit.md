---
id: core-stopgap-never-hit-audit
title: "Open stopgap rows whose marker never fired in three drawn towns over two played years are checked for staleness"
area: core
kind: cleanup
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Of 264 open rows in src/core2/data/stopgaps.json, a run of three drawn towns for two played years each (buildBenchWorld, core.stopgapHits) recorded 132 as hit. Eighty rows whose marker is in a .ts file never fired, among them SG-GOV-budget-adopted-by-rule (the council always voted), SG-GOV-campaign-pollster-seller, SG-GOV-staff-unpaid, SG-WORLD-housing-landlord, SG-WORLD-jobs-opening-seekers and SG-GOV-justice-prosecutor-stand-in. Rows marked with the module-level `stopgap()` call (not `api.stopgap`) are never recorded, so some of the eighty fire and are not seen. For each, check whether the fake is still reachable; resolve the row where it is not and the replacement is built.

**Rules.** Placeholders: a row is never closed by deleting it alone; it closes only because the replacement is built and shown. Replace, never layer: delete the dead fallback in the same change. One rule, all 56 places: the check runs in drawn places, not named ones.

**Done when.** In a one-year played world (buildBenchWorld, a drawn place from all 56, seed named) each audited row is shown hit or unreachable by test, and every unreachable row's fake and marker are deleted and the row resolved in stopgaps.json, proven by the tripwire tests in src/core2/tooling/tripwires.test.ts.

**Files.** src/core2/data/stopgaps.json, src/core2/stopgaps.ts

**Notes.** Measured Oct 20 (claude). The list comes from reading core.stopgapHits after 730 days in three drawn places; to rerun it, advance a bench world two years and read the set. Making `stopgap()` record into the core as `api.stopgap` does would remove the blind spot first.
