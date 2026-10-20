---
id: gov-staffing-sized-against-prior-line
title: "A raise to a staffed budget line can fund fewer positions than the department already has: staffing is sized against the line's Census base, not the line before the change"
area: gov
kind: bug
priority: 3
size: M
status: in-pr
claimed-by: claude/staffing-prior-line
pr: #5628
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T08:28:53.046Z
---

**What.** group-a-staffing.ts sets positions = baseStaff times (adopted line / baseLine). In Berryville, Virginia (seed 82848b09ce02d78dbbb96d3254e21ee1e13370927be3178b95cdf7a36aaf5607) the schools line was raised by a third over last year's line yet funded 43 positions against 44 teachers, because last year's line sat below the Census base. Size the change against the line before it, so a raise never funds fewer positions than the staff in place and a cut never funds more.

**Rules.** No dice; Sliding scales and causes; One rule all 56 places; Replace never layer

**Done when.** In a drawn place and seed a raise to a staffed line funds more positions than the staff in place and a cut funds fewer, with the department and record ids named.

**Files.** src/core2/law-reach/group-a-staffing.ts, src/core2/law-reach/group-a-money.ts

**Notes.** TODO
