---
id: tests-campaign-platform-played-calibration-is-slow
title: "campaign-platform-played's pooled calibration case plays a whole year and takes minutes"
area: core
kind: bug
priority: 3
size: M
status: open
claimed-by:
pr:
blocked-on:
after:
source: account lead thread "Give rivals more than one issue", Nov 14 (coordinator ruling on PR #9231)
lead: governing
standard: 2
model: sonnet
effort: medium
root: none
---

**What.** The pooled calibration case in src/core2/campaign-platform-played.test.ts plays 365 days at Prairiewood Village SD and checks every platform read by record, the contested-race proof, the 40-candidate minimum and that the rule's platforms agree with the town more than the strongest views do. It takes about three minutes, so people will skip it and it will rot. Guards: every platform of a played year being the rule's choice.

**Cause.** Measured: one year at a pinned place takes about 2m40s in buildBenchWorld (Leeds Point NJ on PR #9231's branch, run seed pinned in the test); the cost is the whole year's days, not the checks, which read tables once at the end.

**Fix.** Make the year cheaper without weakening a check: read the same tables from a world whose days are advanced only while a campaign is live (the election-calendar window), or run the year once and share its reads with the other cases that need them. Keep the 40-candidate minimum, the contested-race proof and the agreement check unchanged.

**Time box.** 3 hours for a Sonnet session.

**Rules.** Never loosen a test: no check is dropped or relaxed to get under the time. No dice: the world is the pinned place and seed.

**Done when.** A second session runs the case at the named place and seed, sees the same six printed lines of totals and every assertion pass, in under about two minutes.

**Waits on.** Nothing.

**Files.** src/core2/campaign-platform-played.test.ts

**Notes.** Filed Nov 14 from PR #9231. The case was pinned to Prairiewood Village alone, with its checks unchanged, when the running-mate case moved to its own short case at Leeds Point.
