---
id: core-speed-year-over-bar-nov-14-train
title: "Two towns' years run over the 120-second bar on the Nov 14 Train: Alamogordo NM year 1 at 231 s, and a seed t2 town's election year at 167 s"
area: core
kind: bug
priority: 1
size: M
status: open
claimed-by:
pr:
blocked-on:
after:
source: account lead thread "Give rivals more than one issue", Nov 14 (the campaign tilt's year measurement)
lead: speed
standard: 2
model: opus
effort: medium
root: none
---

**What.** On the Train head 8bb1ff9d6e, `npm run speed:year -- --seed t1 --years 1` (Alamogordo, New Mexico, key 3501780) takes 231.5 s for year 1, 676,331 records, with 66,696 law-effect rows and 58,082 doors; and seed t2's election year (year 4, through 2029-01) takes 167.2 s. Seeds t2 and t3 year 1 take 43 to 48 s. Seen: both runs, one process at a time, nothing else running.

**Cause.** Needs cause. Alamogordo carries 66,696 law-effect applied rows and 58,082 doors in one year, against 11,534 and none in seed t2 year 1; a profile of its year 1 finds which engine grows with them.

**Fix.** None until the cause is found.

**Time box.** 4 hours for an Opus session to find the cause with a profile of Alamogordo's year 1.

**Rules.** The bar is `AGENTS.md` "Speed": each year under 120 s. Measured the same with and without the campaign record tilt (231.5 s and 230.4 s), so it is not that change.

**Done when.** A second session sees, at Alamogordo, New Mexico (a place drawn from all 56; seed t1), that `npm run speed:year -- --seed t1 --years 4` in the played world runs every year under 120 seconds, and that the records proof differs from the Nov 14 Train only in the tables the fix names, by record id.

**Waits on.** nothing.

**Files.** src/core2 (a cause found by profile), scripts/speed-years/run.ts.

**Notes.** Filed Nov 14 by hand. Look for the rows: 66,696 law-effect applied rows and 58,082 doors in one year point at the first places to profile.

Nov 15 (views thread): Marshfield, Massachusetts (2538820), seed speed-press-a, `npm run speed:year -- --years 1 --exclusive` on the train at 07919bd2, before #9383: year 1 ran 121.3 s and 116.6 s, with 453,976 records (core2-law-effects-v1.applied 40,988, core2-coverage-v1.countedCoverage 32,403, news.heard 20,921). Wilton, Iowa (1986070) ran 83 s, and Gilliam, Missouri (2927028) ran 27 s.
