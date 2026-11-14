---
id: world-opening-police-months-from-the-crime-engine
title: "A town opens with years of police months behind it, so its usual month is real from day one"
area: world
kind: wiring
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
blocked-on:
after:
lead: skills
model: opus
effort: medium
root: none
source: coordinator ruling Nov 14 21:12Z on #9287; second words reader
checked: m3 2026-11-14
---

**What.** A new game starts on a date with no police months behind the town (the first closed month is the second month of play), so the paper cannot say a month was busy against the town's usual until six months in; a real town has years of police months behind it. The paper's police log therefore says only the count for a town's first half year. Seen: News in the first half year of a new life: the police log says only the count, with no comparison, until the sixth closed month.

**Cause.** Found in code: the crime engine writes a `months` row only as play closes each month (`CRIME_MODULE_ID`, table `months`), and `usualMonth` in src/core2/modules/press.ts reads at most the last `usualMonths` closed rows and needs `briefUsualMinMonths` of them before the words may compare a month with the town's usual; the opening warm-up does not write earlier months.

**Fix.** Opening stock for the crime engine's months, written through the shared opening warm-up (the skills thread's opening list) from the town's own crime rates, estimated and marked as such, so a town opens with the closed months a usual needs. No new generator in the press.

**Time box.** 3 hours.

**Rules.** No dice; the opening months are calibrated to the place's rates and spread, never picked; applies to all 56 places.

**Done when.** In the running game, in a place and seed the builder did not choose, a second session opens News in the first month of a new life and reads a police log that compares a busy month with the town's usual, and the closed months the usual rests on are named by record id.

**Waits on.** The shared opening warm-up (skills thread).

**Files.** src/core2/modules/press.ts,src/core2/modules/crime.ts
