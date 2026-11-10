---
id: core-group-quarters-institution-records
title: "Prisons, juvenile facilities and bases exist as records in town, and juvenile residents are schooled by their facility"
area: core
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr:
after:
blocked-on:
lead: money
source: stand-in triage Nov 10, 2026; stopgaps SG-GQ-institution-owner, SG-GQ-juvenile-school
standard: 2
model: sonnet
effort: medium
root: design-one-model-two-tiers
---

**What.** Only college and nursing-home rooms name the institution that houses them. A prison's, juvenile facility's, base's and other institution's rooms name none, so nothing can bill, pay or count them. Juvenile-facility residents aged 5 to 17 are also counted as the town's public-school students. Give each institution a record in the town and name it on its rooms, and take juvenile residents out of the public schools' counts.

**Cause.** Found in code: src/core2/modules/housing.ts line 493 (stopgap("SG-GQ-institution-owner"), the owner map lists only college and nursing) and src/core2/school-outcomes.ts line 285 (SG-GQ-juvenile-school, groupKeyOf counts every counted kid).

**Fix.** Add organization records for adult correctional, juvenile, military and other institutions where the place's Census row (data/research/group-quarters/census-2020-group-quarters.json) has residents, built when the town opens through the same path the nursing-home employer uses (src/core2/town-workplaces.ts), and name each on its rooms in housing.ts. In school-outcomes.ts and opening-public-schools.ts skip rooms whose quarters type is juvenile. Delete both markers and resolve the two rows in src/core2/data/stopgaps/gq.json. Cost stays small: records are built once at open, and the school skip is a type test.

**Time box.** 4 hours for a Sonnet session.

**Rules.** One model, two tiers: a counted room is read with the same rule as a full person, times its weight. One rule, all 56 places: an institution exists where the Census row says residents live, never by place name. Wire to the world: the record must be read by another engine, here the schools and the housing rooms.

**Done when.** A second session, in a played world at a drawn place with a prison or juvenile facility and another with a base (places and seeds named), sees each such room name its institution record by id and sees the town's public-school counts exclude juvenile-facility residents, with the counts before and after printed.

**Waits on.** Nothing.

**Files.** src/core2/modules/housing.ts, src/core2/school-outcomes.ts, src/core2/opening-public-schools.ts, src/core2/town-workplaces.ts, src/core2/data/stopgaps/gq.json
