---
id: research-school-signing-periods
title: "Research: the shares of Division I signings that fall in each signing period"
area: laws
kind: research
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: laws-effects
model: sonnet
effort: medium
root: rc8-law-judged-by-paperwork
source: stand-in triage Nov 10 (SG-SCHOOL-honors-one-signing-day)
---

**What.** Every Division I signing of a senior class is decided on one day, the first Wednesday of December. Real signings fall across the football early period, the first Wednesday of February and the other sports' November and April periods.

**Cause.** Found in code: src/core2/school-honors.ts line 279 (the marker; `honor.stopgaps` registered at line 281) and the one date in src/core2/data/school/honors.json.

**Fix.** Find, from fetched and quoted NCAA pages, each signing period's dates and the share of a year's Division I signings that fall in it, and write them as rows in src/core2/data/school/honors.json tagged SOURCED or ESTIMATED with the spread. This item changes data only; a later build reads one row per period (one decision day per row) at no extra daily cost.

**Time box.** 2 hours for one Sonnet session.

**Rules.** Research before building: real data calibrates the shares and never picks one student's outcome. Quote each page fetched.

**Done when.** A second session, in a drawn place and seed nobody chose, reads honors.json and sees one row per signing period with dates, a share, a quoted source and a spread, the shares summing to one, and the honors tests pass.

**Waits on.** Nothing.

**Files.** src/core2/data/school/honors.json, src/core2/school-honors.ts, src/core2/data/stopgaps/school.json
