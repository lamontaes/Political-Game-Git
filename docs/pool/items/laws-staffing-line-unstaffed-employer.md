---
id: laws-staffing-line-unstaffed-employer
title: "A raised public-safety line funds paid positions at an employer with no paid staff"
area: laws
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The staffing reach (src/core2/law-reach/group-a-staffing.ts) funds an employer for its opening staff times the line against its base. A fire department with no paid staff, such as a volunteer company in a small town, is therefore funded for zero positions however much its line rises. The raise moves money and reaches nobody: seen in drawn places such as White Meadow Lake, New Jersey and Henderson, Louisiana (budget-line-staffing.test.ts, Oct 24).

**Rules.** An effect is a read, not a record: the employer the line funds posts openings that the jobs engine fills, and each hire is recorded through lawApplied. Sliding scales and causes: positions follow the money (the line's change over the cost of a position, publicPositionAnnualMinor) where the opening staff gives no base. One model, two tiers: named and counted seekers are hired by the same rule.

**Done when.** In a played world (buildBenchWorld) in a drawn place whose fire or police employer has no paid staff, raising the line by at least one position's cost posts an opening the jobs engine fills, recorded by lawApplied with the hire's record id, and putting the line back lays that hire off; the test names the place and seed.

**Files.** src/core2/law-reach/group-a-staffing.ts, src/core2/budget-line-staffing.test.ts

**Notes.** Found Oct 24 by the laws lead while moving the staffing lines' hires onto the jobs engine (PR #5582, branch claude/law-wiring-government).
