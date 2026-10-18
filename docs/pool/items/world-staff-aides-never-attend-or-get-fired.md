---
id: world-staff-aides-never-attend-or-get-fired
title: "Half of an official's staff aides never come to work and are never paid or replaced: attendance is decided on traits alone because an aide has no needs"
area: world
kind: bug
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 
---

**What.** An official's aide who is a generated outside person has no money need, because the need reads living costs the aide does not have, so whether they come to work is left to their own traits. In a played world (North Lakeville, Massachusetts, seed a1) the aides of the lieutenant governor, the president and the vice president missed all 85 scheduled days and were paid nothing, and no one let them go or replaced them. The staff review now reads each aide's worked and missed days since the last look and lets one go whose share missed passes what the official puts up with, stretched or shortened by the official's own lean; the post is then refilled.

**Rules.** An effect is a read: the official reads the work engine's attendance totals when deciding. Ask why: the staffer record keeps the share missed, the days and the lean. No dice: the traits and the record decide, nothing is rolled. Replace, never layer: no second review was added.

**Done when.** `src/core2/staff-absence.test.ts` passes in a drawn place and seed (named in its failure message): an aide who never came is let go with the share missed on the record, the post is refilled, and no aide who has served 60 days has never worked.

**Files.** src/core2/modules/staff.ts, src/core2/data/campaigns/parameters.json, data/content/trait-decisions.json, src/core2/staff-absence.test.ts

**Notes.** Only aides are reviewed. Any other employer with a worker who never comes still keeps them; that is not built. A replacement drawn for a post can be absent too (the lieutenant governor's second aide was), so a post can turn over a few months running.
