---
id: people-drives-cause-formation-share
title: "Too few of a town's adults ever act on a cause: about one in thirty volunteers, where one in four does"
area: people
kind: bug
priority: 3
size: M
status: dropped
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
after:
standard: 2
model: opus
effort: high
root: none
lead: lives
checked: fable 2026-11-10
---

**What.** The cause-activity report shows too few of a played town's adults ever act on a cause. In Bedford, Wyoming's third year (seed 9a4dd331ace7) 3.3 percent of full adults volunteer against the Civic Engagement and Volunteering survey figure of 23.2 to 30.3, 2.8 percent donate against 7.0 to 9.4, and 7.0 percent belong to a group against 23.8 to 27.1. How many adults form a cause drive and act at all is this item, split from people-drives-cause-acts-pull-less by the acting CTO's Oct 25 ruling.

**Cause.** Measured: scripts/research/cause-activity-year.ts, Bedford, Wyoming (key 5606045, seed 9a4dd331ace7), third year: 3.3 percent volunteer, 2.8 percent donate and 7.0 percent belong to a group.

**Fix.** Change what makes a full adult form a cause drive (traits, money, ties, the law in force and the place's conditions) in src/core2/modules/drives.ts so more adults form one, never a fixed share.

**Time box.** 8 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No dice: who forms a drive follows their traits, money, ties, the law in force and the place's conditions, never a fixed percentage. Real rates check totals; they never pick an actor. Sliding scales and causes: nothing flips at a threshold.

**Done when.** A second session runs scripts/research/cause-activity-year.ts on Bedford, Wyoming (seed 9a4dd331ace7, key 5606045) and on a place drawn from all 56 (named with its seed), three played years in the played world (buildBenchWorld), and sees more full adults volunteer, donate, contact an official and belong to a group than on main, each through a recorded cause drive. The before and after lines sit in the PR body beside the survey figures, which are reported, not pass marks; hours per volunteer are reported too.

**Waits on.** Nothing.

**Files.** src/core2/modules/drives.ts, src/core2/data/drives.json, scripts/research/cause-activity-year.ts

**Notes.** Split from people-drives-cause-acts-pull-less (acting CTO, Oct 25). Filed by the speed lead.

Deferred Oct 25: nothing on screen reads it yet.

Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). It would have raised the share of adults who volunteer, donate or join a group to survey levels; the item says nothing on screen reads it.
