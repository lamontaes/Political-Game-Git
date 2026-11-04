---
id: core-memory-circle-member-log-window
title: "A big town runs out of memory in year four: a met-once contact's routine log is kept a year"
area: core
kind: bug
priority: 1
size: S
status: done
claimed-by: lane-5/circle-log-window
pr: #7198
blocked-on:
lead: speed
source: added with npm run pool -- add
claimed-at: 2026-11-04T06:49:42.893Z
---

**What.** At the desktop app's real heap limit (4,096 MiB), Arcadia, California (0602462, seed app-heap-1) runs out of memory in its fourth year on main 44f14801eb. The durable log is the largest table: 417 MB of JSON after year 3, nearly all routine rows of circle members who are not the player. The circle grows from 18 to 232 people in the election year, 201 of them level-0 contacts, and each keeps a year of rests, visits, retold speeches and drive changes, because circleActRetentionMonths is 12.

**Rules.** Keep it simple: save why reasons only for the player and the people they deal with, so routine detail of people met once goes early. Speed: memory stays flat, never keep a whole history play no longer reads. Estimate, never UNKNOWN: the window stays a TUNABLE parameter row inside its declared spread.

**Done when.** speed-years/run.ts --years 4 at --max-old-space-size=4096 plays all four years of Arcadia, California (0602462, seed app-heap-1) in the played world without running out of memory, with heap per year named in the PR body against main's run, or names the next table in the way by size; the condense-decisions test passes.

**Files.** src/core2/data/parameters.json,src/core2/decision-detail.ts

**Notes.** lead: speed. Measured Nov 4 by Lane 5 (docs/lanes/state/lane-5.md, unit 7 card).
