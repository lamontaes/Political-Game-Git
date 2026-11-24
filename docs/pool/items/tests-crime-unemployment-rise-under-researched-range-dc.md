---
id: tests-crime-unemployment-rise-under-researched-range-dc
title: "In Washington, D.C., a three-point jobless rise moves burglary less than the researched size, and the crime test is red at its seed"
area: world
kind: bug
priority: 3
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
source: "Interviews thread gate of #9649, Nov 16, 2026; red at the same seed on clean Train a62a2fda"
root: none
---

**What.** `src/core2/modules/crime.test.ts`, "moves burglary, robbery and assault by the researched size when unemployment rises", is red at Washington, D.C. (US-DC), seed 22d32a580b489226. The test finds a rise of 0.0382 where the researched range (2 to 5 percent a point, three points, less a tenth) needs at least 0.054. The same seed is red on the clean Train a62a2fda, so no pull request in flight caused it. Seen: a jobless rise in the capital moves its burglary records about a third less than the research says.

**Cause.** Measured: Washington, D.C., seed 22d32a580b489226 (`CRIME_SEED=22d32a580b489226 npx vitest run src/core2/modules/crime.test.ts`) on Train a62a2fda: `rise = (1 + web.effects[key]) / (1 + was.effects[key]) - 1` is 0.0382 for the first type the loop checks (the unemployment-to-burglary link). Not yet traced is whether the outcome web's unemployment link in D.C. moves less than three points of unemployment (the shift does not take in full), or the link's effect is shared with another link.

**Fix.** Trace the shifted world's unemployment in the web's month row against the control's at this seed. If the shift does not take three points in D.C., the test reads the realized rise, not the asked one. If it does, the web's link is under its researched size there and the link is fixed. Either way the test keeps the researched range.

**Time box.** 2 hours.

**Rules.** No dice: the web's links move expected counts by researched sizes; a test never loosens a researched range to get green.

**Done when.** The cause is named by file and line, and the test is green at Washington, D.C. (seed 22d32a580b489226) with the researched range kept. A second session plays a drawn place for a year on main, raises its unemployment in dev mode, and sees its burglary records move by the researched size, naming the place and seed.

**Waits on.** Nothing.

**Files.** src/core2/modules/crime.test.ts, src/core2/modules/crime.ts, src/core2/outcome-web-model.ts
