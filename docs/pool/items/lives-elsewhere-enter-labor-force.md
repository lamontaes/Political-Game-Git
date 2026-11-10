---
id: lives-elsewhere-enter-labor-force
title: People living elsewhere who start out of the labor force can enter it
area: core
kind: stopgap
priority: 2
size: M
status: open
standard: 2
claimed-by:
branch:
pr:
after:
blocked-on:
lead: lives
model: sonnet
effort: medium
root: rc1-world-outside-town
milestone: M7
source: stand-in triage Nov 10; stopgap SG-LIVES-work-out-of-labor-force
---

**What.** A student, a parent at home or someone not looking who lives elsewhere stays out of the labor force until they reach retiring age, so a twenty-year-old relative never starts work. Let them enter the labor force from their age, household and partner's work, using the same enter choice the jobs engine gives the town's full and counted people.

**Cause.** Found in code: src/core2/jobs-elsewhere.ts, the monthly review's `row.status === "out"` branch (line 330) does nothing but record stopgap SG-LIVES-work-out-of-labor-force.

**Fix.** In that branch, build an enter pull by the month from the person's age, youngest child's age and partner's job loss, read from the jobs engine's enter choice in src/core2/modules/jobs.ts (call it, do not copy it); when the pull reaches one whole, set the status to looking. Check totals against CPS flows into the labor force by age as a figure to report, not a quota. Clear the register row.

**Time box.** 4 hours for one Sonnet session.

**Rules.** No dice: the pull builds from causes, never a roll. One engine per mechanic: the jobs engine's enter choice, not a new one. Sliding scales: nothing flips at an age line. Speed: monthly review only.

**Done when.** A second session, in a drawn place and seed it did not choose, runs five years of buildBenchWorld and sees relatives elsewhere who began out of the labor force take a first job by record id in the work-elsewhere table, their yearly entry share by age printed beside the CPS rate, and `npm run speed:year` within 20% of base.

**Waits on.** Nothing.

**Files.** src/core2/jobs-elsewhere.ts, src/core2/modules/jobs.ts, src/core2/jobs-elsewhere.test.ts, src/core2/data/stopgaps/lives.json
