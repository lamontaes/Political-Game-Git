---
id: people-drives-cause-formation-share
title: "Too few of a town's adults ever act on a cause: about one in thirty volunteers, where one in four does"
area: people
kind: bug
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The cause-activity report (people-cause-holder-activity-calibrated) shows too few of a played town's adults ever act on a cause. In Bedford, Wyoming's third year (seed 9a4dd331ace7) 3.3 percent of full adults volunteer against the CEV band of 23.2 to 30.3, 2.8 percent donate against 7.0 to 9.4, and 7.0 percent belong to a group against 23.8 to 27.1. people-drives-cause-acts-pull-less brings each actor's rate into the bands; how many adults form a cause drive and act at all is this item, split from it by the acting CTO's Oct 25 ruling.

**Rules.** No dice: who forms a drive follows their traits, money, ties, the law in force and the place's conditions, never a fixed percentage. Real rates check totals, they never pick an actor. Sliding scales and causes.

**Done when.** In the played world (buildBenchWorld), scripts/research/cause-activity-year.ts on Bedford, Wyoming (seed 9a4dd331ace7, key 5606045) and on a place drawn from all 56 (named with its seed), three played years, prints the share of full adults who volunteer, donate, contact an official and belong to a group inside or nearer the CEV bands than on main, with hours per volunteer still inside its band, and the before and after lines in the PR body.

**Files.** src/core2/modules/drives.ts, src/core2/data/drives.json

**Notes.** Split from people-drives-cause-acts-pull-less (acting CTO, Oct 25). Filed by the speed lead.
