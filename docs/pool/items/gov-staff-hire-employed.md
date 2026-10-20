---
id: gov-staff-hire-employed
title: "An official's aide can be hired from among people who work for less, not only the jobless"
area: gov
kind: stopgap
priority: 3
size: S
status: in-pr
claimed-by: claude/gov-staff-hire-employed
pr: #5355
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T00:54:06.270Z
---

**What.** An official's aide could already come from a full person who earns less than the post pays (and taking the post ends their job), but the town's counted residents were candidates only when they had no work at all. A counted resident earning less than the post's hourly pay is now a candidate too. At hire they are filled in from their records and the public job replaces theirs, as for any full person.

**Rules.** One model, two tiers: a counted resident faces the same rule as a full person, anyone the post pays more than they earn. Wire to the world: the pay read is the hourly pay on the counted household's own work commitment.

**Done when.** The test in src/core2/staff-counted-employed.test.ts, in a place drawn from all 56 on a seed nobody chose, shows a counted resident earning less than the post is a candidate and none earning the post's pay or more is.

**Files.** src/core2/electorate.ts, src/core2/modules/staff.ts, src/core2/staff-counted-employed.test.ts

**Notes.** Found Oct 19 reading staffCandidates; the full-person half is src/core2/staff-hire-employed.test.ts. Not run: a played year in which a counted employed aide is actually hired.
