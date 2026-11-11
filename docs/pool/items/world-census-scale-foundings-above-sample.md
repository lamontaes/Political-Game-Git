---
id: world-census-scale-foundings-above-sample
title: "Washington, D.C. at its Census size founds 6 businesses in a year against 1 at the sample size"
area: world
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
blocked-on:
after: world-census-scale-closures-large-cities
lead: jobs
model: opus
effort: medium
root: design-one-model-two-tiers
source: added with npm run pool -- add
checked: fable 2026-11-10
---

**What.** Washington, D.C. (1150000, seed dc-closures-a) opened at 69 times its sample founds six businesses in a year (inns, construction, a restaurant, retail, information), while the same city at the sample size founds one inn. None of the six closes, after the change for world-census-scale-closures-large-cities stopped filled-in households and full owners keeping money that stood for many households. The suspicion is that some founding reason reads a weighted figure against an unweighted one: the growers' cash against a cushion from the book payroll, a counted candidate's cash and savings against the startup cost, or the prospect against the median pay. Find which one and weight it. Per the Nov 8 ruling that ranges are not targets, a gap between the two sizes is fixed only if nothing in the world explains it. Seen: the business list of a large city such as Washington, D.C., which opens six businesses in a year where the sample town opens one.

**Cause.** Needs cause. Looked at: Washington, D.C. (place 1150000, seed dc-closures-a) at its Census size founds six businesses in a year against one at the sample size (this item's own measurement). Which founding reason reads a weighted figure against an unweighted one is the suspicion; the founding code is the foundings and found functions in src/core2/modules/business.ts.

**Fix.** None until the cause is found.

**Time box.** 5 hours for one session of the Opus model. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One model, two tiers: every founding reason reads its money and the book at the same weight. No dice: a business is founded from its founder's reasons and the market's room, never a monthly chance. Ask why: each founding names its reasons by record id.

**Done when.** A second session (not the builder) plays Washington, D.C. at its Census size (seed dc-closures-a) and one more drawn place above 100,000 (seeds named), lists a year's foundings in `buildBenchWorld` by founding record id, and sees each Census-size founding explained by a recorded reason, or the year's count match the same town's count at the sample size plus its spread; a test in src/core2 beside census-scale-closures-large-cities.test.ts shows it. On screen: nothing yet; it would show on Politics, Campaigns and the election night results, and nothing there reads it.

**Waits on.** Nothing. world-census-scale-closures-large-cities is done.

**Files.** src/core2/modules/business.ts, src/core2/census-scale-closures-large-cities.test.ts

**Notes.** TODO

**Notes (Fable's check, Nov 10).** How to find the cause: in the Washington, D.C. replay at Census size and at sample size, print each founding's reasons from `foundings` and `found` in src/core2/modules/business.ts and see which term differs between the two sizes (growers' cash, a counted candidate's cash against the startup cost, or the prospect against median pay). The fix then weights that one term, so the count of foundings follows the town's real size and not the sample's.
