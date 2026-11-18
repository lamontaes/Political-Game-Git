---
id: words-paper-division-one-needs-sport-and-college
title: "A Division I signing story needs a sport and a college from the student's own record"
area: people
kind: feature
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
blocked-on:
after:
lead: laws
model: opus
effort: medium
root: none
source: added on branch claude/project-thread-aqtryq (brief M, Nov 14)
checked: m3 2026-11-14
---

**What.** The owner's D1 story (Oct 29 side stories; batch 2 row 44) cannot be printed with a body: the division-one-signing row holds no sport and no college. The Words lead rules a signing without them is not printed. Seen: News, 'Dana Reyes signs to play football at a Division I school' with the college named, from the student's record.

**Cause.** Found in code: src/core2/data/school/honors.json `division-one-signing` row and `decideSchoolHonors` in src/core2/school-honors.ts (stopgaps SG-SCHOOL-honors-athletic-ability and SG-SCHOOL-honors-one-signing-day; ranking uses competitive, persistent and effort traits, no sport).

**Fix.** The school engine records a sport for a student from their own traits and the school's teams, and the college from the college step (school-college-step-record), by cause; the paper reads both. Owner of the school engine: ask the Account lead.

**Time box.** 3 hours.

**Rules.** No dice. A story says only what a reporter could know from a record the world holds; every line is the Words lead's.

**Done when.** In a drawn place with a senior class large enough, a second session reads the signing story naming the sport and the college, and the student's card agrees.

**Waits on.** Nothing.

**Files.** src/core2/school-honors.ts,src/core2/data/school/honors.json,src/core2/modules/press.ts
