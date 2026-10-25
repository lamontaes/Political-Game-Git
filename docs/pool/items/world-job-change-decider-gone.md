---
id: world-job-change-decider-gone
title: "Job changes name a decider who is no longer a record by the year's end"
area: world
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The M1-04 check (src/core2/tooling/m1-04-check.ts) in Niceville, Florida (1248750, seed 118d0e8a347d62a772645a1341bcffcd88ba3e3e064306cc90a3bacbb8590f7a) found 27 of 1,376 job changes whose decidedBy is a person id that is no record in the world at the end of the played year, for example job-change:2025-02-01:work-relationship_39a13a4e5498061a:quit, decided by person_188e6733d544544d. The sampled ones are all dated 2025-02-01, mostly left-work and quit changes in the first month. Either the person was removed (moved away or a counted record replaced) while history still names them, or the jobs engine names an id that never existed.

**Rules.** Ask why: every job change names who decided it, and that decider stays findable by record id (a person, an organization, an event or a counted member) for as long as the change is kept. Wire to the world: fix the writer or the removal, never the check.

**Done when.** In Niceville, Florida with the seed above and in two places drawn from all 56, named with seeds, the M1-04 check reports changesDecidedByNoRecord 0 after a played year in buildBenchWorld; the PR names the cause by file and line; a test that removes the decider the old way fails.

**Files.** src/core2/modules/jobs.ts, src/core2/state.ts

**Notes.** TODO
