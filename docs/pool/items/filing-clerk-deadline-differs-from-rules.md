---
id: filing-clerk-deadline-differs-from-rules
title: "The clerk names one filing deadline and the filing panel another"
area: elections
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** In Goulding, Florida (seed 04118aef-9767-4fc6-a50a-92327c7801b1, January 20, 2025), filing for U.S. Senator at the counter, the clerk says 'The deadline is April 24, 2026' while the filing panel's deadline rule reads June 12, 2026. The clerk's line reads the contest's filingDeadline (src/director/filing-visit.ts, deadline fact). The panel reads checkEligibility in src/core2/modules/elections.ts, where the deadline is the filing rules' own deadline for the side filed under, else the contest's. A player told two dates cannot know when they must file.

**Rules.** One rule, all 56 places: the deadline comes from the place's records, one value per contest and side. Ask why: the clerk's line cites the record the rule check reads.

**Done when.** In a drawn place, the clerk's deadline line and the filing panel's deadline rule name the same date for every open contest at the counter, shown by a test that walks every counter in the drawn place and names the place and seed.

**Files.** src/director/filing-visit.ts, src/bench/filing.ts, src/core2/modules/elections.ts

**Notes.** TODO
