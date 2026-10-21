---
id: world-school-income-same-tiers
title: "School income fifth stays the same when a household is filled in"
area: world
kind: bug
priority: 1
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The school reader uses job wages for full students but wages, retirement and unplaced pay for counted students. A generated Del Carmen student changes income fifth on fill-in while a recorded pay flow remains live. Use the same household-income basis in both tiers.

**Rules.** One model, two tiers: fill-in preserves recorded facts. An effect is a read, not a record: school reads all recorded household income sources. Use the existing money readers rather than adding a separate income model.

**Done when.** A one-year buildBenchWorld run in a drawn place names its seed, student, household and income-source IDs. A positive non-job income regression in school-outcomes.test.ts preserves the income fifth and web context across fill-in. The changed-file school checks pass.

**Files.** src/core2/school-outcomes.ts, src/core2/school-outcomes.test.ts, src/core2/modules/residents.ts

**Notes.** TODO
