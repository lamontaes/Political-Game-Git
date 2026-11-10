---
id: health-web-factor-mismatch-red-by-draw
title: "health-web test red on main by draw: a full person's death factor misses the web's by 0.0003 (Bayside, Wisconsin, seed e278a4ff7b6b5d53)"
area: people
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: laws
model: sonnet
effort: medium
root: none
source: added with npm run pool -- add
---

**What.** The health-web test is red on main by draw. src/core2/health-web.test.ts ('moves full people's hazards and counted deaths by age and income') failed on clean main (1f6096efa1, Oct 29 01:50 UTC) with HEALTH_WEB_SEED=e278a4ff7b6b5d53, Bayside, Wisconsin: 'expected 0.9091826820185239 to be close to 0.9088579189485213'. A full person's booked death factor differs from the factor the test computes from the shifted web month by 0.000325. Other seeds pass. Found by the laws session while gating the mortality family.

**Cause.** Needs cause. Measured: HEALTH_WEB_SEED=e278a4ff7b6b5d53 (Bayside, Wisconsin) fails src/core2/health-web.test.ts with 0.9091826820185239 against 0.9088579189485213. Not yet looked at: either the engine booked a factor from another month, age or income fifth than the test reads (src/core2/health-web.ts, src/core2/modules/health.ts), or the test reads the wrong one.

**Fix.** None until the cause is found.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** The chain is the acceptance: the factor a person's hazard carries is the web month's factor for their own age and income fifth on the day the engine looked, by record id. One rule, all 56 places: the test keeps drawing its place and names the place and seed.

**Done when.** A second session, not the builder, runs src/core2/health-web.test.ts with HEALTH_WEB_SEED=e278a4ff7b6b5d53 (Bayside, Wisconsin) and three further random seeds, each place and seed named, and all pass. The PR body names the person, the month, the age and the income fifth the engine booked against the test's, which side was wrong, and the file and line.

**Waits on.** Nothing.

**Files.** src/core2/health-web.ts, src/core2/health-web.test.ts, src/core2/modules/health.ts

**Notes.** TODO
