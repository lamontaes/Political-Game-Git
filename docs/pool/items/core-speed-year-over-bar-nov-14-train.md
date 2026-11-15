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

**Cause.** Measured: Alamogordo, New Mexico (3501780), `node --import tsx scripts/speed-years/profile-year.ts --seed t1 --year 1` on the train at df168042e6, a CPU profile of year 1. The largest single part is not the law-effect rows or the doors. It is one chain in the monthly work review: `loseAwayWorkByTurnover` (src/core2/modules/jobs.ts) takes a share of out-of-town work off every counted household that has any, each call goes through `loseAwayWork` and `shedUnplacedWorkers` to `regroupHousehold` (src/core2/modules/residents.ts), and every regroup called `peopleInGroup` (src/core2/counted-money.ts), which walks every household of the household's group to count its people. That count is only used when the household moves to another group, and a lost share of work rarely moves it. The chain was 68.6 of the 370 sampled seconds, 18.5 percent of the year: `peopleInGroup` alone 43.0 seconds, `regroupHousehold` itself 18.8. The other large parts of the same profile: the campaigns' daily work 37 seconds (10 percent), the press's day 36 (9.7), the counted news groups 24 (6.4), the candidacy day 23 (6.3), the garbage collector 27 (7.4), the residents' day 18, the coverage day 16, the voting calendar 14.

**Fix.** First cut, built in #9520: `regroupHousehold` reads the old group's people only when the household's new key is another group. Exact: the records proof is identical. It takes about 50 seconds off this year here and leaves it over the bar, so this item stays open. Next, from a profile of the cut version: what is left of `regroupHousehold`, then the campaigns' day, the press's day and the counted news groups, each as its own cut with the records proof.

**Time box.** 4 hours for an Opus session to find the cause with a profile of Alamogordo's year 1.

**Rules.** The bar is `AGENTS.md` "Speed": each year under 120 s. Measured the same with and without the campaign record tilt (231.5 s and 230.4 s), so it is not that change.

**Done when.** A second session sees, at Alamogordo, New Mexico (a place drawn from all 56; seed t1), that `npm run speed:year -- --seed t1 --years 4` in the played world runs every year under 120 seconds, and that the records proof differs from the Nov 14 Train only in the tables the fix names, by record id.

**Waits on.** nothing.

**Files.** src/core2 (a cause found by profile), scripts/speed-years/run.ts.

**Notes.** Filed Nov 14 by hand. Look for the rows: 66,696 law-effect applied rows and 58,082 doors in one year point at the first places to profile.

Nov 15 (views thread): Marshfield, Massachusetts (2538820), seed speed-press-a, `npm run speed:year -- --years 1 --exclusive` on the train at 07919bd2, before #9383: year 1 ran 121.3 s and 116.6 s, with 453,976 records (core2-law-effects-v1.applied 40,988, core2-coverage-v1.countedCoverage 32,403, news.heard 20,921). Wilton, Iowa (1986070) ran 83 s, and Gilliam, Missouri (2927028) ran 27 s.

**Notes (Fable B, Nov 15, train at df168042e6).** Timed on one 4-core cloud container, one process at a time, nothing else running, `npm run speed:year -- --seed t1 --years 1 --exclusive --proof-out <file>`, in the order base, cut, cut, base: 330.9 s, 280.4 s, 279.7 s, 364.3 s. All four keep 664,291 records and their records proofs are identical (digest 53b99fbf5ff51673, 612 tables). This container is slower than the one in What (231.5 s there), so read the cut as about 15 percent of the year against the faster base, not as seconds on another machine. Not measured: years 2 to 4, and any other place. A profile of the cut version (281 sampled seconds): the monthly work review is 13.1 seconds where it was 80.4. What is left, largest first: the campaigns' daily work 33.6 s, the press's day 32.6 s (the counted news groups 22.3 s of it), the garbage collector 25.2 s, the candidacy day 23.4 s, the coverage day 16.5 s, the residents' day 15.7 s, views 13.3 s, the voting calendar 12.3 s. A lead for the next cut, read and not built: `CountedStore.regroup` (src/core2/counted-groups.ts) marks the group changed and moves the household to the end of the group's order even when the household stays in its group, so `countedNewsGroups` (src/core2/counted-news-views.ts, 22.3 s) rebuilds every group after each monthly work review. Skipping that for a household that stays is not exact as it stands: the sums in a group are added in the group's order, and the order would no longer move. It needs the records proof and a second reader.
